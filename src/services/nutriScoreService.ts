import { NutrientProfile } from "../types";

/**
 * Calcul du Nutri-Score selon l'algorithme actualisé (Mise à jour 2023 pour aliments solides).
 * Source: Scientific Committee of the Nutri-Score (Update 2023).
 */

// Tableaux de points 2023 (Simplifiés pour solides généraux)

const getEnergyPoints = (kj: number): number => {
    if (kj <= 335) return 0;
    if (kj > 3350) return 10;
    return Math.floor((kj - 1) / 335) + 1; // Approximation linéaire des steps
};

const getSatFatPoints = (g: number): number => {
    // 2023: Echelle plus progressive
    if (g <= 1) return 0;
    if (g > 10) return 10;
    return Math.floor(g); // Approximation (1g = 1pt grosso modo jusqu'à 10)
};

const getSugarPoints = (g: number): number => {
    // 2023: Pénalisation accrue. Max 15 points (avant 10)
    // Echelle approximative basée sur la nouvelle grille
    if (g <= 0) return 0;
    if (g > 67.5) return 15; // Plafond augmenté
    // ~ 4.5g par point
    return Math.floor(g / 4.5); 
};

const getSaltPoints = (saltG: number): number => {
    // 2023: Pénalisation très forte. Max 20 points.
    // Conversion Sel -> Sodium (mg) -> Points
    // 1g sel = 400mg sodium
    // Grille 2023 : 20 points si sodium > 2000mg (5g sel)
    const saltMg = saltG * 1000;
    if (saltMg <= 200) return 0; // ~0.2g sel
    if (saltMg > 2000) return 20; // >5g sel
    
    // Echelle linéaire approx entre 0 et 20
    return Math.min(20, Math.floor(saltMg / 100));
};

const getFiberPoints = (g: number): number => {
    // 2023: Alignement avec définition AOAC
    if (g <= 3.0) return 0;
    if (g > 7.4) return 5; // Max 5
    // Echelle approx
    return Math.floor((g - 3.0) / 0.8) + 1; 
};

const getProteinPoints = (g: number): number => {
    // 2023: Max 7 points. Protéines "Vraies" valorisées.
    if (g <= 2.4) return 0;
    if (g > 17) return 7;
    return Math.floor((g - 2.4) / 2.4) + 1;
};

const getFruitVegPoints = (percent: number): number => {
    // 2023: Seuils ajustés. Compte Fruits, Legumes, Legumineuses.
    if (percent <= 40) return 0;
    if (percent <= 60) return 1;
    if (percent <= 80) return 2;
    return 5; // > 80%
};

export const calculateNutriScoreClass = (nutrients: NutrientProfile, fruitVegPercent: number, isRedMeat = false): { class: string, score: number } => {
    // 1. Energie (kJ)
    const energyKJ = nutrients.energyKcal * 4.184;

    // 2. Composantes N (Négatives)
    const pEnergy = getEnergyPoints(energyKJ);
    const pSugars = getSugarPoints(nutrients.sugars);
    const pSatFat = getSatFatPoints(nutrients.saturatedFat);
    const pSalt = getSaltPoints(nutrients.salt);

    const scoreN = pEnergy + pSugars + pSatFat + pSalt;

    // 3. Composantes P (Positives)
    const pFiber = getFiberPoints(nutrients.fiber);
    const pProtein = getProteinPoints(nutrients.protein);
    const pFruitVeg = getFruitVegPoints(fruitVegPercent);

    // 4. Calcul Score Final
    // Règle 2023 Protéines:
    // Si Score N < 11 : Score = N - P
    // Si Score N >= 11 :
    //    Si %Fruits > 80 : Score = N - P
    //    Sinon : Score = N - (P_Fibre + P_Fruit) [Protéines exclues]
    
    // Note: Pour viande rouge (isRedMeat), règle spécifique protéines (non implémentée ici pour simplifier, on prend cas général)

    let finalScore = 0;
    const scoreP_Full = pFiber + pProtein + pFruitVeg;
    const scoreP_Restricted = pFiber + pFruitVeg;

    if (scoreN < 11) {
        finalScore = scoreN - scoreP_Full;
    } else {
        if (fruitVegPercent > 80) {
             finalScore = scoreN - scoreP_Full;
        } else {
             finalScore = scoreN - scoreP_Restricted;
        }
    }

    // 5. Classement 2023 (Solides)
    // A: -infinity à 0
    // B: 1 à 2
    // C: 3 à 10
    // D: 11 à 18
    // E: 19 à infinity
    
    let grade = 'E';
    if (finalScore <= 0) grade = 'A';
    else if (finalScore <= 2) grade = 'B';
    else if (finalScore <= 10) grade = 'C';
    else if (finalScore <= 18) grade = 'D';

    return { class: grade, score: finalScore };
};