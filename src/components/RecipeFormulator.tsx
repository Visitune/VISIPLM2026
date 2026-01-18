
import React, { useState, useMemo } from 'react';
import { Recipe, Ingredient, Packaging, RecipeItem, Allergen, RecipeStatus, ChangeLogEntry, AttachedDocument } from '../types';
import { calculateFormulation, formatCurrency, formatNumber } from '../services/calculationService';
import { optimizeRecipeCost } from '../services/geminiService';
import { compressImage } from '../services/imageService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface RecipeRowProps {
  item: RecipeItem;
  allIngredients: Ingredient[];
  totalInputWeight: number;
  updateItem: (id: string, updates: Partial<RecipeItem>) => void;
  removeItem: (id: string) => void;
  isGrouped?: boolean;
}

const RecipeRow: React.FC<RecipeRowProps> = ({ item, allIngredients, totalInputWeight, updateItem, removeItem, isGrouped }) => {
  const ingredient = allIngredients.find(ing => ing.id === item.ingredientId);
  const cost = ingredient ? (item.quantity / 1000) * ingredient.costPerKg : 0;
  const percent = totalInputWeight > 0 ? (item.quantity / totalInputWeight) * 100 : 0;

  return (
      <tr className={`hover:bg-slate-50 group ${isGrouped ? 'bg-teal-50/20' : ''}`}>
          <td className={`px-4 py-3 ${isGrouped ? 'pl-8' : ''}`}>
              <div className="flex items-center gap-2">
                   {ingredient?.images && ingredient.images.length > 0 && (
                      <img src={ingredient.images[0]} className="w-8 h-8 rounded object-cover border border-slate-200" />
                  )}
                  <div>
                      <div className="font-medium text-slate-800">{ingredient?.name || 'Inconnu'}</div>
                      {item.group && !isGrouped && (
                          <div className="text-[10px] bg-slate-100 px-1.5 rounded inline-block text-slate-500 border border-slate-200">
                              {item.group}
                          </div>
                      )}
                  </div>
              </div>
          </td>
          <td className="px-4 py-3 text-right">
              <input 
                  type="number" 
                  className="w-20 text-right border border-slate-300 rounded p-1 bg-white text-slate-900 focus:ring-1 focus:ring-teal-500"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
              />
          </td>
          <td className="px-4 py-3 text-right text-slate-500 text-xs">
              {formatNumber(percent)}%
          </td>
          <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
              {formatNumber(cost, 3)} €
          </td>
          <td className="px-4 py-3 text-right">
              <button 
                  onClick={() => removeItem(item.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
              >
                  ×
              </button>
          </td>
      </tr>
  );
};

interface RecipeFormulatorProps {
  recipe: Recipe;
  allIngredients: Ingredient[];
  allPackagings: Packaging[];
  onUpdateRecipe: (r: Recipe) => void;
  onBack: () => void;
}

export const RecipeFormulator: React.FC<RecipeFormulatorProps> = ({ recipe, allIngredients, allPackagings, onUpdateRecipe, onBack }) => {
  const [selectedIngId, setSelectedIngId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'formulation' | 'process' | 'quality' | 'packaging' | 'docs' | 'techsheet' | 'costing'>('formulation');
  const [optimizationSuggestion, setOptimizationSuggestion] = useState<string | null>(null);
  const [loadingOptimization, setLoadingOptimization] = useState(false);
  
  const result = useMemo(() => calculateFormulation(recipe, allIngredients, allPackagings), [recipe, allIngredients, allPackagings]);

  const groupedItems = useMemo(() => {
      const groups: Record<string, RecipeItem[]> = {};
      const noGroup: RecipeItem[] = [];
      recipe.items.forEach(item => {
          if (item.group) { if (!groups[item.group]) groups[item.group] = []; groups[item.group].push(item); } else { noGroup.push(item); }
      });
      return { groups, noGroup };
  }, [recipe.items]);

  const existingGroups = useMemo(() => {
      const s = new Set<string>();
      recipe.items.forEach(i => { if (i.group) s.add(i.group); });
      return Array.from(s);
  }, [recipe.items]);

  // UPDATED: Use Compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files) as File[];
          for (const file of files) {
              try {
                  const compressed = await compressImage(file);
                  onUpdateRecipe({
                      ...recipe,
                      images: [...(recipe.images || []), compressed]
                  });
              } catch (error) {
                  console.error(error);
                  alert("Erreur image");
              }
          }
      }
  };

  const removeImage = (index: number) => {
      const newImages = [...(recipe.images || [])];
      newImages.splice(index, 1);
      onUpdateRecipe({ ...recipe, images: newImages });
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 500 * 1024) { alert("Fichier > 500ko."); return; }
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  const newDoc: AttachedDocument = { id: Date.now().toString(), name: file.name, type: 'Other', date: new Date().toISOString().split('T')[0], url: reader.result as string };
                  onUpdateRecipe({ ...recipe, documents: [...(recipe.documents || []), newDoc] });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const updateItem = (itemId: string, updates: Partial<RecipeItem>) => {
    const newItems = recipe.items.map(item => item.id === itemId ? { ...item, ...updates } : item);
    onUpdateRecipe({ ...recipe, items: newItems });
  };
  
  const removeItem = (itemId: string) => {
    const newItems = recipe.items.filter(item => item.id !== itemId);
    onUpdateRecipe({ ...recipe, items: newItems });
  };

  const addItem = () => {
    if (!selectedIngId) return;
    const newItem: RecipeItem = { id: Date.now().toString(), ingredientId: selectedIngId, quantity: 100, group: selectedGroup || undefined };
    onUpdateRecipe({ ...recipe, items: [...recipe.items, newItem] });
    setSelectedIngId('');
  };

  const addPackagingItem = () => {
      if(!selectedPackId) return;
      const newPackItem = { id: Date.now().toString(), packagingId: selectedPackId, quantity: 1 };
      onUpdateRecipe({...recipe, packagingItems: [...(recipe.packagingItems || []), newPackItem]});
      setSelectedPackId('');
  };

  const removePackagingItem = (id: string) => {
      onUpdateRecipe({...recipe, packagingItems: recipe.packagingItems.filter(p => p.id !== id)});
  };

  const updatePackagingQuantity = (id: string, q: number) => {
      onUpdateRecipe({ ...recipe, packagingItems: recipe.packagingItems.map(p => p.id === id ? {...p, quantity: q} : p) });
  };

  const addProcessStep = () => {
      const newStep = { id: Date.now().toString(), order: (recipe.processSteps?.length || 0) + 1, name: 'Nouvelle étape', description: '', criticalParam: '' };
      onUpdateRecipe({...recipe, processSteps: [...(recipe.processSteps || []), newStep]});
  };

  const addQualityControl = () => {
      const newQC = { id: Date.now().toString(), name: 'Nouveau contrôle', target: '', frequency: '', type: 'Physico' as const };
      onUpdateRecipe({...recipe, qualityControls: [...(recipe.qualityControls || []), newQC]});
  };
  
  const addChangeLog = () => {
      const { changeLog, ...snapshotData } = recipe; 
      const snapshot = JSON.stringify(snapshotData);
      const newEntry: ChangeLogEntry = { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], version: recipe.version, author: 'Moi', comment: '', snapshot: snapshot };
      onUpdateRecipe({...recipe, changeLog: [newEntry, ...(recipe.changeLog || [])]});
  };

  const restoreVersion = (snapshot: string | undefined) => {
      if (!snapshot) return;
      if (window.confirm("Restaurer cette version écrasera la recette actuelle. Continuer ?")) {
          const restored = JSON.parse(snapshot);
          onUpdateRecipe({ ...restored, changeLog: recipe.changeLog });
      }
  };

  const handleOptimizeCost = async () => {
      setLoadingOptimization(true);
      const advice = await optimizeRecipeCost(recipe, allIngredients);
      setOptimizationSuggestion(advice);
      setLoadingOptimization(false);
  };

  const macroData = [
    { name: 'Protéines', value: result.nutrientsPer100g.protein, color: '#3b82f6' },
    { name: 'Glucides', value: result.nutrientsPer100g.carbohydrates, color: '#eab308' },
    { name: 'Lipides', value: result.nutrientsPer100g.fat, color: '#ef4444' },
  ];

  const NutriScoreBadge = ({ score }: { score: string }) => {
      const colors: Record<string, string> = { 'A': 'bg-[#038141]', 'B': 'bg-[#85BB2F]', 'C': 'bg-[#FECB02]', 'D': 'bg-[#EE8100]', 'E': 'bg-[#E63E11]' };
      return (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded border border-slate-200 print-break-inside-avoid">
              <span className="text-xs font-bold text-slate-500 uppercase">Nutri-Score</span>
              <div className="flex">
                  {['A','B','C','D','E'].map(l => (
                      <div key={l} className={`w-8 h-8 flex items-center justify-center font-bold text-white text-lg ${score === l ? colors[l] + ' scale-110 shadow-md rounded' : 'bg-slate-300 opacity-30 scale-90'}`}>{l}</div>
                  ))}
              </div>
          </div>
      );
  };

  const renderFormulation = () => (
    <div className="grid grid-cols-12 gap-6 h-full">
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <button onClick={onBack} className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">←</button>
                <div className="flex-1"><input type="text" className="text-2xl font-bold text-slate-800 w-full border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none bg-transparent placeholder-slate-300" value={recipe.name} onChange={(e) => onUpdateRecipe({...recipe, name: e.target.value})} placeholder="Nom de la recette" /></div>
                 <select className={`text-xs font-bold uppercase py-1.5 px-3 rounded-full border cursor-pointer ${recipe.status === RecipeStatus.VALIDATED ? 'bg-green-100 text-green-800 border-green-200' : recipe.status === RecipeStatus.IN_DEV ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`} value={recipe.status} onChange={(e) => onUpdateRecipe({...recipe, status: e.target.value as RecipeStatus})}>{Object.values(RecipeStatus).map(s => <option key={s} value={s}>{s}</option>)}</select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><span>📝 Concept & Description Produit</span></label>
                    <div className="relative group"><textarea className="w-full h-32 p-4 rounded-lg bg-slate-50 border-2 border-slate-100 text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:ring-0 transition-all resize-none leading-relaxed shadow-inner text-sm" value={recipe.description || ''} onChange={(e) => onUpdateRecipe({...recipe, description: e.target.value})} placeholder="Décrivez le concept du produit..." /></div>
                </div>
                <div className="md:col-span-4 flex flex-col gap-4">
                     <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col gap-2 shadow-sm">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Visuels</span><label className="cursor-pointer text-[10px] text-teal-600 font-bold hover:underline">+ Ajouter<input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} /></label></div>
                         <div className="flex gap-2 overflow-x-auto pb-1 h-16">
                            {(recipe.images && recipe.images.length > 0) ? (
                                recipe.images.map((img, idx) => (
                                    <div key={idx} className="h-14 w-14 flex-shrink-0 relative group"><img src={img} className="h-full w-full object-cover rounded border border-slate-200" /><button onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 shadow-sm">×</button></div>
                                ))
                            ) : <div className="h-14 w-full bg-slate-50 rounded border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs italic">Aucune photo</div>}
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                         <div className="bg-slate-50 p-2 rounded border border-slate-100"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Version</label><input type="text" className="w-full bg-transparent border-b border-slate-200 focus:border-teal-500 text-center font-mono text-sm" value={recipe.version} onChange={(e) => onUpdateRecipe({...recipe, version: e.target.value})} /></div>
                         <div className="bg-slate-50 p-2 rounded border border-slate-100"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Perte Eau %</label><input type="number" min="0" max="99" className="w-full bg-transparent border-b border-slate-200 focus:border-teal-500 text-right font-mono text-sm" value={recipe.moistureLoss} onChange={(e) => onUpdateRecipe({...recipe, moistureLoss: parseFloat(e.target.value) || 0})} /></div>
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-3">
                 <div className="flex justify-between items-center"><label className="block text-xs font-bold text-slate-500 uppercase">Ajout Ingrédient</label></div>
                 <div className="flex gap-3">
                    <div className="flex-1">
                        <select className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-teal-500" value={selectedIngId} onChange={(e) => setSelectedIngId(e.target.value)}>
                            <option value="">Ingrédient...</option>{allIngredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                        </select>
                    </div>
                    <div className="w-1/3 relative"><input list="existing-groups" type="text" placeholder="Groupe" className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-teal-500" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} /><datalist id="existing-groups">{existingGroups.map(g => <option key={g} value={g} />)}</datalist></div>
                    <button onClick={addItem} disabled={!selectedIngId} className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-slate-300 text-sm font-bold shadow-sm transition-colors whitespace-nowrap">+ Ajouter</button>
                 </div>
            </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><span>🥣</span> Composition (Matière Première)</h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">{recipe.items.length} composants</span>
            </div>
            <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b shadow-sm">
                        <tr><th className="px-4 py-3">Ingrédient</th><th className="px-4 py-3 text-right w-32">Quantité (g)</th><th className="px-4 py-3 text-right w-24">% Mix</th><th className="px-4 py-3 text-right w-24">Coût (€)</th><th className="px-4 py-3 w-10"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {groupedItems.noGroup.length > 0 && groupedItems.noGroup.map(item => (<RecipeRow key={item.id} item={item} allIngredients={allIngredients} totalInputWeight={result.totalInputWeight} updateItem={updateItem} removeItem={removeItem} />))}
                        {Object.entries(groupedItems.groups).map(([groupName, items]: [string, RecipeItem[]]) => {
                            const groupWeight = items.reduce((acc, i) => acc + i.quantity, 0);
                            const groupPercent = result.totalInputWeight > 0 ? (groupWeight / result.totalInputWeight) * 100 : 0;
                            const groupCost = items.reduce((acc, i) => { const ing = allIngredients.find(x => x.id === i.ingredientId); return acc + (ing ? (i.quantity/1000) * ing.costPerKg : 0); }, 0);
                            return (
                                <React.Fragment key={groupName}>
                                    <tr className="bg-teal-50/50 border-y border-teal-100"><td className="px-4 py-2 font-bold text-teal-800 text-xs uppercase tracking-wider flex items-center gap-2"><span>📂 {groupName}</span></td><td className="px-4 py-2 text-right font-bold text-teal-800 text-xs">{formatNumber(groupWeight, 0)} g</td><td className="px-4 py-2 text-right font-bold text-teal-800 text-xs">{formatNumber(groupPercent)}%</td><td className="px-4 py-2 text-right font-bold text-teal-800 text-xs">{formatNumber(groupCost, 2)} €</td><td></td></tr>
                                    {items.map(item => <RecipeRow key={item.id} item={item} allIngredients={allIngredients} totalInputWeight={result.totalInputWeight} updateItem={updateItem} removeItem={removeItem} isGrouped />)}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-medium text-slate-700 border-t border-slate-200"><tr><td className="px-4 py-3">Total Mise en œuvre</td><td className="px-4 py-3 text-right font-bold text-teal-700">{formatNumber(result.totalInputWeight, 0)} g</td><td className="px-4 py-3 text-right">100%</td><td className="px-4 py-3 text-right">{formatNumber(result.totalMaterialCost, 2)} €</td><td></td></tr></tfoot>
                </table>
            </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
             <div className="bg-teal-600 text-white p-4 rounded-xl shadow-md border border-teal-700 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-teal-500 rounded-full opacity-30 group-hover:scale-150 transition-transform"></div>
                <div className="text-teal-100 text-xs uppercase font-bold tracking-wider mb-1">Prix Revient</div>
                <div className="text-2xl font-bold font-mono">{formatCurrency(result.costPerKg)}</div>
                <div className="text-teal-200 text-xs">/kg (Mat. Prem.)</div>
             </div>
             <div className="bg-slate-800 text-white p-4 rounded-xl shadow-md border border-slate-900 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-700 rounded-full opacity-30 group-hover:scale-150 transition-transform"></div>
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Rendement</div>
                <div className="text-2xl font-bold font-mono">{formatNumber(result.yield)}%</div>
                <div className="text-slate-400 text-xs">{formatNumber(result.finalWeight, 0)}g net</div>
             </div>
        </div>
        <NutriScoreBadge score={result.nutriScore} />
        <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100 relative overflow-hidden">
             <div className="flex justify-between items-start mb-2"><h4 className="text-green-800 font-bold text-sm uppercase flex items-center gap-2"><span>🌍</span> Impact Environnemental</h4><span className="text-[10px] bg-white text-green-700 px-2 py-1 rounded border border-green-200">Agribalyse</span></div>
             <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-green-900 font-mono">{result.carbonFootprintPerKg ? result.carbonFootprintPerKg.toFixed(2) : '--'}</span><span className="text-xs text-green-700">kg CO2e / kg produit</span></div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex-1">
            <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b flex justify-between items-center"><span>Valeurs Nutritionnelles</span><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">pour 100g</span></h3>
            <div className="h-40 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={macroData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                            {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}g`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 py-1.5 items-center"><span className="font-bold text-slate-700">Énergie</span><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-900 font-mono">{formatNumber(result.nutrientsPer100g.energyKcal, 0)} kcal</span></div>
                <div className="flex justify-between py-1 items-center"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span>Matières grasses</span></div><span className="font-mono text-slate-600">{formatNumber(result.nutrientsPer100g.fat)} g</span></div>
                 <div className="flex justify-between pl-6 text-slate-400 py-0.5"><span>dont a.g. saturés</span><span className="font-mono">{formatNumber(result.nutrientsPer100g.saturatedFat)} g</span></div>
                <div className="flex justify-between py-1 items-center"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span>Glucides</span></div><span className="font-mono text-slate-600">{formatNumber(result.nutrientsPer100g.carbohydrates)} g</span></div>
                <div className="flex justify-between pl-6 text-slate-400 py-0.5"><span>dont sucres</span><span className="font-mono">{formatNumber(result.nutrientsPer100g.sugars)} g</span></div>
                 <div className="flex justify-between py-1 items-center"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span>Protéines</span></div><span className="font-mono text-slate-600">{formatNumber(result.nutrientsPer100g.protein)} g</span></div>
                 <div className="flex justify-between py-1 items-center pt-2 border-t border-slate-50"><span className="text-slate-500">Sel</span><span className="font-mono text-slate-600">{formatNumber(result.nutrientsPer100g.salt)} g</span></div>
            </div>
        </div>
      </div>
    </div>
  );

  // ... (Previous logic for renderProcess, renderQuality, renderPackaging, renderDocs, renderTechSheet, renderCosting remains the same, I will include them to ensure file integrity) ...
  const renderProcess = () => (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full overflow-y-auto">
          <div className="mb-6 border-b border-slate-200 pb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Mode Opératoire (Instructions)</h3>
              <textarea className="w-full h-32 border border-slate-300 rounded p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50 text-slate-900" placeholder="Instructions..." value={recipe.instructions || ''} onChange={(e) => onUpdateRecipe({...recipe, instructions: e.target.value})} />
          </div>
          <div className="flex justify-between items-center mb-6"><div><h3 className="text-lg font-bold text-slate-800">Itinéraire Technique (Étapes)</h3></div><button onClick={addProcessStep} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 shadow-sm">+ Ajouter Étape</button></div>
          <div className="space-y-4">
              {(recipe.processSteps || []).sort((a,b) => a.order - b.order).map((step, idx) => (
                  <div key={step.id} className="flex gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50 group hover:border-blue-200">
                      <div className="flex flex-col items-center justify-center w-8 pt-1"><div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{step.order}</div></div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Nom</label><input type="text" className="w-full text-sm font-medium bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none text-slate-900" value={step.name} onChange={(e) => { const newSteps = recipe.processSteps.map(s => s.id === step.id ? {...s, name: e.target.value} : s); onUpdateRecipe({...recipe, processSteps: newSteps}); }} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Description</label><input type="text" className="w-full text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none text-slate-900" value={step.description} onChange={(e) => { const newSteps = recipe.processSteps.map(s => s.id === step.id ? {...s, description: e.target.value} : s); onUpdateRecipe({...recipe, processSteps: newSteps}); }} /></div>
                          <div className="relative"><label className="block text-xs font-bold text-red-500 mb-1">CCP</label><input type="text" className="w-full text-sm bg-transparent border-b border-transparent focus:border-red-500 focus:outline-none text-slate-900" value={step.criticalParam || ''} onChange={(e) => { const newSteps = recipe.processSteps.map(s => s.id === step.id ? {...s, criticalParam: e.target.value} : s); onUpdateRecipe({...recipe, processSteps: newSteps}); }} /><button onClick={() => onUpdateRecipe({...recipe, processSteps: recipe.processSteps.filter(s => s.id !== step.id)})} className="absolute right-0 top-0 text-slate-400 hover:text-red-500">×</button></div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderQuality = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full">
        <div className="flex justify-between items-center mb-6"><div><h3 className="text-lg font-bold text-slate-800">Plan de Contrôle Qualité</h3></div><button onClick={addQualityControl} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 shadow-sm">+ Ajouter Critère</button></div>
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200"><tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Paramètre</th><th className="px-4 py-3">Cible</th><th className="px-4 py-3">Fréquence</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
                {(recipe.qualityControls || []).map(qc => (
                    <tr key={qc.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3"><select className="bg-transparent" value={qc.type} onChange={(e) => { const newQC = recipe.qualityControls.map(q => q.id === qc.id ? {...q, type: e.target.value as any} : q); onUpdateRecipe({...recipe, qualityControls: newQC}); }}><option value="Physico">Physico</option><option value="Microbio">Microbio</option><option value="Organoleptic">Organo</option></select></td>
                        <td className="px-4 py-3"><input className="bg-transparent" value={qc.name} onChange={(e) => { const newQC = recipe.qualityControls.map(q => q.id === qc.id ? {...q, name: e.target.value} : q); onUpdateRecipe({...recipe, qualityControls: newQC}); }} /></td>
                        <td className="px-4 py-3 font-mono text-indigo-700"><input className="bg-transparent" value={qc.target} onChange={(e) => { const newQC = recipe.qualityControls.map(q => q.id === qc.id ? {...q, target: e.target.value} : q); onUpdateRecipe({...recipe, qualityControls: newQC}); }} /></td>
                        <td className="px-4 py-3 text-slate-500"><input className="bg-transparent" value={qc.frequency} onChange={(e) => { const newQC = recipe.qualityControls.map(q => q.id === qc.id ? {...q, frequency: e.target.value} : q); onUpdateRecipe({...recipe, qualityControls: newQC}); }} /></td>
                        <td className="px-4 py-3 text-right"><button onClick={() => onUpdateRecipe({...recipe, qualityControls: recipe.qualityControls.filter(q => q.id !== qc.id)})} className="text-red-500">×</button></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  const renderPackaging = () => (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full">
           <h3 className="text-lg font-bold text-slate-800 mb-6">Nomenclature Emballage (BOM)</h3>
           <div className="flex items-end gap-2 bg-slate-50 p-4 rounded border border-slate-100 mb-6">
                <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Ajouter un emballage</label>
                    <select className="w-full border border-slate-300 rounded p-2 text-sm bg-white text-slate-900" value={selectedPackId} onChange={(e) => setSelectedPackId(e.target.value)}><option value="">Sélectionner...</option>{allPackagings.map(p => <option key={p.id} value={p.id}>{p.name} - {p.type}</option>)}</select>
                </div>
                <button onClick={addPackagingItem} disabled={!selectedPackId} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300 text-sm font-medium shadow-sm">Ajouter</button>
            </div>
            <table className="w-full text-sm text-left mb-6">
                <thead className="bg-slate-100 uppercase text-xs text-slate-500"><tr><th className="px-4 py-2">Désignation</th><th className="px-4 py-2">Type</th><th className="px-4 py-2 text-right">Unités</th><th className="px-4 py-2 text-right">Poids Unit.</th><th className="px-4 py-2 text-right">Coût Total</th><th className="px-4 py-2"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {(recipe.packagingItems || []).map(item => { const pack = allPackagings.find(p => p.id === item.packagingId); if(!pack) return null; return ( <tr key={item.id}><td className="px-4 py-3 font-medium">{pack.name}</td><td className="px-4 py-3 text-slate-500">{pack.type}</td><td className="px-4 py-3 text-right"><input type="number" min="1" step="0.1" className="w-20 text-right border border-slate-300 rounded p-1 bg-white text-slate-900" value={item.quantity} onChange={(e) => updatePackagingQuantity(item.id, parseFloat(e.target.value) || 0)} /></td><td className="px-4 py-3 text-right text-slate-500">{pack.weight} g</td><td className="px-4 py-3 text-right">{formatNumber(item.quantity * pack.costPerUnit, 3)} €</td><td className="px-4 py-3 text-right"><button onClick={() => removePackagingItem(item.id)} className="text-red-400 hover:text-red-600">×</button></td></tr> ); })}
                </tbody>
            </table>
            
            <h4 className="text-md font-bold text-slate-700 mb-3 mt-8">Analyse Cycle de Vie (Packaging)</h4>
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded border border-blue-100"><div className="text-xs text-blue-800 font-bold uppercase">Poids Net</div><div className="text-xl font-mono">{formatNumber(result.finalWeight, 0)} g</div></div>
                 <div className="bg-blue-50 p-4 rounded border border-blue-100"><div className="text-xs text-blue-800 font-bold uppercase">Poids Brut</div><div className="text-xl font-mono">{formatNumber(result.grossWeight, 0)} g</div></div>
                <div className="bg-green-50 p-4 rounded border border-green-100"><div className="text-xs text-green-800 font-bold uppercase">Score Eco-Emballage</div><div className="flex items-center gap-2"><div className={`text-2xl font-bold ${result.ecoScore.class === 'A' || result.ecoScore.class === 'B' ? 'text-green-600' : result.ecoScore.class === 'C' ? 'text-yellow-600' : 'text-red-600'}`}>{result.ecoScore.class}</div><div className="text-xs text-green-700">Ratio: {result.ecoScore.ratio.toFixed(1)}%</div></div></div>
                 <div className="bg-green-50 p-4 rounded border border-green-100"><div className="text-xs text-green-800 font-bold uppercase">Recyclabilité</div><div className="text-xl font-mono">{formatNumber(result.ecoScore.recyclableRate, 0)}%</div></div>
            </div>
      </div>
  );

  const renderDocs = () => (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full">
          <div className="flex justify-between items-center mb-6">
              <div><h3 className="text-lg font-bold text-slate-800">GED Produit Fini</h3><p className="text-sm text-slate-500">Cahier des charges, Analyses microbiologiques, Fiches techniques signées...</p></div>
              <label className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm cursor-pointer flex items-center gap-2 font-medium text-sm"><span>+ Ajouter un document</span><input type="file" onChange={handleDocUpload} className="hidden" /></label>
          </div>
          <div className="grid grid-cols-1 gap-3">
              {(recipe.documents || []).length === 0 && (<div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg"><p className="text-slate-400 italic">Aucun document associé à cette recette.</p></div>)}
              {(recipe.documents || []).map((doc, idx) => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
                      <div className="bg-white p-3 rounded border border-slate-200 text-2xl shadow-sm">📄</div>
                      <div className="flex-1">
                          <input type="text" className="font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full" value={doc.name} onChange={(e) => { const newDocs = [...(recipe.documents || [])]; newDocs[idx].name = e.target.value; onUpdateRecipe({...recipe, documents: newDocs}); }} />
                          <div className="flex gap-4 text-xs text-slate-500 mt-1"><span>Ajouté le: {doc.date}</span><select className="bg-transparent border-none p-0 text-xs text-indigo-600 font-medium focus:ring-0" value={doc.type} onChange={(e) => { const newDocs = [...(recipe.documents || [])]; newDocs[idx].type = e.target.value as any; onUpdateRecipe({...recipe, documents: newDocs}); }}><option value="Specs">Cahier des Charges</option><option value="LabAnalysis">Analyse Labo</option><option value="Certificate">Certificat</option><option value="Other">Autre</option></select></div>
                      </div>
                      <div className="flex items-center gap-2">{doc.url && (<a href={doc.url} download={doc.name} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Télécharger">⬇️</a>)}<button onClick={() => onUpdateRecipe({...recipe, documents: recipe.documents?.filter(d => d.id !== doc.id)})} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Supprimer">🗑️</button></div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderTechSheet = () => (
      <div className="bg-white p-8 shadow-sm border border-slate-200 max-w-4xl mx-auto min-h-[800px] tech-sheet-print">
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
              <div><h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">{recipe.name}</h2><div className="flex gap-4 mt-2"><span className="px-2 py-0.5 bg-slate-100 border rounded text-xs text-slate-600">v{recipe.version}</span><span className="px-2 py-0.5 bg-slate-100 border rounded text-xs text-slate-600">{recipe.status}</span></div></div>
              <div className="flex flex-col items-end gap-2 no-print"><button onClick={() => window.print()} className="px-3 py-1 bg-slate-800 text-white text-xs rounded hover:bg-slate-700 shadow-sm flex items-center gap-1">🖨️ Imprimer PDF</button></div>
          </div>
           {(recipe.images && recipe.images.length > 0) && (
               <div className="mb-8 print-break-inside-avoid">
                   <h3 className="text-sm font-bold uppercase text-slate-700 border-b border-slate-200 mb-4 pb-1">Visuels Produit</h3>
                   <div className="grid grid-cols-3 gap-4">{recipe.images.map((img, i) => <img key={i} src={img} className="w-full h-32 object-cover rounded border border-slate-200" />)}</div>
               </div>
           )}
          <div className="mb-8 print-break-inside-avoid"><h3 className="text-sm font-bold uppercase text-slate-700 border-b border-slate-200 mb-2 pb-1">Déclaration des Ingrédients (INCO)</h3><p className="text-sm text-slate-800 leading-relaxed text-justify bg-slate-50 p-4 border border-slate-200 rounded">{result.ingredientList}</p></div>
          <div className="grid grid-cols-2 gap-8 mb-8 print-break-inside-avoid">
              <div className="bg-slate-50 p-4 border border-slate-100 rounded"><h3 className="text-sm font-bold uppercase text-slate-700 mb-2">Caractéristiques Organoleptiques</h3><div className="space-y-2 text-sm"><div className="grid grid-cols-3 items-center"><span className="text-slate-500 text-xs uppercase">Aspect</span><input className="col-span-2 bg-transparent border-b border-slate-200" value={recipe.organoleptic?.appearance || ''} onChange={e => onUpdateRecipe({...recipe, organoleptic: {...recipe.organoleptic!, appearance: e.target.value}})} /></div></div></div>
               <div className="bg-slate-50 p-4 border border-slate-100 rounded"><h3 className="text-sm font-bold uppercase text-slate-700 mb-2">Conservation & Stockage</h3><div className="space-y-2 text-sm"><div className="grid grid-cols-3 items-center"><span className="text-slate-500 text-xs uppercase">DLC</span><input className="col-span-2 bg-transparent border-b border-slate-200" value={recipe.storage?.shelfLife || ''} onChange={e => onUpdateRecipe({...recipe, storage: {...recipe.storage!, shelfLife: e.target.value}})} /></div></div></div>
          </div>
          <div className="grid grid-cols-2 gap-8 mb-8 print-break-inside-avoid">
                <div className="bg-slate-50 p-4 border border-slate-100 rounded"><h3 className="text-sm font-bold uppercase text-slate-700 mb-2">Allergènes Majeurs</h3>{result.allergens.length > 0 ? <p className="text-sm font-bold text-slate-900">Contient : {result.allergens.join(', ')}.</p> : <p className="text-sm text-slate-500 italic">Aucun allergène à déclarer.</p>}{result.traces.length > 0 && (<div className="mt-4 pt-4 border-t border-slate-200"><h3 className="text-xs font-bold uppercase text-slate-500 mb-1">Traces Éventuelles (Précaution)</h3><p className="text-sm text-slate-700">Peut contenir : {result.traces.join(', ')}.</p></div>)}</div>
                <div className="bg-green-50 p-4 border border-green-100 rounded"><h3 className="text-sm font-bold uppercase text-green-800 mb-2">Labels & Nutrition</h3><div className="flex gap-2 mb-2">{result.calculatedLabels.length > 0 ? result.calculatedLabels.map(l => <span key={l} className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full border border-green-300">{l}</span>) : <span className="text-xs text-green-700 italic">Standard</span>}</div><div className="flex justify-between items-center text-xs text-green-900 mt-2"><div>Nutri-Score: <strong>{result.nutriScore}</strong></div><div>CO2: <strong>{result.carbonFootprintPerKg ? result.carbonFootprintPerKg.toFixed(2) : '--'}</strong> kg/kg</div></div></div>
          </div>
          <div className="mb-8 w-full print-break-inside-avoid">
              <h3 className="text-sm font-bold uppercase text-slate-700 border-b border-slate-200 mb-2 pb-1">Déclaration Nutritionnelle</h3>
              <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-100"><tr><th className="text-left p-2 border border-slate-300">Valeurs moyennes</th><th className="text-right p-2 border border-slate-300">Pour 100g</th></tr></thead>
                  <tbody>
                      <tr className="border border-slate-300"><td className="p-2 font-bold">Énergie</td><td className="p-2 text-right font-bold">{formatNumber(result.nutrientsPer100g.energyKcal, 0)} kcal</td></tr>
                      <tr className="border border-slate-300"><td className="p-2">Matières grasses</td><td className="p-2 text-right">{formatNumber(result.nutrientsPer100g.fat)} g</td></tr>
                      <tr className="border border-slate-300"><td className="p-2 pl-6 text-slate-600 italic">dont acides gras saturés</td><td className="p-2 text-right text-slate-600">{formatNumber(result.nutrientsPer100g.saturatedFat)} g</td></tr>
                      <tr className="border border-slate-300"><td className="p-2">Glucides</td><td className="p-2 text-right">{formatNumber(result.nutrientsPer100g.carbohydrates)} g</td></tr>
                      <tr className="border border-slate-300"><td className="p-2 pl-6 text-slate-600 italic">dont sucres</td><td className="p-2 text-right text-slate-600">{formatNumber(result.nutrientsPer100g.sugars)} g</td></tr>
                      <tr className="border border-slate-300"><td className="p-2">Protéines</td><td className="p-2 text-right">{formatNumber(result.nutrientsPer100g.protein)} g</td></tr>
                      <tr className="border border-slate-300"><td className="p-2">Sel</td><td className="p-2 text-right">{formatNumber(result.nutrientsPer100g.salt)} g</td></tr>
                  </tbody>
              </table>
          </div>
           <div className="mt-12 pt-4 border-t-2 border-slate-800 print-break-inside-avoid">
               <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold uppercase text-slate-700">Historique des versions (Snapshot)</h3><button onClick={addChangeLog} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300 no-print">📸 Sauvegarder Version</button></div>
               <table className="w-full text-xs text-left border-collapse">
                   <thead className="bg-slate-100"><tr><th className="p-2 border border-slate-300 w-24">Date</th><th className="p-2 border border-slate-300 w-16">Ver.</th><th className="p-2 border border-slate-300 w-32">Auteur</th><th className="p-2 border border-slate-300">Commentaire</th><th className="p-2 border border-slate-300 w-20 no-print">Action</th></tr></thead>
                   <tbody>
                       {(recipe.changeLog || []).map(log => (
                           <tr key={log.id}>
                               <td className="p-2 border border-slate-300">{log.date}</td><td className="p-2 border border-slate-300">{log.version}</td><td className="p-2 border border-slate-300">{log.author}</td>
                               <td className="p-2 border border-slate-300"><input className="w-full bg-transparent" value={log.comment} onChange={e => { const newLog = recipe.changeLog?.map(l => l.id === log.id ? {...l, comment: e.target.value} : l); onUpdateRecipe({...recipe, changeLog: newLog}); }} /></td>
                               <td className="p-2 border border-slate-300 text-center no-print">{log.snapshot && <button onClick={() => restoreVersion(log.snapshot)} className="text-blue-600 hover:underline mr-2">Restaurer</button>}<button onClick={() => onUpdateRecipe({...recipe, changeLog: recipe.changeLog?.filter(l => l.id !== log.id)})} className="text-red-500 font-bold">×</button></td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
      </div>
  );

  const renderCosting = () => {
      const sellingPrice = result.totalProductionCost * (1 + (recipe.targetMargin || 30) / 100);
      const marginValue = sellingPrice - result.totalProductionCost;
      const unitCost = result.finalWeight > 0 ? (result.totalProductionCost / result.finalWeight) * 1000 : 0; 
      
      // Initialisation config énergie si absente
      const energy = recipe.energyCostConfig || { durationMinutes: 0, powerKw: 0, costPerKwh: 0.25 };

      return (
        <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><span className="text-teal-600">€</span> Structure de Coût du Batch</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100"><div><div className="font-semibold text-slate-700">Matières Premières</div></div><div className="text-lg font-mono font-bold text-slate-800">{formatCurrency(result.totalMaterialCost)}</div></div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-100"><div><div className="font-semibold text-blue-800">Emballage (Détaillé)</div></div><div className="text-lg font-mono font-bold text-blue-800">{formatCurrency(result.totalPackagingCost)}</div></div>
                        <div className="flex items-center justify-between p-3 bg-white rounded border border-slate-200"><div><div className="font-semibold text-slate-700">Main d'Œuvre / Charges</div></div><div className="flex items-center gap-2"><input type="number" className="border border-slate-300 rounded p-1 w-24 text-right bg-white text-slate-900" value={recipe.laborCost || 0} onChange={(e) => onUpdateRecipe({...recipe, laborCost: parseFloat(e.target.value) || 0})} /><span className="text-slate-600">€</span></div></div>
                        
                        {/* SECTION ÉNERGIE */}
                        <div className="p-4 bg-orange-50 rounded border border-orange-100">
                            <div className="flex justify-between items-center mb-3">
                                <div className="font-semibold text-orange-800 flex items-center gap-2"><span>⚡</span> Énergie (Elec/Gaz)</div>
                                <div className="text-lg font-mono font-bold text-orange-800">{formatCurrency(result.totalEnergyCost)}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-orange-700 font-bold mb-1">Temps (min)</label>
                                    <input 
                                        type="number" className="w-full border border-orange-200 rounded p-1 text-sm bg-white text-slate-900"
                                        value={energy.durationMinutes}
                                        onChange={e => onUpdateRecipe({...recipe, energyCostConfig: {...energy, durationMinutes: parseFloat(e.target.value) || 0}})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-orange-700 font-bold mb-1">Puissance (kW)</label>
                                    <input 
                                        type="number" step="0.1" className="w-full border border-orange-200 rounded p-1 text-sm bg-white text-slate-900"
                                        value={energy.powerKw}
                                        onChange={e => onUpdateRecipe({...recipe, energyCostConfig: {...energy, powerKw: parseFloat(e.target.value) || 0}})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-orange-700 font-bold mb-1">Tarif (€/kWh)</label>
                                    <input 
                                        type="number" step="0.01" className="w-full border border-orange-200 rounded p-1 text-sm bg-white text-slate-900"
                                        value={energy.costPerKwh}
                                        onChange={e => onUpdateRecipe({...recipe, energyCostConfig: {...energy, costPerKwh: parseFloat(e.target.value) || 0}})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-800 text-white rounded shadow-md mt-4"><div className="font-bold uppercase tracking-wider">Coût de Production Total</div><div className="text-2xl font-mono font-bold">{formatCurrency(result.totalProductionCost)}</div></div>
                    </div>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-100">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-purple-900 flex items-center gap-2"><span>✨</span> Optimiseur de Coûts IA</h3><button onClick={handleOptimizeCost} disabled={loadingOptimization} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium shadow-sm transition-all">{loadingOptimization ? 'Analyse en cours...' : 'Trouver des économies'}</button></div>
                    {optimizationSuggestion ? (<div className="bg-white p-4 rounded border border-purple-200 text-sm text-slate-700 whitespace-pre-line leading-relaxed shadow-sm">{optimizationSuggestion}</div>) : (<p className="text-sm text-purple-700 italic">Demandez à Gemini d'analyser votre recette pour trouver des alternatives moins chères sans dégrader la qualité.</p>)}
                </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4">Simulation Prix & Marge</h3>
                    <div className="mb-4"><label className="block text-sm font-medium text-slate-600 mb-1">Marge Cible (%)</label><input type="range" min="0" max="100" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600" value={recipe.targetMargin || 30} onChange={(e) => onUpdateRecipe({...recipe, targetMargin: parseFloat(e.target.value)})} /><div className="text-right font-bold text-teal-600 mt-1">{recipe.targetMargin || 30} %</div></div>
                    <div className="space-y-3 pt-4 border-t border-slate-100"><div className="flex justify-between items-center"><span className="text-sm text-slate-600">Prix de Vente (Batch)</span><span className="font-bold text-lg">{formatCurrency(sellingPrice)}</span></div><div className="flex justify-between items-center text-green-600"><span className="text-sm">Marge Valeur</span><span className="font-bold">{formatCurrency(marginValue)}</span></div><div className="flex justify-between items-center pt-2 border-t border-slate-100"><span className="text-sm text-slate-500">Coût complet / kg</span><span className="font-mono text-sm">{formatCurrency(unitCost)}/kg</span></div></div>
                </div>
            </div>
        </div>
      );
  }

  const tabs = [{ id: 'formulation', label: '🛠️ Formulation', color: 'teal' }, { id: 'process', label: '⚙️ Process', color: 'blue' }, { id: 'quality', label: '🧪 Qualité', color: 'indigo' }, { id: 'packaging', label: '📦 Emballage', color: 'blue' }, { id: 'docs', label: '📂 Documents', color: 'indigo' }, { id: 'techsheet', label: '📄 Fiche Technique', color: 'teal' }, { id: 'costing', label: '💰 Coûts & IA', color: 'purple' }];

  return (
    <div className="h-full flex flex-col">
        <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto tabs-header">{tabs.map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? `bg-white text-${tab.color}-700 border-x border-t border-slate-200 -mb-px` : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>{tab.label}</button> ))}</div>
        <div className="flex-1 overflow-auto">
            {activeTab === 'formulation' && renderFormulation()}
            {activeTab === 'process' && renderProcess()}
            {activeTab === 'quality' && renderQuality()}
            {activeTab === 'packaging' && renderPackaging()}
            {activeTab === 'docs' && renderDocs()}
            {activeTab === 'techsheet' && renderTechSheet()}
            {activeTab === 'costing' && renderCosting()}
        </div>
    </div>
  );
};
