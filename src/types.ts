
// Modèles de données (Domain Models)

export enum Allergen {
  GLUTEN = 'Gluten',
  CRUSTACEANS = 'Crustacés',
  EGGS = 'Œufs',
  FISH = 'Poisson',
  PEANUTS = 'Arachides',
  SOY = 'Soja',
  MILK = 'Lait',
  NUTS = 'Fruits à coque',
  CELERY = 'Céleri',
  MUSTARD = 'Moutarde',
  SESAME = 'Sésame',
  SULPHITES = 'Sulfites',
  LUPIN = 'Lupin',
  MOLLUSCS = 'Mollusques',
  NONE = 'Aucun'
}

export enum LabelTag {
  ORGANIC = 'Bio',
  VEGAN = 'Vegan',
  VEGETARIAN = 'Végétarien',
  KOSHER = 'Casher',
  HALAL = 'Halal',
  CLEAN_LABEL = 'Clean Label',
  FROZEN = 'Surgelé'
}

export enum RecipeStatus {
  DRAFT = 'Brouillon',
  IN_DEV = 'En Développement',
  VALIDATED = 'Validée',
  ARCHIVED = 'Archivée'
}

// PARAMÈTRES UTILISATEUR (NOUVEAU)
export interface UserSettings {
    apiKey: string; // Clé Gemini
    authorName: string; // Pour les logs et créations
    companyName: string; // Pour l'en-tête des fiches techniques
}

// GED : Gestion Documentaire
export interface AttachedDocument {
  id: string;
  name: string; // ex: Fiche Technique.pdf
  type: 'Specs' | 'Certificate' | 'LabAnalysis' | 'Other';
  date: string;
  url?: string; // Stockage Base64 (Data URI)
}

export interface NutrientProfile {
  energyKcal: number;
  protein: number;
  fat: number;
  saturatedFat: number;
  carbohydrates: number;
  sugars: number;
  fiber: number;
  salt: number;
}

export interface PhysicoChemical {
  brix?: number;
  ph?: number;
  aw?: number;
}

// FOURNISSEUR
export interface Supplier {
    id: string;
    name: string;
    code: string; // Code ERP
    contactEmail: string;
    status: 'Pending' | 'Approved' | 'Blacklisted';
    certification: string[]; // IFS, BRC, ISO...
    documents: AttachedDocument[]; 
}

// MATIÈRE PREMIÈRE
export interface Ingredient {
  id: string;
  name: string;
  supplierId?: string; // Lien fournisseur
  costPerKg: number; 
  nutrients: NutrientProfile; 
  allergens: Allergen[];
  traces?: Allergen[]; // NOUVEAU: Contaminations croisées possibles
  labels: LabelTag[]; 
  physico: PhysicoChemical; 
  fruitVegetablePercent: number; 
  
  // Agribalyse
  carbonFootprint?: number; // kg CO2e / kg de produit

  isLiquid: boolean; 
  isRedMeat?: boolean; // Important pour Nutri-Score 2023
  documents: AttachedDocument[]; // GED
  images?: string[]; // Base64 images
}

// EMBALLAGE
export interface Packaging {
  id: string;
  name: string;
  supplierId?: string; // Lien fournisseur
  type: 'Primary' | 'Secondary' | 'Tertiary'; // Primaire (Contact), Secondaire (Carton), Tertiaire (Palette)
  material: string; // Plastique, Carton, Verre...
  recyclability?: 'Recyclable' | 'Non-Recyclable' | 'Compostable' | 'Reusable'; // NOUVEAU
  weight: number; // Poids unitaire (g)
  costPerUnit: number; // Coût unitaire (€)
  documents: AttachedDocument[]; // GED
  images?: string[]; // Base64 images
}

export interface RecipeItem {
  id: string;
  ingredientId: string;
  quantity: number; // Poids mis en œuvre
  group?: string; // Sous-ensemble (ex: "Pâte", "Appareil")
}

export interface RecipePackagingItem {
  id: string;
  packagingId: string;
  quantity: number; // Nombre d'unités
}

// PROCESS INDUSTRIEL
export interface ProcessStep {
    id: string;
    order: number;
    name: string; // ex: Pétrissage, Cuisson
    description: string; // ex: 10 min vitesse lente
    criticalParam?: string; // ex: T°C > 72°C
}

// QUALITÉ
export interface QualityControl {
    id: string;
    name: string; // ex: pH final
    target: string; // ex: 4.5 +/- 0.2
    frequency: string; // ex: Chaque lot
    type: 'Physico' | 'Microbio' | 'Organoleptic';
}

// NOUVEAUX TYPES POUR FTPF DETAILLEE
export interface OrganolepticProfile {
    appearance: string;
    texture: string;
    taste: string;
    smell: string;
}

export interface StorageConditions {
    shelfLife: string; // ex: 24 mois
    storageTemp: string; // ex: -18°C
    afterOpening: string; // ex: 3 jours à 4°C
}

export interface LogisticsInfo {
    unitsPerBox: number;
    boxesPerLayer: number;
    layersPerPallet: number;
    palletHeight: number;
}

export interface ChangeLogEntry {
    id: string;
    date: string;
    version: string;
    author: string;
    comment: string;
    snapshot?: string; // NOUVEAU: Sauvegarde JSON de la recette complète pour restauration
}

// RECETTE
export interface Recipe {
  id: string;
  version: string;
  status: RecipeStatus;
  name: string;
  description?: string; 
  imageUrl?: string; // Deprecated, use images[0]
  images?: string[]; // Nouveau: Galerie de photos
  updatedAt: string; 
  
  items: RecipeItem[]; // Ingrédients
  packagingItems: RecipePackagingItem[]; // Emballages
  
  // Nouveaux champs PLM
  processSteps: ProcessStep[];
  qualityControls: QualityControl[];

  moistureLoss: number; 
  targetBatchWeight: number; 
  instructions?: string;
  
  // Nouveaux champs FTPF
  organoleptic?: OrganolepticProfile;
  storage?: StorageConditions;
  logistics?: LogisticsInfo;
  changeLog?: ChangeLogEntry[];

  laborCost: number; // Main d'oeuvre forfaitaire
  
  // NOUVEAU : Coûts énergétiques
  energyCostConfig?: {
      durationMinutes: number; // Temps machine
      powerKw: number; // Puissance en kW
      costPerKwh: number; // Coût unitaire
  };

  targetMargin: number; 
  
  documents: AttachedDocument[]; // GED Produit Fini
}

export interface FormulationResult {
  totalInputWeight: number;
  finalWeight: number; // Poids Net
  grossWeight: number; // Poids Brut (Net + Emballage)
  yield: number; 
  
  costPerKg: number; // MP
  totalMaterialCost: number; 
  totalPackagingCost: number; // Nouveau
  totalEnergyCost: number; // Nouveau : Coût énergie calculé
  totalProductionCost: number; 
  
  nutrientsPer100g: NutrientProfile; 
  allergens: Allergen[]; 
  traces: Allergen[]; // NOUVEAU
  ingredientList: string; 
  
  nutriScore: string; // A, B, C, D, E
  nutriScoreScore: number; // Score numérique
  calculatedLabels: LabelTag[]; 
  theoreticalBrix: number; 
  
  carbonFootprintPerKg: number; // CO2 du produit fini
  ecoScore: { // NOUVEAU
      ratio: number; // Poids emballage / Poids produit
      class: 'A' | 'B' | 'C' | 'D' | 'E';
      recyclableRate: number; // % recyclable
  };
}

// ------------------------------------------
// MODULE GESTION DE PROJET (NEW)
// ------------------------------------------

export type ProjectStatus = 'Idea' | 'Feasibility' | 'Development' | 'Validation' | 'Industrialization' | 'Launched' | 'Cancelled';

export interface HaccpRisk {
    type: 'Biological' | 'Chemical' | 'Physical' | 'Allergen';
    description: string;
    controlMeasure: string;
    validated: boolean;
}

export interface SampleSending {
    id: string;
    date: string;
    clientName: string;
    recipeVersion: string; // Lien vers Recipe.version
    trackingNumber?: string;
    feedback?: string;
    status: 'Sent' | 'Received' | 'Approved' | 'Rejected';
}

export interface SensoryTest {
    id: string;
    date: string;
    type: 'Triangle' | 'Hedonic' | 'Descriptive';
    panelSize: number; // Nombre de testeurs
    resultSummary: string; // ex: "Différence significative p<0.05"
    documentUrl?: string; // Rapport PDF
}

export interface ShelfLifeTest {
    id: string;
    startDate: string;
    duration: string; // "30 days"
    temperature: string; // "4°C"
    checkpoints: { 
        day: number; 
        result: 'Pass' | 'Fail' | 'Pending'; 
        comment?: string;
        photo?: string; // Base64 image du produit à J+X
    }[];
}

export interface Project {
    id: string;
    name: string;
    client: string; // ou "Interne"
    deadline: string;
    status: ProjectStatus;
    description: string;
    targetCost?: number; // Nouveau : Budget cible €/kg
    collaborators?: string[]; // Nouveau: Equipe projet
    
    // Liens
    linkedRecipeIds: string[]; // Liste des IDs de recettes (Essais)
    
    // Modules
    haccp: HaccpRisk[];
    samples: SampleSending[];
    sensoryTests: SensoryTest[];
    shelfLifeTests: ShelfLifeTest[];
    
    tasks: { id: string, text: string, done: boolean }[];
}
