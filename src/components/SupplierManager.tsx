
import React, { useState } from 'react';
import { Supplier, AttachedDocument } from '../types';

interface SupplierManagerProps {
  suppliers: Supplier[];
  onAddSupplier: (s: Supplier) => void;
  onUpdateSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier>({
    id: '', name: '', code: '', contactEmail: '', status: 'Pending', certification: [], documents: []
  });

  const handleEdit = (s: Supplier) => {
    setCurrentSupplier({ ...s, documents: s.documents || [] });
    setIsEditing(true);
  };

  const handleNew = () => {
    setCurrentSupplier({
      id: Date.now().toString(),
      name: '',
      code: '',
      contactEmail: '',
      status: 'Pending',
      certification: [],
      documents: []
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!currentSupplier.name) return;
    const exists = suppliers.find(s => s.id === currentSupplier.id);
    if (exists) {
      onUpdateSupplier(currentSupplier);
    } else {
      onAddSupplier(currentSupplier);
    }
    setIsEditing(false);
  };

  const toggleCert = (cert: string) => {
      const newCerts = currentSupplier.certification.includes(cert) 
        ? currentSupplier.certification.filter(c => c !== cert)
        : [...currentSupplier.certification, cert];
      setCurrentSupplier({...currentSupplier, certification: newCerts});
  };

  // Upload Document Réel
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  const newDoc: AttachedDocument = {
                      id: Date.now().toString(),
                      name: file.name,
                      type: 'Certificate',
                      date: new Date().toISOString().split('T')[0],
                      url: reader.result as string
                  };
                  setCurrentSupplier(prev => ({...prev, documents: [...prev.documents, newDoc]}));
              }
          };
          reader.readAsDataURL(file);
      }
  };

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-slate-800">
            {suppliers.find(s => s.id === currentSupplier.id) ? 'Éditer' : 'Nouveau'} Fournisseur
        </h2>
        
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Nom Entreprise</label>
                    <input 
                        type="text" className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentSupplier.name}
                        onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Code Fournisseur (ERP)</label>
                    <input 
                        type="text" className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                        value={currentSupplier.code}
                        onChange={e => setCurrentSupplier({...currentSupplier, code: e.target.value})}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Email Contact</label>
                <input 
                    type="email" className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                    value={currentSupplier.contactEmail}
                    onChange={e => setCurrentSupplier({...currentSupplier, contactEmail: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Statut Homologation</label>
                <select 
                    className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                    value={currentSupplier.status}
                    onChange={e => setCurrentSupplier({...currentSupplier, status: e.target.value as any})}
                >
                    <option value="Pending">En attente / Test</option>
                    <option value="Approved">Homologué / Actif</option>
                    <option value="Blacklisted">Bloqué</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Certifications & Labels</label>
                <div className="flex gap-2">
                    {['IFS', 'BRC', 'ISO 22000', 'Bio', 'HACCP'].map(c => (
                        <button
                            key={c}
                            onClick={() => toggleCert(c)}
                            className={`px-3 py-1 text-xs rounded-full border ${currentSupplier.certification.includes(c) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded border border-slate-100 mt-2">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Documents & Certificats Joints</label>
                    <label className="text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1 rounded cursor-pointer">
                        + Ajouter Doc
                        <input type="file" onChange={handleDocUpload} className="hidden" />
                    </label>
                </div>
                {currentSupplier.documents.length === 0 ? <p className="text-xs text-slate-400 italic">Aucun document.</p> : (
                    <ul className="space-y-2">
                        {currentSupplier.documents.map((doc, idx) => (
                            <li key={doc.id} className="flex items-center gap-2 text-xs">
                                <span className="text-lg">📄</span>
                                <input 
                                    type="text" value={doc.name} placeholder="Nom du document"
                                    className="bg-white border border-slate-300 rounded p-1 w-full text-slate-900"
                                    onChange={(e) => {
                                        const newDocs = [...currentSupplier.documents];
                                        newDocs[idx].name = e.target.value;
                                        setCurrentSupplier({...currentSupplier, documents: newDocs});
                                    }}
                                />
                                <select 
                                    className="bg-white border border-slate-300 rounded p-1 text-slate-900"
                                    value={doc.type}
                                    onChange={(e) => {
                                        const newDocs = [...currentSupplier.documents];
                                        newDocs[idx].type = e.target.value as any;
                                        setCurrentSupplier({...currentSupplier, documents: newDocs});
                                    }}
                                >
                                    <option value="Certificate">Certificat</option>
                                    <option value="Specs">Contrat</option>
                                    <option value="Other">Autre</option>
                                </select>
                                <input 
                                    type="date" value={doc.date}
                                    className="bg-white border border-slate-300 rounded p-1 text-slate-900"
                                    onChange={(e) => {
                                        const newDocs = [...currentSupplier.documents];
                                        newDocs[idx].date = e.target.value;
                                        setCurrentSupplier({...currentSupplier, documents: newDocs});
                                    }}
                                />
                                {doc.url && doc.url !== '#' && (
                                    <a href={doc.url} download={doc.name} className="text-blue-500 hover:text-blue-700 px-1" title="Télécharger">⬇️</a>
                                )}
                                <button 
                                    onClick={() => setCurrentSupplier({...currentSupplier, documents: currentSupplier.documents.filter(d => d.id !== doc.id)})}
                                    className="text-red-400 hover:text-red-600 px-2"
                                >×</button>
                            </li>
                        ))}
                    </ul>
                )}
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
            <div>
                <h2 className="font-bold text-slate-700">Référentiel Fournisseurs (SRM)</h2>
                <p className="text-xs text-slate-500">Gérez vos sources d'approvisionnement et statuts qualité.</p>
            </div>
            <button onClick={handleNew} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 shadow-sm">+ Ajouter</button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Nom</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">Certs</th>
                        <th className="px-4 py-3 text-center">Docs</th>
                        <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {suppliers.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 group">
                            <td className="px-4 py-3 font-mono text-slate-500 text-xs">{s.code}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                            <td className="px-4 py-3 text-slate-600">{s.contactEmail}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                                    s.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                    s.status === 'Blacklisted' ? 'bg-red-100 text-red-700 border-red-200' :
                                    'bg-orange-100 text-orange-700 border-orange-200'
                                }`}>
                                    {s.status}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex gap-1">
                                    {s.certification.map(c => (
                                        <span key={c} className="text-[10px] bg-slate-100 px-1 rounded border border-slate-200">{c}</span>
                                    ))}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-400 text-xs">
                                {(s.documents && s.documents.length > 0) ? `📎 ${s.documents.length}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                                <button onClick={() => handleEdit(s)} className="text-teal-600 hover:text-teal-800 font-medium">Éditer</button>
                                <button onClick={() => onDeleteSupplier(s.id)} className="text-slate-400 hover:text-red-600">🗑️</button>
                            </td>
                        </tr>
                    ))}
                    {suppliers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Aucun fournisseur défini.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
};
