
import React, { useState } from 'react';
import { Project, Recipe, ProjectStatus, HaccpRisk } from '../types';
import { calculateFormulation, formatCurrency } from '../services/calculationService';
import { compressImage } from '../services/imageService';

interface ProjectManagerProps {
    projects: Project[];
    recipes: Recipe[];
    onUpdateProject: (p: Project) => void;
    onAddProject: (p: Project) => void;
    onDeleteProject: (id: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, recipes, onUpdateProject, onAddProject, onDeleteProject }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'trials' | 'haccp' | 'samples' | 'lab'>('overview');
    const [newCollab, setNewCollab] = useState('');

    // Creation Modal
    const handleNewProject = () => {
        const newP: Project = {
            id: Date.now().toString(),
            name: 'Nouveau Projet',
            client: 'Interne',
            deadline: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0], // J+90
            status: 'Idea',
            description: '',
            collaborators: [],
            linkedRecipeIds: [],
            haccp: [],
            samples: [],
            sensoryTests: [],
            shelfLifeTests: [],
            tasks: []
        };
        onAddProject(newP);
        setSelectedProjectId(newP.id);
    };

    const currentProject = projects.find(p => p.id === selectedProjectId);

    const getStatusColor = (status: ProjectStatus) => {
        switch(status) {
            case 'Idea': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Feasibility': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Development': return 'bg-teal-100 text-teal-700 border-teal-200';
            case 'Validation': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Industrialization': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'Launched': return 'bg-green-100 text-green-700 border-green-200';
            case 'Cancelled': return 'bg-slate-200 text-slate-500 border-slate-300';
            default: return 'bg-gray-100';
        }
    };

    // Calculate Real Progress
    const calculateProgress = (p: Project) => {
        let score = 0;
        // 1. Tâches (40%)
        if (p.tasks.length > 0) {
            score += (p.tasks.filter(t => t.done).length / p.tasks.length) * 40;
        }
        // 2. HACCP Validé (30%) - Tous les risques doivent être validés
        if (p.haccp.length > 0 && p.haccp.every(h => h.validated)) {
            score += 30;
        }
        // 3. Echantillons Approuvés (15%) - Au moins un
        if (p.samples.some(s => s.status === 'Approved')) {
            score += 15;
        }
        // 4. Tests Sensoriels (15%) - Au moins un réalisé
        if (p.sensoryTests.length > 0) {
            score += 15;
        }
        return Math.min(100, Math.round(score));
    };

    const addCollaborator = () => {
        if (!newCollab.trim() || !currentProject) return;
        const updated = [...(currentProject.collaborators || []), newCollab.trim()];
        onUpdateProject({...currentProject, collaborators: updated});
        setNewCollab('');
    };

    const removeCollaborator = (index: number) => {
        if (!currentProject) return;
        const updated = [...(currentProject.collaborators || [])];
        updated.splice(index, 1);
        onUpdateProject({...currentProject, collaborators: updated});
    };

    const handleArchive = () => {
        if (!currentProject) return;
        if(window.confirm('Archiver ce projet ? Il passera en statut "Cancelled" et ne sera plus prioritaire.')) {
            onUpdateProject({...currentProject, status: 'Cancelled'});
            setSelectedProjectId(null);
        }
    }

    // Alerte HACCP si statut avancé mais validation manquante
    const showHaccpAlert = currentProject && 
        ['Validation', 'Industrialization', 'Launched'].includes(currentProject.status) &&
        (currentProject.haccp.length === 0 || !currentProject.haccp.every(h => h.validated));

    // SUB-COMPONENTS
    const TrialsTab = ({ project }: { project: Project }) => (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700">Essais & Recettes Liés</h3>
                <select 
                    className="text-sm border border-slate-300 rounded p-2 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => {
                        if(e.target.value) onUpdateProject({...project, linkedRecipeIds: [...project.linkedRecipeIds, e.target.value]});
                        e.target.value = '';
                    }}
                >
                    <option value="">+ Lier une recette existante</option>
                    {recipes.filter(r => !project.linkedRecipeIds.includes(r.id)).map(r => (
                        <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>
                    ))}
                </select>
            </div>
            {project.linkedRecipeIds.length === 0 ? <p className="text-slate-400 text-sm italic">Aucune recette liée à ce projet.</p> : (
                <div className="grid gap-3">
                    {project.linkedRecipeIds.map(rid => {
                        const rec = recipes.find(r => r.id === rid);
                        return rec ? (
                            <div key={rid} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded shadow-sm hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => window.alert(`Pour modifier la recette ${rec.name}, retournez au menu "Mes Recettes".`)}>
                                <div>
                                    <div className="font-bold text-slate-800">{rec.name}</div>
                                    <div className="text-xs text-slate-500">Version {rec.version} - {rec.status}</div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateProject({...project, linkedRecipeIds: project.linkedRecipeIds.filter(id => id !== rid)}); }}
                                    className="text-red-400 hover:text-red-600 font-medium text-sm"
                                >Délier</button>
                            </div>
                        ) : null;
                    })}
                </div>
            )}
        </div>
    );

    const HaccpTab = ({ project }: { project: Project }) => {
        const addRisk = (type: HaccpRisk['type']) => {
            const newRisk: HaccpRisk = { type, description: '', controlMeasure: '', validated: false };
            onUpdateProject({...project, haccp: [...project.haccp, newRisk]});
        };

        const updateRisk = (index: number, field: keyof HaccpRisk, value: any) => {
            const newHaccp = [...project.haccp];
            newHaccp[index] = { ...newHaccp[index], [field]: value };
            onUpdateProject({...project, haccp: newHaccp});
        };

        const removeRisk = (index: number) => {
            onUpdateProject({...project, haccp: project.haccp.filter((_, i) => i !== index)});
        };

        const isFullyValidated = project.haccp.length > 0 && project.haccp.every(h => h.validated);

        return (
            <div className="space-y-6">
                <div className={`p-4 border rounded text-sm mb-4 flex justify-between items-center ${isFullyValidated ? 'bg-green-50 border-green-200 text-green-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                    <div>
                        <strong>Validation HACCP :</strong> {isFullyValidated ? "Complète. Le projet peut passer en Industrialisation." : "Incomplète. Identifiez et validez tous les risques avant l'industrialisation."}
                    </div>
                    {isFullyValidated && <span className="text-xl">✅</span>}
                </div>
                
                <div className="flex gap-2 mb-4">
                    {['Biological', 'Chemical', 'Physical', 'Allergen'].map(type => (
                        <button key={type} onClick={() => addRisk(type as any)} className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50 font-medium shadow-sm">+ {type}</button>
                    ))}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-3">Type</th>
                                <th className="p-3 w-1/3">Danger Description</th>
                                <th className="p-3 w-1/3">Mesure de Maîtrise (PRP/CCP)</th>
                                <th className="p-3 text-center">Validé</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {project.haccp.map((risk, idx) => (
                                <tr key={idx} className="bg-white hover:bg-slate-50">
                                    <td className="p-3 font-bold text-slate-700">{risk.type}</td>
                                    <td className="p-3">
                                        <input 
                                            className="w-full border border-slate-200 rounded px-2 py-1 bg-white text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" 
                                            value={risk.description} 
                                            onChange={e => updateRisk(idx, 'description', e.target.value)} 
                                            placeholder="Ex: Contamination salmonelle..." 
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input 
                                            className="w-full border border-slate-200 rounded px-2 py-1 bg-white text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" 
                                            value={risk.controlMeasure} 
                                            onChange={e => updateRisk(idx, 'controlMeasure', e.target.value)} 
                                            placeholder="Ex: Cuisson > 72°C..." 
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                            checked={risk.validated} 
                                            onChange={e => updateRisk(idx, 'validated', e.target.checked)} 
                                        />
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => removeRisk(idx)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const SamplesTab = ({ project }: { project: Project }) => {
        const addSample = () => {
            const newS = { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], clientName: project.client !== 'Interne' ? project.client : '', recipeVersion: '', status: 'Sent' as const };
            onUpdateProject({...project, samples: [...project.samples, newS]});
        };
        
        return (
            <div>
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-slate-700">Suivi des envois clients</h3>
                    <button onClick={addSample} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 shadow-sm">+ Nouvel Envoi</button>
                </div>
                <div className="grid gap-4">
                    {project.samples.map((s, idx) => (
                        <div key={s.id} className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-3">
                                <div className="grid grid-cols-2 gap-3 flex-1">
                                    <input 
                                        type="date" 
                                        className="text-sm border border-slate-300 rounded p-2 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" 
                                        value={s.date} 
                                        onChange={e => {const ns=[...project.samples]; ns[idx].date=e.target.value; onUpdateProject({...project, samples: ns})}} 
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Destinataire (Client)" 
                                        className="text-sm border border-slate-300 rounded p-2 font-bold bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" 
                                        value={s.clientName} 
                                        onChange={e => {const ns=[...project.samples]; ns[idx].clientName=e.target.value; onUpdateProject({...project, samples: ns})}} 
                                    />
                                </div>
                                <select 
                                    className="text-xs border border-slate-300 rounded p-2 bg-white text-slate-900 font-medium" 
                                    value={s.status} 
                                    onChange={e => {const ns=[...project.samples]; ns[idx].status=e.target.value as any; onUpdateProject({...project, samples: ns})}}
                                >
                                    <option value="Sent">Envoyé 📤</option>
                                    <option value="Received">Reçu 📥</option>
                                    <option value="Approved">Validé ✅</option>
                                    <option value="Rejected">Refusé ❌</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Tracking #" 
                                    className="text-xs border border-slate-300 rounded p-2 bg-white text-slate-900 focus:ring-1 focus:ring-blue-500" 
                                    value={s.trackingNumber || ''} 
                                    onChange={e => {const ns=[...project.samples]; ns[idx].trackingNumber=e.target.value; onUpdateProject({...project, samples: ns})}} 
                                />
                                <select 
                                    className="text-xs border border-slate-300 rounded p-2 bg-white text-slate-900 focus:ring-1 focus:ring-blue-500" 
                                    value={s.recipeVersion} 
                                    onChange={e => {const ns=[...project.samples]; ns[idx].recipeVersion=e.target.value; onUpdateProject({...project, samples: ns})}} 
                                >
                                    <option value="">-- Version Recette --</option>
                                    {project.linkedRecipeIds.map(rid => {
                                        const r = recipes.find(recipe => recipe.id === rid);
                                        return r ? <option key={rid} value={r.version}>{r.name} (v{r.version})</option> : null;
                                    })}
                                </select>
                            </div>
                            <textarea 
                                placeholder="Feedback Client..." 
                                className="text-xs border border-slate-300 rounded p-2 h-16 resize-none bg-white text-slate-900 focus:ring-1 focus:ring-blue-500" 
                                value={s.feedback || ''} 
                                onChange={e => {const ns=[...project.samples]; ns[idx].feedback=e.target.value; onUpdateProject({...project, samples: ns})}} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const LabTab = ({ project }: { project: Project }) => {
        // UPDATED: WITH COMPRESSION
        const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, testIndex: number, checkpointIndex: number) => {
            if (e.target.files && e.target.files[0]) {
                try {
                    const file = e.target.files[0];
                    const compressed = await compressImage(file); // Compress
                    const newTests = [...project.shelfLifeTests];
                    newTests[testIndex].checkpoints[checkpointIndex].photo = compressed;
                    onUpdateProject({ ...project, shelfLifeTests: newTests });
                } catch (error) {
                    console.error("Compression failed", error);
                    alert("Erreur lors de l'ajout de la photo");
                }
            }
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-slate-700">👅 Tests Sensoriels</h4>
                        <button onClick={() => onUpdateProject({...project, sensoryTests: [...project.sensoryTests, {id: Date.now().toString(), date: '', type: 'Hedonic', panelSize: 0, resultSummary: ''}]})} className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300 font-bold">+</button>
                    </div>
                    <div className="space-y-3">
                        {project.sensoryTests.map((t, idx) => (
                            <div key={t.id} className="text-sm bg-slate-50 p-3 rounded border border-slate-200">
                                <div className="flex gap-2 mb-2">
                                    <select 
                                        value={t.type} 
                                        onChange={e => {const nt=[...project.sensoryTests]; nt[idx].type=e.target.value as any; onUpdateProject({...project, sensoryTests: nt})}} 
                                        className="text-xs font-bold bg-white border border-slate-300 rounded p-1 text-slate-900"
                                    >
                                        <option value="Hedonic">Hédonique</option>
                                        <option value="Triangle">Triangulaire</option>
                                    </select>
                                    <input 
                                        type="date" 
                                        value={t.date} 
                                        onChange={e => {const nt=[...project.sensoryTests]; nt[idx].date=e.target.value; onUpdateProject({...project, sensoryTests: nt})}} 
                                        className="text-xs bg-white border border-slate-300 rounded p-1 text-slate-900" 
                                    />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Résultat (ex: Note 7/10)" 
                                    value={t.resultSummary} 
                                    onChange={e => {const nt=[...project.sensoryTests]; nt[idx].resultSummary=e.target.value; onUpdateProject({...project, sensoryTests: nt})}} 
                                    className="w-full text-xs border border-slate-300 rounded p-2 bg-white text-slate-900" 
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-slate-700">⏳ Vieillissement (DLC)</h4>
                        <button onClick={() => onUpdateProject({...project, shelfLifeTests: [...project.shelfLifeTests, {id: Date.now().toString(), startDate: '', duration: '', temperature: '', checkpoints: []}]})} className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300 font-bold">+</button>
                    </div>
                    <div className="space-y-3">
                        {project.shelfLifeTests.map((t, idx) => (
                            <div key={t.id} className="text-sm bg-slate-50 p-3 rounded border border-slate-200">
                                <div className="flex gap-2 mb-2 items-center">
                                    <span className="text-xs font-bold text-slate-600">Début:</span>
                                    <input 
                                        type="date" 
                                        value={t.startDate} 
                                        onChange={e => {const nt=[...project.shelfLifeTests]; nt[idx].startDate=e.target.value; onUpdateProject({...project, shelfLifeTests: nt})}} 
                                        className="text-xs bg-white border border-slate-300 rounded p-1 text-slate-900 w-28" 
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Durée" 
                                        value={t.duration} 
                                        onChange={e => {const nt=[...project.shelfLifeTests]; nt[idx].duration=e.target.value; onUpdateProject({...project, shelfLifeTests: nt})}} 
                                        className="text-xs bg-white border border-slate-300 rounded p-1 text-slate-900 w-20" 
                                    />
                                </div>
                                <div className="space-y-2 mt-2">
                                    {t.checkpoints.length === 0 && <span className="text-xs text-slate-400 italic">Aucun point de contrôle</span>}
                                    {t.checkpoints.map((cp, cpidx) => (
                                        <div key={cpidx} className="flex items-center gap-2 bg-white p-1 rounded border border-slate-200">
                                            <span className={`text-[10px] px-2 py-1 rounded border font-medium whitespace-nowrap ${cp.result === 'Pass' ? 'bg-green-100 border-green-300 text-green-700' : cp.result === 'Fail' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-300 text-gray-600'}`}>J+{cp.day}</span>
                                            <input 
                                                className="text-xs bg-transparent border-none p-0 flex-1 focus:ring-0" 
                                                placeholder="Commentaire..." 
                                                value={cp.comment || ''}
                                                onChange={e => {const nt=[...project.shelfLifeTests]; nt[idx].checkpoints[cpidx].comment=e.target.value; onUpdateProject({...project, shelfLifeTests: nt})}}
                                            />
                                            <label className="cursor-pointer text-lg">
                                                {cp.photo ? '📷' : '➕'}
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, idx, cpidx)} />
                                            </label>
                                            <select 
                                                className="text-[10px] bg-slate-100 rounded border-none p-1 w-16"
                                                value={cp.result}
                                                onChange={e => {const nt=[...project.shelfLifeTests]; nt[idx].checkpoints[cpidx].result=e.target.value as any; onUpdateProject({...project, shelfLifeTests: nt})}}
                                            >
                                                <option value="Pending">?</option>
                                                <option value="Pass">OK</option>
                                                <option value="Fail">NOK</option>
                                            </select>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const day = prompt("Jour de contrôle (ex: 15)");
                                        if(day) {
                                            const nt=[...project.shelfLifeTests]; 
                                            nt[idx].checkpoints.push({day: parseInt(day), result: 'Pending'});
                                            onUpdateProject({...project, shelfLifeTests: nt});
                                        }
                                    }} className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-100 text-slate-600 shadow-sm w-full">+ Point de contrôle</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // MAIN RENDER
    if (!selectedProjectId) {
        return (
            <div className="h-full flex flex-col space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Gestion de Projets R&D</h2>
                        <p className="text-slate-500 text-sm">Suivez le développement de l'idée au lancement.</p>
                    </div>
                    <button onClick={handleNewProject} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm flex items-center gap-2 font-medium">+ Nouveau Projet</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => {
                        const progress = calculateProgress(p);
                        return (
                            <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-indigo-300 group">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold border ${getStatusColor(p.status)}`}>{p.status}</span>
                                    <span className="text-xs text-slate-400">{new Date(p.deadline).toLocaleDateString()}</span>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-600">{p.name}</h3>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{p.description || "Pas de description"}</p>
                                
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                                    <div className={`h-2 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{width: `${progress}%`}}></div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Progression: {progress}%</span>
                                    <span>{p.linkedRecipeIds.length} recettes</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (!currentProject) return null;

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden tech-sheet-print">
            {/* ALERTE VISUELLE PERSISTANTE SI HACCP NON VALIDE MAIS PROJET AVANCÉ */}
            {showHaccpAlert && (
                <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 animate-pulse">
                    ⚠️ ATTENTION : Projet en phase avancée ({currentProject.status}) mais risques HACCP non validés !
                </div>
            )}

            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                <div className="flex items-center gap-4 w-full">
                    <button onClick={() => setSelectedProjectId(null)} className="text-slate-400 hover:text-indigo-600 font-bold text-xl no-print">←</button>
                    <div className="flex-1">
                        <input 
                            type="text" 
                            className="text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-slate-800 w-full placeholder-slate-400" 
                            value={currentProject.name} 
                            onChange={(e) => onUpdateProject({...currentProject, name: e.target.value})} 
                        />
                        <div className="flex gap-4 mt-2 text-sm text-slate-500 items-center">
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                                👤 <input className="bg-transparent border-none p-0 w-32 text-slate-700 text-xs focus:ring-0" value={currentProject.client} onChange={e => onUpdateProject({...currentProject, client: e.target.value})} />
                            </div>
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                                📅 <input type="date" className="bg-transparent border-none p-0 text-slate-700 text-xs focus:ring-0" value={currentProject.deadline} onChange={e => onUpdateProject({...currentProject, deadline: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 pl-4 no-print">
                    <button 
                        onClick={() => window.print()}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs hover:bg-indigo-100 font-medium whitespace-nowrap"
                    >
                        📄 Rapport Synthèse
                    </button>
                    <select 
                        className={`text-sm font-bold border rounded px-3 py-1.5 cursor-pointer ${getStatusColor(currentProject.status)}`}
                        value={currentProject.status}
                        onChange={(e) => {
                            const newStatus = e.target.value as ProjectStatus;
                            // Validation HACCP Bloquante pour Industrialisation
                            if (['Industrialization', 'Launched'].includes(newStatus)) {
                                if (currentProject.haccp.length === 0 || !currentProject.haccp.every(h => h.validated)) {
                                    alert("⛔ BLOCAGE QUALITÉ : Impossible de passer en Industrialisation.\nTous les risques HACCP doivent être identifiés et validés.");
                                    return;
                                }
                            }
                            onUpdateProject({...currentProject, status: newStatus});
                        }}
                    >
                        {['Idea', 'Feasibility', 'Development', 'Validation', 'Industrialization', 'Launched', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={handleArchive} className="text-orange-400 hover:text-orange-600 p-2" title="Archiver (Statut Annulé)">🗃️</button>
                    <button onClick={() => {if(window.confirm('Supprimer définitivement ce projet ?')) {onDeleteProject(currentProject.id); setSelectedProjectId(null);}}} className="text-slate-400 hover:text-red-500 p-2" title="Supprimer">🗑️</button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 gap-6 overflow-x-auto no-print">
                {[
                    {id: 'overview', label: 'Vue d\'ensemble'},
                    {id: 'trials', label: 'Essais & Recettes'},
                    {id: 'haccp', label: 'Risques HACCP'},
                    {id: 'samples', label: 'Échantillons'},
                    {id: 'lab', label: 'Labo & Senso'}
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 print-break-inside-avoid">
                {activeTab === 'overview' && (
                    <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description / Brief</label>
                            <textarea 
                                className="w-full h-32 p-3 border border-slate-300 rounded bg-white text-slate-900 text-sm mb-6 shadow-sm focus:ring-2 focus:ring-indigo-500" 
                                value={currentProject.description} 
                                onChange={e => onUpdateProject({...currentProject, description: e.target.value})} 
                            />
                            
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Objectifs Financiers</label>
                            <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-center justify-between mb-6">
                                <div>
                                    <div className="text-xs text-slate-500">Coût Cible (Target Cost)</div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            className="text-xl font-bold text-slate-800 w-24 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:ring-0 p-0" 
                                            value={currentProject.targetCost || ''} 
                                            placeholder="0.00"
                                            onChange={e => onUpdateProject({...currentProject, targetCost: parseFloat(e.target.value)})}
                                        />
                                        <span className="text-slate-400">€/kg</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500">Coût Actuel (Moy. essais)</div>
                                    <div className="text-xl font-bold text-slate-400">
                                        -- €/kg
                                    </div>
                                    <div className="text-[10px] text-slate-400 italic">Voir onglet Recettes</div>
                                </div>
                            </div>

                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Équipe Projet</label>
                            <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {(currentProject.collaborators || []).map((collab, i) => (
                                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                                            {collab}
                                            <button onClick={() => removeCollaborator(i)} className="hover:text-red-500 font-bold">×</button>
                                        </span>
                                    ))}
                                    {(currentProject.collaborators || []).length === 0 && <span className="text-xs text-slate-400 italic">Aucun collaborateur</span>}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <input 
                                        type="text" 
                                        className="text-xs border border-slate-300 rounded px-2 py-1 flex-1 bg-white text-slate-900"
                                        placeholder="Nom du collaborateur..."
                                        value={newCollab}
                                        onChange={(e) => setNewCollab(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCollaborator()}
                                    />
                                    <button onClick={addCollaborator} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded border border-slate-300">+</button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tâches & Jalons</label>
                            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                                {currentProject.tasks.map((task, idx) => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <input type="checkbox" checked={task.done} onChange={e => {const newTasks=[...currentProject.tasks]; newTasks[idx].done=e.target.checked; onUpdateProject({...currentProject, tasks: newTasks})}} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                        <input type="text" value={task.text} onChange={e => {const newTasks=[...currentProject.tasks]; newTasks[idx].text=e.target.value; onUpdateProject({...currentProject, tasks: newTasks})}} className={`flex-1 bg-transparent border-none focus:ring-0 text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-800'}`} />
                                        <button onClick={() => onUpdateProject({...currentProject, tasks: currentProject.tasks.filter(t => t.id !== task.id)})} className="text-slate-300 hover:text-red-500">×</button>
                                    </div>
                                ))}
                                <button onClick={() => onUpdateProject({...currentProject, tasks: [...currentProject.tasks, {id: Date.now().toString(), text: 'Nouvelle tâche', done: false}]})} className="w-full py-2 text-xs text-indigo-600 font-bold hover:bg-indigo-50 text-center bg-slate-50">+ Ajouter une tâche</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'trials' && <TrialsTab project={currentProject} />}
                {activeTab === 'haccp' && <HaccpTab project={currentProject} />}
                {activeTab === 'samples' && <SamplesTab project={currentProject} />}
                {activeTab === 'lab' && <LabTab project={currentProject} />}
            </div>
        </div>
    );
};
