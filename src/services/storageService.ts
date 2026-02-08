
import { Ingredient, Recipe, Packaging, RecipeStatus, Allergen, LabelTag, Supplier, UserSettings, Project } from '../types';

// ==========================================
// CONFIGURATION & TYPES
// ==========================================

const INITIAL_SETTINGS: UserSettings = {
    apiKey: '',
    authorName: 'R&D User',
    companyName: 'My Food Company'
};

const INITIAL_SUPPLIERS: Supplier[] = [
    { id: 's1', name: 'Moulin Bio France', code: 'SUP-001', contactEmail: 'contact@moulinbio.fr', status: 'Approved', certification: ['IFS', 'Bio'], documents: [] },
    { id: 's2', name: 'Sucreries du Nord', code: 'SUP-002', contactEmail: 'sales@sucrenord.com', status: 'Approved', certification: ['ISO 22000'], documents: [] },
    { id: 's3', name: 'Laiterie des Alpes', code: 'SUP-003', contactEmail: 'pro@laiteriealpes.com', status: 'Pending', certification: [], documents: [] },
    { id: 's4', name: 'Packaging Solutions', code: 'SUP-004', contactEmail: 'order@packsol.com', status: 'Approved', certification: ['BRC'], documents: [] }
];

// Données par défaut (Factory Defaults)
const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: '1',
    name: 'Farine de Blé T55 Bio',
    supplierId: 's1',
    costPerKg: 1.10,
    nutrients: { energyKcal: 364, protein: 10.3, fat: 1, saturatedFat: 0.1, carbohydrates: 76, sugars: 0.3, fiber: 2.7, salt: 0.01 },
    allergens: [Allergen.GLUTEN],
    labels: [LabelTag.ORGANIC, LabelTag.VEGAN],
    physico: {},
    fruitVegetablePercent: 0,
    isLiquid: false,
    documents: [],
    images: ['https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=300&q=80']
  },
  {
    id: '2',
    name: 'Eau de source',
    costPerKg: 0.15,
    nutrients: { energyKcal: 0, protein: 0, fat: 0, saturatedFat: 0, carbohydrates: 0, sugars: 0, fiber: 0, salt: 0 },
    allergens: [],
    labels: [LabelTag.VEGAN, LabelTag.ORGANIC, LabelTag.HALAL],
    physico: { ph: 7, aw: 1 },
    fruitVegetablePercent: 0,
    isLiquid: true,
    documents: [],
    images: []
  },
  {
    id: '3',
    name: 'Beurre Doux 82% Bio',
    supplierId: 's3',
    costPerKg: 9.50,
    nutrients: { energyKcal: 743, protein: 0.7, fat: 82, saturatedFat: 55, carbohydrates: 0.6, sugars: 0.6, fiber: 0, salt: 0.02 },
    allergens: [Allergen.MILK],
    labels: [LabelTag.ORGANIC, LabelTag.VEGETARIAN],
    physico: {},
    fruitVegetablePercent: 0,
    isLiquid: false,
    // Suppression de l'URL fictive '#' pour éviter la confusion
    documents: [{id:'d1', name: 'Certificat AB', type: 'Certificate', date: '2024-01-01'}],
    images: ['https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=300&q=80']
  },
  {
    id: '4',
    name: 'Sucre Canne Bio',
    supplierId: 's2',
    costPerKg: 1.40,
    nutrients: { energyKcal: 400, protein: 0, fat: 0, saturatedFat: 0, carbohydrates: 100, sugars: 100, fiber: 0, salt: 0 },
    allergens: [],
    labels: [LabelTag.ORGANIC, LabelTag.VEGAN],
    physico: { brix: 100 },
    fruitVegetablePercent: 0,
    isLiquid: false,
    documents: [],
    images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80']
  },
   {
    id: '5',
    name: 'Œuf Entier Plein Air',
    costPerKg: 3.80,
    nutrients: { energyKcal: 140, protein: 12.5, fat: 9.5, saturatedFat: 3.1, carbohydrates: 0.7, sugars: 0.7, fiber: 0, salt: 0.3 },
    allergens: [Allergen.EGGS],
    labels: [LabelTag.VEGETARIAN],
    physico: {},
    fruitVegetablePercent: 0,
    isLiquid: true,
    documents: [],
    images: ['https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=300&q=80']
  },
  {
      id: '6',
      name: 'Purée de Fraise',
      costPerKg: 4.50,
      nutrients: { energyKcal: 32, protein: 0.7, fat: 0.3, saturatedFat: 0, carbohydrates: 7.7, sugars: 4.9, fiber: 2, salt: 0 },
      allergens: [],
      labels: [LabelTag.VEGAN, LabelTag.ORGANIC],
      physico: { brix: 10, ph: 3.5 },
      fruitVegetablePercent: 100,
      isLiquid: true,
      documents: [],
      images: ['https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=300&q=80']
  }
];

const INITIAL_PACKAGING: Packaging[] = [
    {
        id: 'p1', name: 'Sachet PE 500g', type: 'Primary', material: 'PEBD', weight: 8, costPerUnit: 0.05, documents: [], 
        images: ['https://images.unsplash.com/photo-1606103920295-9a091573f160?auto=format&fit=crop&w=300&q=80']
    },
    {
        id: 'p2', name: 'Carton 12U', type: 'Secondary', material: 'Carton Recyclé', weight: 250, costPerUnit: 0.45, documents: [], 
        images: ['https://images.unsplash.com/photo-1585644198129-9e8e9f26829d?auto=format&fit=crop&w=300&q=80']
    },
    {
        id: 'p3', name: 'Etiquette Adhésive', type: 'Primary', material: 'Papier', weight: 1, costPerUnit: 0.02, documents: [], 
        images: ['https://images.unsplash.com/photo-1626245347206-8d5f30737482?auto=format&fit=crop&w=300&q=80']
    }
];

// LISTE DE RECETTES INITIALES
const INITIAL_RECIPES: Recipe[] = [
    {
        id: 'R1',
        version: '1.2',
        status: RecipeStatus.VALIDATED,
        name: 'Brioche Bio Pur Beurre',
        description: 'Recette premium pour la gamme petit-déjeuner. Mie filante et goût beurre prononcé.',
        updatedAt: new Date().toISOString(),
        items: [
            { id: 'i1', ingredientId: '1', quantity: 500, group: 'Pâte' }, 
            { id: 'i2', ingredientId: '2', quantity: 150, group: 'Pâte' }, 
            { id: 'i3', ingredientId: '3', quantity: 200, group: 'Pâte' }, 
            { id: 'i4', ingredientId: '4', quantity: 80, group: 'Pâte' },
            { id: 'i5', ingredientId: '5', quantity: 120, group: 'Pâte' },
            { id: 'i6', ingredientId: '5', quantity: 30, group: 'Dorure' } // Oeuf pour dorure
        ],
        packagingItems: [
            { id: 'pk1', packagingId: 'p1', quantity: 2 },
            { id: 'pk2', packagingId: 'p3', quantity: 2 }
        ],
        processSteps: [
            { id: 'ps1', order: 1, name: 'Pétrissage', description: 'Mélanger tous les ingrédients. 4 min lent, 6 min rapide.', criticalParam: 'T°C pâte < 24°C' },
            { id: 'ps2', order: 2, name: 'Pointage', description: 'Repos en cuve.', criticalParam: '30 min à TA' },
            { id: 'ps3', order: 3, name: 'Façonnage & Cuisson', description: 'Diviser en pâtons de 500g. Cuire four ventilé.', criticalParam: '180°C pendant 25 min' }
        ],
        qualityControls: [
            { id: 'qc1', name: 'Poids Pâton', target: '500g +/- 10g', frequency: 'Début/Milieu/Fin', type: 'Physico' },
            { id: 'qc2', name: 'Détection Métaux', target: 'Fe 2mm, Non-Fe 2.5mm', frequency: '100% des produits', type: 'Physico' }
        ],
        moistureLoss: 12,
        targetBatchWeight: 0,
        laborCost: 15.00,
        targetMargin: 35,
        documents: [],
        images: ['https://www.gelsea.com/upload/brioche-1811926_960_720.jpg'],
        organoleptic: {
            appearance: "Croûte dorée uniforme, mie jaune pâle alvéolée.",
            texture: "Moelleuse, filante, fondante en bouche.",
            taste: "Franc goût de beurre, légère note sucrée.",
            smell: "Odeur caractéristique de brioche chaude et de beurre frais."
        },
        storage: {
            shelfLife: "21 jours",
            storageTemp: "Température ambiante (15-25°C)",
            afterOpening: "Consommer sous 48h, bien refermer le sachet."
        },
        logistics: {
            unitsPerBox: 12,
            boxesPerLayer: 8,
            layersPerPallet: 6,
            palletHeight: 160
        },
        changeLog: [
            { id: 'c1', date: '2023-10-01', version: '1.0', author: 'R&D', comment: 'Création initiale' },
            { id: 'c2', date: '2023-11-15', version: '1.1', author: 'Qualité', comment: 'Ajustement temps de cuisson' },
            { id: 'c3', date: '2023-12-10', version: '1.2', author: 'Achats', comment: 'Changement fournisseur farine' }
        ]
    },
    {
        id: 'R2',
        version: '0.5',
        status: RecipeStatus.IN_DEV,
        name: 'Coulis de Fraise',
        description: 'Topping pour glaces et yaourts. Haute teneur en fruits. Couleur rouge vive naturelle.',
        updatedAt: new Date().toISOString(),
        items: [
            { id: 'i1', ingredientId: '6', quantity: 800, group: 'Base Fruit' }, 
            { id: 'i2', ingredientId: '4', quantity: 200, group: 'Sirop' }, 
            { id: 'i3', ingredientId: '2', quantity: 50, group: 'Sirop' },  
        ],
        packagingItems: [],
        processSteps: [
            { id: 'ps1', order: 1, name: 'Mélange', description: 'Cuve chauffante', criticalParam: '' },
            { id: 'ps2', order: 2, name: 'Pasteurisation', description: '85°C pendant 2 min', criticalParam: 'T° > 85°C' }
        ],
        qualityControls: [
             { id: 'qc1', name: 'Brix Final', target: '55 +/- 2', frequency: 'Chaque lot', type: 'Physico' }
        ],
        moistureLoss: 5,
        targetBatchWeight: 0,
        laborCost: 10.00,
        targetMargin: 40,
        documents: [],
        images: ['https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=800&q=80'],
        organoleptic: {
            appearance: "Liquide visqueux rouge brillant.",
            texture: "Fluide, sans morceaux.",
            taste: "Fraise cuite, très sucré.",
            smell: "Fruité intense."
        },
        storage: {
            shelfLife: "12 mois",
            storageTemp: "Frais (4-6°C)",
            afterOpening: "7 jours au réfrigérateur."
        },
        changeLog: [
             { id: 'c1', date: '2023-12-05', version: '0.1', author: 'R&D', comment: 'Essai labo 1' }
        ]
    },
    {
        id: 'R3',
        version: '2.0',
        status: RecipeStatus.DRAFT,
        name: 'Cookie Vegan',
        description: 'Test substitution beurre par huile coco (à faire). Texture croquante et cœur fondant.',
        updatedAt: new Date().toISOString(),
        items: [
             { id: 'i1', ingredientId: '1', quantity: 300, group: 'Pâte' }, 
             { id: 'i2', ingredientId: '4', quantity: 150, group: 'Pâte' }, 
        ],
        packagingItems: [],
        processSteps: [],
        qualityControls: [],
        moistureLoss: 8,
        targetBatchWeight: 0,
        laborCost: 12.00,
        targetMargin: 30,
        documents: [],
        images: ['https://assets.afcdn.com/recipe/20171019/73585_w1024h768c1cx1920cy2880.jpg']
    }
];

// PROJETS FACTICES
const INITIAL_PROJECTS: Project[] = [
    {
        id: 'P1',
        name: 'Gamme Brioche Premium',
        client: 'GMS Nationale',
        deadline: '2024-06-01',
        status: 'Development',
        description: 'Développement d\'une gamme 100% Bio pour le rayon petit-déjeuner.',
        collaborators: ['Sophie R&D', 'Marc Qualité'],
        targetCost: 4.50,
        linkedRecipeIds: ['R1'],
        haccp: [
            { type: 'Allergen', description: 'Contamination croisée Sésame sur ligne', controlMeasure: 'Nettoyage renforcé + Test ATP', validated: false },
            { type: 'Physical', description: 'Corps étrangers métalliques', controlMeasure: 'Détecteur métaux fin de ligne', validated: true }
        ],
        samples: [
            { id: 'smp1', date: '2024-02-10', clientName: 'Acheteur Carrefour', recipeVersion: '1.1', trackingNumber: '1Z999AA10123', status: 'Approved', feedback: 'Texture top, un peu trop cuit.' }
        ],
        sensoryTests: [
            { id: 't1', date: '2024-01-20', type: 'Hedonic', panelSize: 30, resultSummary: 'Note globale 7.5/10. Préférence vs concurrent.' }
        ],
        shelfLifeTests: [
            { 
                id: 'sl1', startDate: '2024-02-01', duration: '21 jours', temperature: '20°C', 
                checkpoints: [
                    { day: 0, result: 'Pass', comment: 'RAS' },
                    { day: 10, result: 'Pass', comment: 'Léger rassissement' },
                    { day: 21, result: 'Pending' }
                ] 
            }
        ],
        tasks: [
            { id: 'tk1', text: 'Sourcing farine T55 Bio', done: true },
            { id: 'tk2', text: 'Validation organoleptique V1', done: true },
            { id: 'tk3', text: 'Tests vieillissement J+21', done: false }
        ]
    }
];

// Interface générique
export interface StorageInterface {
    getSuppliers(): Promise<Supplier[]>;
    saveSuppliers(data: Supplier[]): Promise<void>;

    getIngredients(): Promise<Ingredient[]>;
    saveIngredients(data: Ingredient[]): Promise<void>;
    
    getPackagings(): Promise<Packaging[]>;
    savePackagings(data: Packaging[]): Promise<void>;
    
    getRecipes(): Promise<Recipe[]>;
    saveRecipes(data: Recipe[]): Promise<void>;
    
    getProjects(): Promise<Project[]>;
    saveProjects(data: Project[]): Promise<void>;
    
    getSettings(): Promise<UserSettings>;
    saveSettings(data: UserSettings): Promise<void>;

    resetData(): Promise<{ingredients: Ingredient[], packagings: Packaging[], recipes: Recipe[], suppliers: Supplier[], projects: Project[], settings: UserSettings}>;
}

// ==========================================
// ADAPTER: LOCAL STORAGE
// ==========================================
const STORAGE_KEYS = {
  SUPPLIERS: 'openplm_suppliers_v1',
  INGREDIENTS: 'openplm_ingredients_v1',
  PACKAGING: 'openplm_packaging_v1',
  RECIPES: 'openplm_recipes_v2', 
  PROJECTS: 'openplm_projects_v1', // NOUVEAU
  SETTINGS: 'openplm_settings_v1'
};

class LocalStorageAdapter implements StorageInterface {
    
    private async simulateDelay() {
        return new Promise(resolve => setTimeout(resolve, 50)); 
    }

    async getSuppliers(): Promise<Supplier[]> {
        await this.simulateDelay();
        const stored = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
        return stored ? JSON.parse(stored) : INITIAL_SUPPLIERS;
    }

    async saveSuppliers(data: Supplier[]): Promise<void> {
        await this.simulateDelay();
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(data));
    }

    async getIngredients(): Promise<Ingredient[]> {
        await this.simulateDelay();
        const stored = localStorage.getItem(STORAGE_KEYS.INGREDIENTS);
        return stored ? JSON.parse(stored) : INITIAL_INGREDIENTS;
    }

    async saveIngredients(data: Ingredient[]): Promise<void> {
        await this.simulateDelay();
        localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(data));
    }

    async getPackagings(): Promise<Packaging[]> {
        await this.simulateDelay();
        const stored = localStorage.getItem(STORAGE_KEYS.PACKAGING);
        return stored ? JSON.parse(stored) : INITIAL_PACKAGING;
    }

    async savePackagings(data: Packaging[]): Promise<void> {
        await this.simulateDelay();
        localStorage.setItem(STORAGE_KEYS.PACKAGING, JSON.stringify(data));
    }

    async getRecipes(): Promise<Recipe[]> {
        await this.simulateDelay();
        const stored = localStorage.getItem(STORAGE_KEYS.RECIPES);
        return stored ? JSON.parse(stored) : INITIAL_RECIPES;
    }

    async saveRecipes(data: Recipe[]): Promise<void> {
        await this.simulateDelay();
        localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(data));
    }

    // GESTION PROJETS AVEC MIGRATION DE DONNÉES
    async getProjects(): Promise<Project[]> {
        await this.simulateDelay();
        const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as Project[];
                // Migration logic: Ensure new fields exist on old records
                return parsed.map(p => ({
                    ...p,
                    collaborators: p.collaborators || [], // Init if missing
                    targetCost: p.targetCost || 0
                }));
            } catch (e) {
                console.error("Erreur parsing projects, fallback to defaults");
                return INITIAL_PROJECTS;
            }
        }
        return INITIAL_PROJECTS;
    }

    async saveProjects(data: Project[]): Promise<void> {
        await this.simulateDelay();
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(data));
    }

    async getSettings(): Promise<UserSettings> {
        await this.simulateDelay();
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return stored ? JSON.parse(stored) : INITIAL_SETTINGS;
    }

    async saveSettings(data: UserSettings): Promise<void> {
        await this.simulateDelay();
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
    }

    async resetData() {
        localStorage.removeItem(STORAGE_KEYS.INGREDIENTS);
        localStorage.removeItem(STORAGE_KEYS.PACKAGING);
        localStorage.removeItem(STORAGE_KEYS.RECIPES);
        localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
        localStorage.removeItem(STORAGE_KEYS.PROJECTS);
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        return {
            ingredients: INITIAL_INGREDIENTS,
            packagings: INITIAL_PACKAGING,
            recipes: INITIAL_RECIPES,
            suppliers: INITIAL_SUPPLIERS,
            projects: INITIAL_PROJECTS,
            settings: INITIAL_SETTINGS
        };
    }
}

export const storageService = new LocalStorageAdapter();
