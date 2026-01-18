
import React, { useState } from 'react';
import { Packaging, AttachedDocument, Supplier } from '../types';
import { formatCurrency } from '../services/calculationService';
import { compressImage } from '../services/imageService';

interface PackagingManagerProps {
  packagings: Packaging[];
  suppliers: Supplier[]; // Ajout des fournisseurs
  onAddPackaging: (p: Packaging) => void;
  onUpdatePackaging: (p: Packaging) => void;
  onDeletePackaging: (id: string) => void;
}

export const PackagingManager: React.FC<PackagingManagerProps> = ({ packagings, suppliers, onAddPackaging, onUpdatePackaging, onDeletePackaging }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPack, setCurrentPack] = useState<Packaging>({
    id: '',
    name: '',
    supplierId: '',
    type: 'Primary',
    material: '',
    weight: 0,
    costPerUnit: 0,
    recyclability: 'Recyclable',
    documents: [],
    images: []
  });

  const handleEdit = (p: Packaging) => {
    setCurrentPack({ ...p, images: p.images || [] });
    setIsEditing(true);
  };

  const handleNew = () => {
    setCurrentPack({
      id: Date.now().toString(),
      name: '',
      supplierId: '',
      type: 'Primary',
      material: '',
      weight: 0,
      costPerUnit: 0,
      recyclability: 'Recyclable',
      documents: [],
      images: []
    });
    setIsEditing(true);
  };

  // UPDATED: Use Compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files) as File[];
          for (const file of files) {
              try {
                  const compressed = await compressImage(file);
                  setCurrentPack(prev => ({
                      ...prev,
                      images: [...(prev.images || []), compressed]
                  }));
              } catch (error) {
                  console.error(error);
                  alert("Erreur image");
              }
          }
      }
  };

  const removeImage = (index: number) => {
      const newImages = [...(currentPack.images || [])];
      newImages.splice(index, 1);
      setCurrentPack({...currentPack, images: newImages});
  };

  const handleSave = () => {
    if (!currentPack.name) return;
    const exists = packagings.find(p => p.id === currentPack.id);
    if (exists) {
      onUpdatePackaging(currentPack);
    } else {
      onAddPackaging(currentPack);
    }
    setIsEditing(false);
  };

  // Upload Document Réel
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 200 * 1024) { alert("Fichier > 200ko non autorisé."); return; }
          
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  const newDoc: AttachedDocument = {
                      id: Date.now().toString(),
                      name: file.name,
                      type: 'Specs',
                      date: new Date().toISOString().split('T')[0],
                      url: reader.result as string // Base64
                  };
                  setCurrentPack(prev => ({...prev, documents: [...prev.documents, newDoc]}));
              }
          };
          reader.readAsDataURL(file);
      }
  };

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4 text-slate-800">
            {packagings.find(p => p.id === currentPack.id) ? 'Éditer' : 'Nouvel'} Emballage
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Désignation</label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentPack.name}
                        onChange={e => setCurrentPack({...currentPack, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Fournisseur</label>
                    <select 
                        className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentPack.supplierId || ''}
                        onChange={e => setCurrentPack({...currentPack, supplierId: e.target.value})}
                    >
                        <option value="">-- Sélectionner un fournisseur --</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                        ))}
                    </select>
                </div>
                
                 {/* Image Upload */}
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-slate-700">Photo</label>
                        <label className="cursor-pointer text-xs text-teal-600 font-medium hover:underline">
                            + Ajouter
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                    </div>
                    <div className="flex gap-2 overflow-x-auto p-1 bg-slate-50 rounded border border-slate-200 h-24 items-center">
                        {(currentPack.images && currentPack.images.length > 0) ? (
                            currentPack.images.map((img, idx) => (
                                <div key={idx} className="h-20 w-20 flex-shrink-0 relative group">
                                    <img src={img} className="h-full w-full object-cover rounded border border-slate-300" />
                                    <button 
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100"
                                    >×</button>
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-slate-400 italic w-full text-center">Aucune photo</div>
                        )}
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700">Type</label>
                    <select 
                        className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentPack.type}
                        onChange={e => setCurrentPack({...currentPack, type: e.target.value as any})}
                    >
                        <option value="Primary">Primaire (Contact)</option>
                        <option value="Secondary">Secondaire (Groupage)</option>
                        <option value="Tertiary">Tertiaire (Transport)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Matériau</label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentPack.material} placeholder="Ex: PET, Carton, Verre"
                        onChange={e => setCurrentPack({...currentPack, material: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Recyclabilité</label>
                    <select 
                        className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentPack.recyclability || 'Recyclable'}
                        onChange={e => setCurrentPack({...currentPack, recyclability: e.target.value as any})}
                    >
                        <option value="Recyclable">♻️ Recyclable</option>
                        <option value="Non-Recyclable">❌ Non-Recyclable</option>
                        <option value="Compostable">🌱 Compostable</option>
                        <option value="Reusable">🔄 Réutilisable</option>
                    </select>
                </div>
            </div>
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Poids Unitaire (g)</label>
                    <input 
                        type="number" step="0.1" 
                        className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentPack.weight}
                        onChange={e => setCurrentPack({...currentPack, weight: parseFloat(e.target.value) || 0})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Coût Unitaire (€)</label>
                    <input 
                        type="number" step="0.001" 
                        className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentPack.costPerUnit}
                        onChange={e => setCurrentPack({...currentPack, costPerUnit: parseFloat(e.target.value) || 0})}
                    />
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-slate-700">Documents Associés</label>
                        <label className="text-xs text-teal-600 hover:underline cursor-pointer">
                            + Ajouter Fichier
                            <input type="file" onChange={handleDocUpload} className="hidden" />
                        </label>
                    </div>
                    {currentPack.documents.length === 0 ? <p className="text-xs text-slate-400 italic">Aucun document.</p> : (
                        <ul className="space-y-1">
                            {currentPack.documents.map(doc => (
                                <li key={doc.id} className="flex items-center gap-2 text-xs text-slate-600">
                                    <span>📄</span>
                                    <input 
                                        type="text" value={doc.name} 
                                        className="bg-transparent border-b border-transparent focus:border-teal-500 w-full text-slate-900"
                                        onChange={(e) => {
                                            const newDocs = currentPack.documents.map(d => d.id === doc.id ? {...d, name: e.target.value} : d);
                                            setCurrentPack({...currentPack, documents: newDocs});
                                        }}
                                    />
                                    {doc.url && doc.url !== '#' && (
                                        <a href={doc.url} download={doc.name} className="text-blue-500 hover:text-blue-700" title="Télécharger">⬇️</a>
                                    )}
                                    <button 
                                        onClick={() => setCurrentPack({...currentPack, documents: currentPack.documents.filter(d => d.id !== doc.id)})}
                                        className="text-red-400 hover:text-red-600"
                                    >×</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Annuler</button>
            <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 font-medium">Enregistrer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-bold text-slate-700">Référentiel Emballages</h2>
            <button onClick={handleNew} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 shadow-sm">+ Ajouter</button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                        <th className="px-4 py-3">Désignation</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Recyclabilité</th>
                        <th className="px-4 py-3 text-right">Poids (g)</th>
                        <th className="px-4 py-3 text-right">Coût (€)</th>
                        <th className="px-4 py-3 text-center">Docs</th>
                        <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {packagings.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 group">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                     {p.images && p.images.length > 0 && (
                                        <img src={p.images[0]} className="w-8 h-8 rounded object-cover border border-slate-200" />
                                    )}
                                    <div>
                                        <div className="font-medium text-slate-800">{p.name} <span className="text-xs text-slate-400 ml-1">({p.material})</span></div>
                                        {p.supplierId && (
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                🏭 {suppliers.find(s => s.id === p.supplierId)?.name || 'Inconnu'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${p.type === 'Primary' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    {p.type === 'Primary' ? 'Primaire' : p.type === 'Secondary' ? 'Secondaire' : 'Tertiaire'}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded border ${
                                    p.recyclability === 'Recyclable' ? 'bg-green-100 text-green-700 border-green-200' : 
                                    p.recyclability === 'Non-Recyclable' ? 'bg-red-100 text-red-700 border-red-200' : 
                                    'bg-orange-100 text-orange-700 border-orange-200'
                                }`}>{p.recyclability || 'Recyclable'}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 font-mono">{p.weight}</td>
                            <td className="px-4 py-3 text-right text-slate-600 font-mono">{formatCurrency(p.costPerUnit)}</td>
                            <td className="px-4 py-3 text-center text-slate-400 text-xs">
                                {p.documents.length > 0 ? `📎 ${p.documents.length}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                                <button onClick={() => handleEdit(p)} className="text-teal-600 hover:text-teal-800 font-medium">Éditer</button>
                                <button onClick={() => onDeletePackaging(p.id)} className="text-slate-400 hover:text-red-600">🗑️</button>
                            </td>
                        </tr>
                    ))}
                    {packagings.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Aucun emballage défini.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
};
