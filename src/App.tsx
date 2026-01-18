
import React, { useState, useEffect } from 'react';
import { Ingredient, Recipe, Packaging, Supplier, RecipeStatus, Project } from './types';
import { IngredientManager } from './components/IngredientManager';
import { PackagingManager } from './components/PackagingManager';
import { RecipeFormulator } from './components/RecipeFormulator';
import { RecipeList } from './components/RecipeList';
import { UserGuide } from './components/UserGuide';
import { SupplierManager } from './components/SupplierManager';
import { SettingsManager } from './components/SettingsManager';
import { ProjectManager } from './components/ProjectManager'; // NOUVEAU
import { storageService } from './services/storageService';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'packagings' | 'recipes' | 'suppliers' | 'projects' | 'guide' | 'settings'>('recipes');
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State (Remplacement des alertes natives)
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  // États de données
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [projects, setProjects] = useState<Project[]>([]); // NOUVEAU
  
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      setToast({ message, type });
  };

  const closeConfirm = () => setConfirmModal(null);

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [loadedIng, loadedPack, loadedRecipes, loadedSuppliers, loadedProjects] = await Promise.all([
            storageService.getIngredients(),
            storageService.getPackagings(),
            storageService.getRecipes(),
            storageService.getSuppliers(),
            storageService.getProjects()
        ]);
        
        setIngredients(loadedIng);
        setPackagings(loadedPack);
        setRecipes(loadedRecipes);
        setSuppliers(loadedSuppliers);
        setProjects(loadedProjects);
      } catch (error) {
        console.error("Erreur de chargement des données:", error);
        showToast("Impossible de charger les données.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Handlers CRUD de base
  const handleAddIngredient = async (ing: Ingredient) => {
    const newData = [...ingredients, ing];
    setIngredients(newData); 
    await storageService.saveIngredients(newData);
    showToast("Ingrédient ajouté", "success");
  };

  const handleUpdateIngredient = async (ing: Ingredient) => {
    const newData = ingredients.map(i => i.id === ing.id ? ing : i);
    setIngredients(newData);
    await storageService.saveIngredients(newData);
    showToast("Ingrédient mis à jour", "success");
  };

  const handleDeleteIngredient = async (id: string) => {
      // Impact Analysis logic moved to IngredientManager but checking usage here for safety
      const usedInRecipes = recipes.filter(r => r.items.some(i => i.ingredientId === id));
      
      // La modale de confirmation détaillée est gérée dans IngredientManager s'il y a des projets
      // Ici c'est la sécurité de base
      
      const newData = ingredients.filter(i => i.id !== id);
      setIngredients(newData);
      await storageService.saveIngredients(newData);
      showToast("Ingrédient supprimé", "success");
  };

  const handleAddPackaging = async (p: Packaging) => {
    const newData = [...packagings, p];
    setPackagings(newData);
    await storageService.savePackagings(newData);
    showToast("Emballage ajouté", "success");
  };

  const handleUpdatePackaging = async (p: Packaging) => {
    const newData = packagings.map(old => old.id === p.id ? p : old);
    setPackagings(newData);
    await storageService.savePackagings(newData);
    showToast("Emballage mis à jour", "success");
  };

  const handleDeletePackaging = async (id: string) => {
      const usedInRecipes = recipes.filter(r => r.packagingItems.some(p => p.packagingId === id));
      if (usedInRecipes.length > 0) {
          showToast(`Impossible : utilisé dans ${usedInRecipes.length} recette(s).`, "error");
          return;
      }

      setConfirmModal({
          isOpen: true,
          message: "Confirmer la suppression de cet emballage ?",
          onConfirm: async () => {
              const newData = packagings.filter(p => p.id !== id);
              setPackagings(newData);
              await storageService.savePackagings(newData);
              showToast("Emballage supprimé", "success");
              closeConfirm();
          }
      });
  };

  const handleAddSupplier = async (s: Supplier) => {
      const newData = [...suppliers, s];
      setSuppliers(newData);
      await storageService.saveSuppliers(newData);
      showToast("Fournisseur ajouté", "success");
  };

  const handleUpdateSupplier = async (s: Supplier) => {
      const newData = suppliers.map(old => old.id === s.id ? s : old);
      setSuppliers(newData);
      await storageService.saveSuppliers(newData);
      showToast("Fournisseur mis à jour", "success");
  };

  const handleDeleteSupplier = async (id: string) => {
      const linkedIngs = ingredients.filter(i => i.supplierId === id);
      const linkedPacks = packagings.filter(p => p.supplierId === id);
      
      if (linkedIngs.length > 0 || linkedPacks.length > 0) {
          showToast(`Impossible : utilisé par ${linkedIngs.length} ingrédient(s) et ${linkedPacks.length} emballage(s).`, "error");
          return;
      }

      setConfirmModal({
          isOpen: true,
          message: "Supprimer définitivement ce fournisseur ?",
          onConfirm: async () => {
              const newData = suppliers.filter(s => s.id !== id);
              setSuppliers(newData);
              await storageService.saveSuppliers(newData);
              showToast("Fournisseur supprimé", "success");
              closeConfirm();
          }
      });
  };

  // Handlers Recettes
  const handleCreateRecipe = async () => {
      const settings = await storageService.getSettings();
      const newRecipe: Recipe = {
          id: Date.now().toString(),
          name: 'Nouvelle Recette',
          version: '0.1',
          status: RecipeStatus.DRAFT,
          updatedAt: new Date().toISOString(),
          items: [],
          packagingItems: [],
          processSteps: [],
          qualityControls: [],
          moistureLoss: 0,
          targetBatchWeight: 0,
          laborCost: 0,
          targetMargin: 30,
          documents: [],
          images: [],
          changeLog: [{
              id: Date.now().toString(),
              date: new Date().toISOString().split('T')[0],
              version: '0.1',
              author: settings.authorName || 'User',
              comment: 'Création'
          }]
      };
      const newRecipes = [...recipes, newRecipe];
      setRecipes(newRecipes);
      await storageService.saveRecipes(newRecipes);
      setSelectedRecipeId(newRecipe.id); // Ouvre directement
  };

  const handleUpdateRecipe = async (r: Recipe) => {
      const updated = { ...r, updatedAt: new Date().toISOString() };
      const newRecipes = recipes.map(old => old.id === r.id ? updated : old);
      setRecipes(newRecipes);
      await storageService.saveRecipes(newRecipes);
  };

  const handleDeleteRecipe = async (id: string) => {
      setConfirmModal({
          isOpen: true,
          message: "Êtes-vous sûr de vouloir supprimer cette recette ?\nCette action est irréversible.",
          onConfirm: async () => {
              const newRecipes = recipes.filter(r => r.id !== id);
              setRecipes(newRecipes);
              await storageService.saveRecipes(newRecipes);
              if(selectedRecipeId === id) setSelectedRecipeId(null);
              showToast("Recette supprimée", "success");
              closeConfirm();
          }
      });
  };

  // Handlers PROJETS (NOUVEAU)
  const handleAddProject = async (p: Project) => {
      const newProjects = [...projects, p];
      setProjects(newProjects);
      await storageService.saveProjects(newProjects);
      showToast("Projet créé", "success");
  };

  const handleUpdateProject = async (p: Project) => {
      const newProjects = projects.map(old => old.id === p.id ? p : old);
      setProjects(newProjects);
      await storageService.saveProjects(newProjects);
  };

  const handleDeleteProject = async (id: string) => {
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      await storageService.saveProjects(newProjects);
      showToast("Projet supprimé", "success");
  };

  // --- IMPORT / EXPORT (BACKUP) ---
  const handleExport = () => {
      const data = {
          recipes,
          ingredients,
          packagings,
          suppliers,
          projects, // ADDED
          exportDate: new Date().toISOString(),
          version: '1.1'
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VisiPLM_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Export terminé", "success");
  };

  // FONCTION IMPORT ROBUSTE
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const text = event.target?.result as string;
              if (!text) throw new Error("Fichier vide ou illisible.");
              let data;
              try { data = JSON.parse(text); } catch (parseErr) { throw new Error("Le fichier n'est pas un JSON valide."); }

              if (!data.recipes || !data.ingredients) {
                  throw new Error("Format de fichier invalide (manque recettes ou ingrédients)");
              }

              setIsLoading(true);
              // Mise à jour complète incluant les projets
              await storageService.saveIngredients(data.ingredients);
              await storageService.savePackagings(data.packagings || []);
              await storageService.saveRecipes(data.recipes);
              await storageService.saveSuppliers(data.suppliers || []);
              await storageService.saveProjects(data.projects || []); // ADDED

              setIngredients(data.ingredients);
              setPackagings(data.packagings || []);
              setRecipes(data.recipes);
              setSuppliers(data.suppliers || []);
              setProjects(data.projects || []); // ADDED
              
              showToast(`Import réussi : ${data.recipes.length} recettes restaurées !`, "success");
              setIsLoading(false);

          } catch (err: any) {
              console.error(err);
              showToast(`Erreur Import : ${err.message}`, "error");
              setIsLoading(false);
          } finally { e.target.value = ''; }
      };
      reader.readAsText(file);
  };

  const handleResetData = async () => {
    setConfirmModal({
        isOpen: true,
        message: "ATTENTION : Toutes vos données seront effacées et remplacées par les données de démonstration.\n\nContinuer ?",
        onConfirm: async () => {
            setIsLoading(true);
            try {
                const defaults = await storageService.resetData();
                setIngredients(defaults.ingredients);
                setPackagings(defaults.packagings);
                setRecipes(defaults.recipes);
                setSuppliers(defaults.suppliers);
                setProjects(defaults.projects);
                setSelectedRecipeId(null);
                showToast("Données réinitialisées", "success");
                closeConfirm();
            } catch (e) {
                console.error(e);
                showToast("Erreur réinitialisation", "error");
            } finally {
                setIsLoading(false);
            }
        }
    });
  };

  if (isLoading) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-slate-100 flex-col gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
              <p className="text-slate-500 text-sm font-medium">Chargement des données...</p>
          </div>
      );
  }

  const activeRecipe = recipes.find(r => r.id === selectedRecipeId);

  return (
    <div className="flex h-screen bg-slate-100 relative">
      
      {/* Composants UI Globaux */}
      {confirmModal && (
          <ConfirmModal 
            isOpen={confirmModal.isOpen}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={closeConfirm}
          />
      )}
      {toast && (
          <Toast 
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <img 
                src="https://raw.githubusercontent.com/M00N69/RAPPELCONSO/main/logo%2004%20copie.jpg" 
                alt="VisiPLM"
                className="w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(45,212,191,0.3)] object-cover border border-slate-700 bg-white" 
            />
            <h1 className="text-2xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              VisiPLM
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-2 pl-1">Formulation Agro & Innovation</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {/* Menu principal */}
          <button 
            onClick={() => { setActiveTab('projects'); setSelectedRecipeId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'projects' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-indigo-200'}`}
          >
            <span className="font-bold">🚀</span>
            <span className="font-medium">Projets & Briefs</span>
          </button>

          <button 
            onClick={() => { setActiveTab('recipes'); setSelectedRecipeId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'recipes' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <span className="font-bold">🍽️</span>
            <span className="font-medium">Mes Recettes</span>
          </button>

          <button 
            onClick={() => { setActiveTab('ingredients'); setSelectedRecipeId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'ingredients' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <span className="font-bold">🥕</span>
            <span className="font-medium">Ingrédients</span>
          </button>

          <button 
            onClick={() => { setActiveTab('packagings'); setSelectedRecipeId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'packagings' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}
          >
             <span className="font-bold">📦</span>
            <span className="font-medium">Emballages</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('suppliers'); setSelectedRecipeId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'suppliers' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}
          >
             <span className="font-bold">🏭</span>
            <span className="font-medium">Fournisseurs</span>
          </button>

           <div className="pt-4 mt-4 border-t border-slate-800">
            <button 
                onClick={() => { setActiveTab('settings'); setSelectedRecipeId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
                <span className="font-bold">⚙️</span>
                <span className="font-medium">Paramètres</span>
            </button>
            <button 
                onClick={() => { setActiveTab('guide'); setSelectedRecipeId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'guide' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
                <span className="font-bold">📘</span>
                <span className="font-medium">Guide Utilisateur</span>
            </button>
           </div>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
             {/* Import / Export */}
             <div>
                 <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Sauvegarde (Package)</div>
                 <div className="flex gap-2">
                     <button 
                        onClick={handleExport}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs text-white py-1.5 rounded border border-slate-700"
                     >
                         ⬇️ Exporter
                     </button>
                     <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs text-white py-1.5 rounded border border-slate-700 text-center cursor-pointer">
                         ⬆️ Importer
                         <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                     </label>
                 </div>
             </div>

             <button 
                onClick={handleResetData}
                className="w-full text-left text-xs text-red-400 hover:text-red-300 flex items-center gap-2 pt-2 border-t border-slate-800"
             >
                 ⚠️ Réinitialiser tout
             </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-10">
        <div className="max-w-7xl mx-auto h-full">
            
            {/* VUE LISTE RECETTES */}
            {activeTab === 'recipes' && !selectedRecipeId && (
                <RecipeList 
                    recipes={recipes}
                    onSelectRecipe={(r) => setSelectedRecipeId(r.id)}
                    onCreateRecipe={handleCreateRecipe}
                    onDeleteRecipe={handleDeleteRecipe}
                />
            )}

            {/* VUE DETAIL RECETTE (FORMULATION) */}
            {activeTab === 'recipes' && selectedRecipeId && activeRecipe && (
                <RecipeFormulator 
                    recipe={activeRecipe} 
                    allIngredients={ingredients}
                    allPackagings={packagings}
                    onUpdateRecipe={handleUpdateRecipe}
                    onBack={() => setSelectedRecipeId(null)}
                />
            )}

            {/* NOUVELLE VUE PROJETS */}
            {activeTab === 'projects' && (
                <ProjectManager 
                    projects={projects}
                    recipes={recipes}
                    onAddProject={handleAddProject}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                />
            )}

            {/* AUTRES VUES */}
            {activeTab === 'ingredients' && (
                <IngredientManager 
                    ingredients={ingredients}
                    suppliers={suppliers} 
                    // Passage des recettes et projets pour l'analyse d'impact
                    recipes={recipes}
                    projects={projects}
                    onAddIngredient={handleAddIngredient}
                    onUpdateIngredient={handleUpdateIngredient}
                    onDeleteIngredient={handleDeleteIngredient}
                />
            )}
             {activeTab === 'packagings' && (
                <PackagingManager 
                    packagings={packagings}
                    suppliers={suppliers} 
                    onAddPackaging={handleAddPackaging}
                    onUpdatePackaging={handleUpdatePackaging}
                    onDeletePackaging={handleDeletePackaging}
                />
            )}
            {activeTab === 'suppliers' && (
                <SupplierManager 
                    suppliers={suppliers}
                    onAddSupplier={handleAddSupplier}
                    onUpdateSupplier={handleUpdateSupplier}
                    onDeleteSupplier={handleDeleteSupplier}
                />
            )}
            {activeTab === 'settings' && (
                <SettingsManager />
            )}
            {activeTab === 'guide' && (
                <UserGuide />
            )}
        </div>
      </main>

    </div>
  );
}
