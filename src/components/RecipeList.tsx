
import React, { useState } from 'react';
import { Recipe, RecipeStatus } from '../types';

interface RecipeListProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onCreateRecipe: () => void;
  onDeleteRecipe: (id: string) => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({ recipes, onSelectRecipe, onCreateRecipe, onDeleteRecipe }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const getStatusColor = (status: RecipeStatus) => {
    switch(status) {
        case RecipeStatus.VALIDATED: return 'bg-green-100 text-green-700 border-green-200';
        case RecipeStatus.IN_DEV: return 'bg-blue-100 text-blue-700 border-blue-200';
        case RecipeStatus.ARCHIVED: return 'bg-slate-100 text-slate-500 border-slate-200';
        default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getPlaceholderColor = (name: string) => {
      const colors = ['bg-red-50', 'bg-blue-50', 'bg-green-50', 'bg-orange-50', 'bg-purple-50', 'bg-teal-50'];
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
  };

  // Filtrage et Tri
  const filteredRecipes = recipes
    .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  // Fonction dédiée pour gérer la suppression sans ambigüité
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation(); // Arrête la remontée de l'événement
      onDeleteRecipe(id);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-slate-200 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Mes Recettes</h2>
                <p className="text-slate-500 text-sm">Gérez votre portefeuille de produits.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <input 
                        type="text" 
                        placeholder="Rechercher une recette..." 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                </div>
                <button 
                    onClick={onCreateRecipe}
                    className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 shadow-sm flex items-center gap-2 font-medium whitespace-nowrap"
                >
                    + Créer
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map(recipe => (
                <div 
                    key={recipe.id} 
                    className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col group"
                >
                    {/* ZONE 1 : VISUEL (Cliquable -> Ouvrir) */}
                    <div 
                        className={`h-32 w-full ${getPlaceholderColor(recipe.name)} flex items-center justify-center relative bg-cover bg-center cursor-pointer`}
                        onClick={() => onSelectRecipe(recipe)}
                    >
                        {recipe.images && recipe.images.length > 0 ? (
                            <img src={recipe.images[0]} alt={recipe.name} className="w-full h-full object-cover" />
                        ) : recipe.imageUrl ? (
                             <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-4xl opacity-20">🍴</div>
                        )}
                        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded border ${getStatusColor(recipe.status)} bg-white/90`}>
                            {recipe.status}
                        </span>
                    </div>
                    
                    {/* ZONE 2 : CONTENU (Cliquable -> Ouvrir) */}
                    <div 
                        className="p-4 flex-1 flex flex-col cursor-pointer"
                        onClick={() => onSelectRecipe(recipe)}
                    >
                        <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-teal-600 transition-colors">
                                {recipe.name}
                             </h3>
                             <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">v{recipe.version}</span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                            {recipe.description || "Aucune description."}
                        </p>
                    </div>

                    {/* ZONE 3 : PIED DE PAGE (Non Cliquable -> Actions) */}
                    <div className="px-4 pb-4 pt-2 border-t border-slate-50 flex justify-between items-center bg-white cursor-default">
                         <div className="text-xs text-slate-400">
                            MAJ: {new Date(recipe.updatedAt || 0).toLocaleDateString()}
                         </div>
                         
                         <button 
                            type="button"
                            className="text-xs bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded transition-colors font-medium flex items-center gap-1 z-10"
                            onClick={(e) => handleDeleteClick(e, recipe.id)}
                        >
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>
            ))}
            
            {/* Carte d'ajout (visible seulement si pas de recherche) */}
            {!searchQuery && (
                <div 
                    onClick={onCreateRecipe}
                    className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center h-64 text-slate-400 hover:bg-slate-100 hover:border-teal-400 hover:text-teal-500 cursor-pointer transition-colors"
                >
                    <div className="text-4xl mb-2">+</div>
                    <div className="font-medium">Créer une recette</div>
                </div>
            )}
            
            {filteredRecipes.length === 0 && searchQuery && (
                <div className="col-span-full py-12 text-center text-slate-400 italic">
                    Aucune recette ne correspond à votre recherche "{searchQuery}".
                </div>
            )}
        </div>
    </div>
  );
};
