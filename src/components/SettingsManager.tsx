
import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { storageService } from '../services/storageService';

export const SettingsManager: React.FC = () => {
    const [settings, setSettings] = useState<UserSettings>({
        apiKey: '',
        authorName: '',
        companyName: ''
    });
    const [isSaved, setIsSaved] = useState(false);
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await storageService.getSettings();
            setSettings(data);
        };
        load();
    }, []);

    const handleSave = async () => {
        await storageService.saveSettings(settings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <div className="max-w-3xl mx-auto pb-12">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 mb-6">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Paramètres & Configuration</h2>
                <p className="text-slate-500 text-lg">Gérez vos préférences et votre connexion aux services IA.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                
                {/* SECTION API KEY */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-2xl">🔑</span>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Clé API Google Gemini</h3>
                            <p className="text-xs text-slate-500">Nécessaire pour l'autocomplétion IA et l'import intelligent.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded border border-blue-100 text-sm text-blue-800">
                            <strong>Pourquoi une clé API ?</strong><br/>
                            Pour utiliser les fonctions d'intelligence artificielle (génération d'ingrédients, analyse de PDF), 
                            VisiPLM a besoin de se connecter à Google Gemini. La clé est stockée uniquement dans votre navigateur (LocalStorage).
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Votre Clé API (commence par "AIza...")</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type={showKey ? "text" : "password"}
                                        className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900 focus:ring-2 focus:ring-teal-500"
                                        placeholder="Collez votre clé ici..."
                                        value={settings.apiKey}
                                        onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                                    />
                                    <button 
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-sm"
                                    >
                                        {showKey ? "Masquer" : "Voir"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <a 
                                href="https://aistudio.google.com/app/apikey" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-teal-600 hover:underline font-medium flex items-center gap-1"
                            >
                                ↗️ Obtenir une clé Gemini gratuite sur Google AI Studio
                            </a>
                        </div>
                    </div>
                </div>

                {/* SECTION PROFIL */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <span className="text-2xl">👤</span>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Profil Utilisateur</h3>
                            <p className="text-xs text-slate-500">Ces informations apparaîtront sur vos fiches techniques et rapports.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom / Auteur</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                                placeholder="Ex: Jean Dupont"
                                value={settings.authorName}
                                onChange={(e) => setSettings({...settings, authorName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Société</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
                                placeholder="Ex: Ma Super Food Tech"
                                value={settings.companyName}
                                onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                {/* ACTION SAVE */}
                <div className="flex justify-end pt-4">
                    <button 
                        onClick={handleSave}
                        className={`px-8 py-3 rounded text-white font-bold transition-all ${isSaved ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-700'}`}
                    >
                        {isSaved ? 'Paramètres Enregistrés !' : 'Enregistrer les modifications'}
                    </button>
                </div>

            </div>
        </div>
    );
};
