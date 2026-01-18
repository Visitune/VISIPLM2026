
import React, { useState } from 'react';
import { Ingredient, Allergen, NutrientProfile, LabelTag, AttachedDocument, Supplier, Recipe, Project } from '../types';
import { guessIngredientData, parseTechnicalSheet } from '../services/geminiService';
import { formatCurrency } from '../services/calculationService';
import { compressImage } from '../services/imageService';
import * as XLSX from 'xlsx';

interface IngredientManagerProps {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  recipes?: Recipe[]; 
  projects?: Project[];
  onAddIngredient: (ing: Ingredient) => void;
  onUpdateIngredient: (ing: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
}

const emptyNutrients: NutrientProfile = {
  energyKcal: 0, protein: 0, fat: 0, saturatedFat: 0, carbohydrates: 0, sugars: 0, fiber: 0, salt: 0
};

export const IngredientManager: React.FC<IngredientManagerProps> = ({ ingredients, suppliers, recipes = [], projects = [], onAddIngredient, onUpdateIngredient, onDeleteIngredient }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [rawTextImport, setRawTextImport] = useState("");
  const [editTab, setEditTab] = useState<'general' | 'nutri' | 'tech' | 'docs'>('general');
  const [viewTab, setViewTab] = useState<'list' | 'import'>('list');

  const [currentIng, setCurrentIng] = useState<Ingredient>({
    id: '',
    name: '',
    supplierId: '',
    costPerKg: 0,
    nutrients: { ...emptyNutrients },
    allergens: [],
    traces: [],
    labels: [],
    physico: {},
    fruitVegetablePercent: 0,
    isLiquid: false,
    documents: [],
    images: [],
    carbonFootprint: 0
  });

  const handleDeleteWithImpactCheck = (id: string) => {
      // Impact logic unchanged
      const impactedRecipes = recipes.filter(r => r.items.some(item => item.ingredientId === id));
      const activeProjectsImpacted = projects.filter(p => {
          const isActive = !['Launched', 'Cancelled'].includes(p.status);
          const usesImpactedRecipe = p.linkedRecipeIds.some(rid => impactedRecipes.some(r => r.id === rid));
          return isActive && usesImpactedRecipe;
      });

      if (activeProjectsImpacted.length > 0) {
          const projectNames = activeProjectsImpacted.map(p => `• ${p.name} (${p.status})`).join('\n');
          alert(`⚠️ IMPOSSIBLE DE SUPPRIMER !\n\nCet ingrédient est critique pour ${activeProjectsImpacted.length} projet(s) en cours :\n${projectNames}\n\nVeuillez d'abord modifier les recettes de ces projets.`);
          return;
      }

      if (impactedRecipes.length > 0) {
          if (!window.confirm(`⚠️ ATTENTION : Cet ingrédient est utilisé dans ${impactedRecipes.length} recette(s).\nLa suppression entraînera des erreurs de calcul dans ces recettes.\n\nContinuer malgré tout ?`)) {
              return;
          }
      } else {
          if (!window.confirm("Supprimer cet ingrédient ?")) return;
      }

      onDeleteIngredient(id);
  };

  // Import Fichier Excel/CSV unchanged
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      // ... (Code identique à la version précédente) ...
      // Pour alléger la réponse, je reprends la logique existante sans la dupliquer inutilement ici
      // car le changement principal est sur handleImageUpload
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          try {
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
              if (jsonData.length === 0) { alert("Fichier vide ou illisible."); return; }
              
              let importedCount = 0;
              const headers = Object.keys(jsonData[0]);
              const findCol = (exactName: string, fallbacks: string[]) => {
                  if (headers.includes(exactName)) return exactName;
                  return headers.find(h => fallbacks.some(f => h.toLowerCase().includes(f.toLowerCase())));
              };
              const keyName = findCol("alim_nom_fr", ["alim_nom_fr", "nom_fr", "Libellé"]);
              const keyEnergy = findCol("Energie, Règlement UE N° 1169/2011 (kcal/100 g)", ["Energie, Règlement UE", "kcal/100 g"]);
              const keyProtein = findCol("Protéines, N x 6.25 (g/100 g)", ["Protéines, N x 6.25", "Protéines"]);
              const keyCarb = findCol("Glucides (g/100 g)", ["Glucides (g/100 g)", "Glucides"]);
              const keySugar = findCol("Sucres (g/100 g)", ["Sucres (g/100 g)", "Sucres"]);
              const keyFat = findCol("Lipides (g/100 g)", ["Lipides (g/100 g)", "Lipides"]);
              const keySatFat = findCol("AG saturés (g/100 g)", ["AG saturés", "saturés"]);
              const keyFiber = findCol("Fibres alimentaires (g/100 g)", ["Fibres alimentaires", "Fibres"]);
              const keySalt = findCol("Sel chlorure de sodium (g/100 g)", ["Sel chlorure de sodium", "Sel (g/100 g)"]);
              const keyCo2 = findCol("Total", ["Score unique EF", "Changement climatique"]); 

              jsonData.forEach((row: any) => {
                  if (!keyName || !row[keyName]) return; 
                  const parseVal = (val: any): number => {
                      if (typeof val === 'number') return val;
                      if (!val) return 0;
                      const str = String(val).toLowerCase().trim();
                      if (str.includes('<') || str.includes('trace')) return 0;
                      return parseFloat(str.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                  };
                  const newIng: Ingredient = {
                      id: Date.now().toString() + Math.random().toString().slice(2,6),
                      name: String(row[keyName]).trim(),
                      costPerKg: 0, 
                      nutrients: {
                          energyKcal: parseVal(row[keyEnergy]),
                          protein: parseVal(row[keyProtein]),
                          fat: parseVal(row[keyFat]),
                          saturatedFat: parseVal(row[keySatFat]),
                          carbohydrates: parseVal(row[keyCarb]),
                          sugars: parseVal(row[keySugar]),
                          fiber: parseVal(row[keyFiber]),
                          salt: parseVal(row[keySalt])
                      },
                      allergens: [], traces: [], labels: [], physico: {},
                      fruitVegetablePercent: 0, isLiquid: false, documents: [], images: [],
                      carbonFootprint: parseVal(row[keyCo2])
                  };
                  onAddIngredient(newIng);
                  importedCount++;
              });
              if (importedCount > 0) { alert(`${importedCount} ingrédients importés !`); setViewTab('list'); }
              else { alert("Aucun ingrédient importé. Vérifiez le format."); }
          } catch (err) { console.error(err); alert("Erreur fichier."); }
      };
      reader.readAsArrayBuffer(file);
  };

  const handleEdit = (ing: Ingredient) => {
    setCurrentIng({ ...ing, images: ing.images || [], traces: ing.traces || [] });
    setEditTab('general');
    setIsEditing(true);
  };

  const handleNew = () => {
    setCurrentIng({
      id: Date.now().toString(),
      name: '',
      supplierId: '',
      costPerKg: 0,
      nutrients: { ...emptyNutrients },
      allergens: [], traces: [], labels: [], physico: {}, fruitVegetablePercent: 0,
      isLiquid: false, documents: [], images: [], carbonFootprint: 0
    });
    setEditTab('general');
    setIsEditing(true);
  };

  // UPDATE: WITH COMPRESSION
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files) as File[];
          for (const file of files) {
              try {
                  const compressed = await compressImage(file);
                  setCurrentIng(prev => ({
                      ...prev,
                      images: [...(prev.images || []), compressed]
                  }));
              } catch (error) {
                  console.error("Erreur compression", error);
                  alert("Impossible de traiter l'image.");
              }
          }
      }
  };

  const removeImage = (index: number) => {
      const newImages = [...(currentIng.images || [])];
      newImages.splice(index, 1);
      setCurrentIng({...currentIng, images: newImages});
  };

  const handleSave = () => {
    if (!currentIng.name) return;
    const exists = ingredients.find(i => i.id === currentIng.id);
    if (exists) { onUpdateIngredient(currentIng); } else { onAddIngredient(currentIng); }
    setIsEditing(false);
  };

  const handleAIFill = async () => {
    if (!currentIng.name) return;
    setLoadingAI(true);
    const data = await guessIngredientData(currentIng.name);
    if (data) { applyData(data); } else { alert("Erreur IA (Clé API?)"); }
    setLoadingAI(false);
  };

  const handleSmartImport = async () => {
      if(!rawTextImport) return;
      setLoadingAI(true);
      const data = await parseTechnicalSheet(rawTextImport);
      if(data) { handleNew(); applyData(data); setShowSmartImport(false); setRawTextImport(""); } 
      else { alert("Erreur analyse IA."); }
      setLoadingAI(false);
  };

  const applyData = (data: Partial<Ingredient>) => {
    setCurrentIng(prev => {
        const { name, ...rest } = data;
        const finalName = (name && name.trim().length > 0) ? name : prev.name;
        return { ...prev, ...rest, name: finalName, nutrients: data.nutrients ? { ...data.nutrients } : prev.nutrients, physico: data.physico ? { ...data.physico } : prev.physico };
    });
  };

  const toggleArrayItem = <T,>(item: T, list: T[], field: keyof Ingredient) => {
    const set = new Set(list);
    if (set.has(item)) set.delete(item); else set.add(item);
    setCurrentIng({ ...currentIng, [field]: Array.from(set) });
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 200 * 1024) { alert("Fichier > 200ko."); return; }
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  const newDoc: AttachedDocument = { id: Date.now().toString(), name: file.name, type: 'Specs', date: new Date().toISOString().split('T')[0], url: reader.result as string };
                  setCurrentIng(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
              }
          };
          reader.readAsDataURL(file);
      }
  };

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4 text-slate-800">{ingredients.find(i => i.id === currentIng.id) ? 'Éditer' : 'Nouvel'} Ingrédient</h2>
        <div className="flex gap-2 mb-4 border-b border-slate-200">
            {['general', 'nutri', 'tech', 'docs'].map(t => (
                <button key={t} onClick={() => setEditTab(t as any)} className={`px-4 py-2 text-sm font-medium capitalize ${editTab === t ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500'}`}>{t}</button>
            ))}
        </div>

        <div className="min-h-[300px]">
            {editTab === 'general' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Nom</label>
                            <div className="flex gap-2">
                                <input type="text" className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-teal-500 bg-white text-slate-900" value={currentIng.name} onChange={e => setCurrentIng({...currentIng, name: e.target.value})} />
                                <button onClick={handleAIFill} disabled={loadingAI || !currentIng.name} className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] justify-center">{loadingAI ? '...' : '✨ IA'}</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Fournisseur</label>
                            <select className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" value={currentIng.supplierId || ''} onChange={e => setCurrentIng({...currentIng, supplierId: e.target.value})}>
                                <option value="">-- Sélectionner --</option>{suppliers.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-sm font-medium text-slate-700">Photo</label>
                                <label className="cursor-pointer text-xs text-teal-600 font-medium hover:underline">+ Ajouter<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
                            </div>
                            <div className="flex gap-2 overflow-x-auto p-1 bg-slate-50 rounded border border-slate-200 h-24 items-center">
                                {(currentIng.images && currentIng.images.length > 0) ? (
                                    currentIng.images.map((img, idx) => (
                                        <div key={idx} className="h-20 w-20 flex-shrink-0 relative group">
                                            <img src={img} className="h-full w-full object-cover rounded border border-slate-300" />
                                            <button onClick={() => removeImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100">×</button>
                                        </div>
                                    ))
                                ) : <div className="text-xs text-slate-400 italic w-full text-center">Aucune photo</div>}
                            </div>
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700">Coût (€/kg)</label><input type="number" step="0.01" className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" value={currentIng.costPerKg} onChange={e => setCurrentIng({...currentIng, costPerKg: parseFloat(e.target.value) || 0})} /></div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Labels</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.values(LabelTag).map(label => (
                                    <button key={label} onClick={() => toggleArrayItem(label, currentIng.labels, 'labels')} className={`px-2 py-1 text-xs rounded-full border ${currentIng.labels.includes(label) ? 'bg-green-100 border-green-300 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Allergènes</label>
                         <div className="flex flex-wrap gap-2 mb-6">
                            {Object.values(Allergen).filter(a => a !== Allergen.NONE).map(alg => (
                                <button key={alg} onClick={() => toggleArrayItem(alg, currentIng.allergens, 'allergens')} className={`px-2 py-1 text-xs rounded-full border ${currentIng.allergens.includes(alg) ? 'bg-red-100 border-red-300 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{alg}</button>
                            ))}
                        </div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Traces</label>
                         <div className="flex flex-wrap gap-2">
                            {Object.values(Allergen).filter(a => a !== Allergen.NONE).map(alg => (
                                <button key={`trace-${alg}`} onClick={() => toggleArrayItem(alg, currentIng.traces || [], 'traces')} className={`px-2 py-1 text-xs rounded-full border ${currentIng.traces?.includes(alg) ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{alg}</button>
                            ))}
                        </div>
                    </div>
                 </div>
            )}
            
            {editTab === 'nutri' && (
                <div className="bg-slate-50 p-4 rounded border border-slate-100">
                    <div className="grid grid-cols-2 gap-4">
                        {(Object.keys(emptyNutrients) as Array<keyof NutrientProfile>).map(key => (
                            <div key={key}>
                                <label className="block text-xs uppercase text-slate-500 mb-1">{key}</label>
                                <input type="number" className="w-full border border-slate-300 rounded p-1 text-sm bg-white text-slate-900" value={currentIng.nutrients[key]} onChange={e => setCurrentIng({...currentIng, nutrients: { ...currentIng.nutrients, [key]: parseFloat(e.target.value) || 0 }})} />
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                         <label className="block text-sm font-medium text-slate-700 mb-1">Part Fruits & Légumes (%)</label>
                         <input type="number" min="0" max="100" className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" value={currentIng.fruitVegetablePercent || 0} onChange={e => setCurrentIng({...currentIng, fruitVegetablePercent: parseFloat(e.target.value) || 0})} />
                    </div>
                </div>
            )}

            {editTab === 'tech' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-green-50 p-4 rounded border border-green-100">
                         <label className="block text-sm font-bold text-green-800 mb-1">Empreinte Carbone</label>
                         <input type="number" step="0.01" className="w-full border border-green-300 rounded p-2 bg-white text-slate-900" value={currentIng.carbonFootprint || 0} onChange={e => setCurrentIng({...currentIng, carbonFootprint: parseFloat(e.target.value) || 0})} />
                     </div>
                     <div><label className="block text-sm font-medium text-slate-700 mb-1">Brix</label><input type="number" className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" value={currentIng.physico.brix || ''} onChange={e => setCurrentIng({...currentIng, physico: { ...currentIng.physico, brix: parseFloat(e.target.value) }})} /></div>
                     <div><label className="block text-sm font-medium text-slate-700 mb-1">pH</label><input type="number" step="0.1" className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" value={currentIng.physico.ph || ''} onChange={e => setCurrentIng({...currentIng, physico: { ...currentIng.physico, ph: parseFloat(e.target.value) }})} /></div>
                     <div><label className="block text-sm font-medium text-slate-700 mb-1">aw</label><input type="number" step="0.01" className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" value={currentIng.physico.aw || ''} onChange={e => setCurrentIng({...currentIng, physico: { ...currentIng.physico, aw: parseFloat(e.target.value) }})} /></div>
                     <div><label className="block text-sm font-medium text-slate-700 mb-1">État</label><div className="flex items-center gap-2 mt-2"><input type="checkbox" id="isLiquid" checked={currentIng.isLiquid} onChange={e => setCurrentIng({...currentIng, isLiquid: e.target.checked})} /><label htmlFor="isLiquid" className="text-sm text-slate-600">Liquide</label></div></div>
                </div>
            )}

            {editTab === 'docs' && (
                <div>
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="text-sm font-bold text-slate-700">Documents</h3>
                         <label className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded cursor-pointer flex items-center gap-1"><span>+ Ajouter</span><input type="file" onChange={handleDocUpload} className="hidden" accept=".pdf,.doc,.docx,.jpg,.png" /></label>
                     </div>
                     <div className="space-y-2">
                         {currentIng.documents.map((doc, idx) => (
                             <div key={doc.id} className="flex items-center gap-3 p-3 border rounded bg-slate-50">
                                 <div className="text-2xl">📄</div>
                                 <div className="flex-1"><input type="text" className="text-sm border-b bg-transparent border-slate-300 w-full" value={doc.name} onChange={e => { const newDocs = [...currentIng.documents]; newDocs[idx].name = e.target.value; setCurrentIng({...currentIng, documents: newDocs}); }} /></div>
                                 <button onClick={() => setCurrentIng({...currentIng, documents: currentIng.documents.filter(d => d.id !== doc.id)})} className="text-red-500">×</button>
                             </div>
                         ))}
                     </div>
                </div>
            )}
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Annuler</button>
            <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 font-medium">Enregistrer</button>
        </div>
      </div>
    );
  }

  // View List Code (Simplified for display)
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* ... Header et Onglets ... */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex gap-4">
                <button onClick={() => setViewTab('list')} className={`font-bold text-sm ${viewTab === 'list' ? 'text-teal-700 underline underline-offset-4' : 'text-slate-500'}`}>Référentiel</button>
                <button onClick={() => setViewTab('import')} className={`font-bold text-sm ${viewTab === 'import' ? 'text-indigo-700 underline underline-offset-4' : 'text-slate-500'}`}>Imports</button>
            </div>
            {viewTab === 'list' && (<div className="flex gap-2"><button onClick={() => setShowSmartImport(true)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm rounded hover:bg-indigo-100">📄 Smart Import</button><button onClick={handleNew} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700">+ Ajouter</button></div>)}
        </div>

        {viewTab === 'import' && (
            <div className="p-8">
                {/* ... Import content ... */}
                <div className="border border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white"><label className="cursor-pointer bg-teal-50 text-teal-700 px-6 py-3 rounded-lg font-bold border border-teal-200">📂 Importer CSV/Excel<input type="file" accept=".csv, .xlsx" className="hidden" onChange={handleFileImport} /></label></div>
            </div>
        )}

        {viewTab === 'list' && (
            <>
                {showSmartImport && (
                    <div className="bg-indigo-50 p-4 border-b border-indigo-100">
                        <textarea className="w-full h-32 p-3 border border-indigo-200 rounded text-sm bg-white text-slate-900" placeholder="Collez le texte..." value={rawTextImport} onChange={(e) => setRawTextImport(e.target.value)} />
                        <div className="mt-2 flex justify-end gap-2"><button onClick={() => setShowSmartImport(false)} className="px-3 py-1 text-sm">Annuler</button><button onClick={handleSmartImport} className="px-3 py-1 bg-indigo-600 text-white text-sm rounded">Extraire</button></div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b"><tr><th className="px-4 py-3">Nom</th><th className="px-4 py-3 text-right">Coût</th><th className="px-4 py-3 text-right">CO2e</th><th className="px-4 py-3">Qualité</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {ingredients.map(ing => (
                                <tr key={ing.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3"><div className="flex items-center gap-2">{ing.images?.[0] && <img src={ing.images[0]} className="w-8 h-8 rounded object-cover border" />}<div><div className="font-medium">{ing.name}</div>{ing.supplierId && <div className="text-[10px] text-slate-500">{suppliers.find(s=>s.id===ing.supplierId)?.name}</div>}</div></div></td>
                                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(ing.costPerKg)}</td>
                                    <td className="px-4 py-3 text-right text-green-600 text-xs">{ing.carbonFootprint?.toFixed(2) || '-'}</td>
                                    <td className="px-4 py-3">{ing.labels.map(l=><span key={l} className="text-xs bg-green-50 px-1 rounded border mr-1">{l}</span>)}</td>
                                    <td className="px-4 py-3 text-right space-x-2"><button onClick={() => handleEdit(ing)} className="text-teal-600 font-medium">Éditer</button><button onClick={() => handleDeleteWithImpactCheck(ing.id)} className="text-red-400">🗑️</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        )}
    </div>
  );
};
