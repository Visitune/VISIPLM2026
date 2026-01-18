
import { Ingredient, Recipe, Packaging, FormulationResult, NutrientProfile, Allergen, LabelTag } from '../types';
import { calculateNutriScoreClass } from './nutriScoreService';

const getIngredient = (id: string, ingredients: Ingredient[]): Ingredient | undefined => {
  return ingredients.find(ing => ing.id === id);
};

const getPackaging = (id: string, packagings: Packaging[]): Packaging | undefined => {
    return packagings.find(p => p.id === id);
};

// NOUVEAU: Génération de la liste INCO (Décroissant pondéral)
const generateIncoList = (recipeItems: {ingredientId: string, quantity: number}[], allIngredients: Ingredient[]): string => {
    // 1. Récupérer les ingrédients et leurs quantités réelles
    const richItems = recipeItems.map(item => {
        const ing = allIngredients.find(i => i.id === item.ingredientId);
        return {
            name: ing?.name || 'Inconnu',
            quantity: item.quantity,
            allergens: ing?.allergens.filter(a => a !== Allergen.NONE) || []
        };
    });

    // 2. Trier par poids décroissant
    richItems.sort((a, b) => b.quantity - a.quantity);

    // 3. Formatter
    return richItems.map(item => {
        let label = item.name;
        // Mise en gras des allergènes (simulation markdown pour l'affichage)
        if (item.allergens.length > 0) {
            label += ` (dont ${item.allergens.join(', ').toUpperCase()})`;
        }
        return label;
    }).join(', ') + '.';
};

export const calculateFormulation = (
  recipe: Recipe, 
  ingredients: Ingredient[],
  packagings: Packaging[]
): FormulationResult => {
  
  let totalInputWeight = 0;
  let totalMaterialCost = 0;
  let totalCO2 = 0; // Agribalyse Accumulator
  
  let weightedBrix = 0;
  let totalFruitVegWeight = 0; 

  const totalNutrients: NutrientProfile = {
    energyKcal: 0, protein: 0, fat: 0, saturatedFat: 0, carbohydrates: 0, sugars: 0, fiber: 0, salt: 0
  };

  const consolidatedAllergens = new Set<Allergen>();
  const consolidatedTraces = new Set<Allergen>(); // NOUVEAU
  let potentialLabels = new Set<LabelTag>(Object.values(LabelTag));
  let hasRedMeat = false;

  // 1. INGRÉDIENTS
  recipe.items.forEach(item => {
    const ingredient = getIngredient(item.ingredientId, ingredients);
    if (!ingredient) return;

    totalInputWeight += item.quantity;
    totalMaterialCost += (item.quantity / 1000) * ingredient.costPerKg;
    
    // Calcul CO2
    if (ingredient.carbonFootprint) {
        totalCO2 += (item.quantity / 1000) * ingredient.carbonFootprint;
    }

    if (ingredient.isRedMeat) hasRedMeat = true;

    if (ingredient.physico.brix !== undefined) {
        weightedBrix += (ingredient.physico.brix * item.quantity);
    }
    
    if (ingredient.fruitVegetablePercent) {
        totalFruitVegWeight += (item.quantity * (ingredient.fruitVegetablePercent / 100));
    }

    const ingredientLabels = new Set(ingredient.labels);
    for (const label of potentialLabels) {
        if (!ingredientLabels.has(label)) {
            potentialLabels.delete(label);
        }
    }

    ingredient.allergens.forEach(allergen => {
      if (allergen !== Allergen.NONE) consolidatedAllergens.add(allergen);
    });

    // Gestion des Traces
    if (ingredient.traces) {
        ingredient.traces.forEach(trace => {
            if (trace !== Allergen.NONE && !consolidatedAllergens.has(trace)) {
                consolidatedTraces.add(trace);
            }
        });
    }

    const factor = item.quantity / 100;
    totalNutrients.energyKcal += ingredient.nutrients.energyKcal * factor;
    totalNutrients.protein += ingredient.nutrients.protein * factor;
    totalNutrients.fat += ingredient.nutrients.fat * factor;
    totalNutrients.saturatedFat += ingredient.nutrients.saturatedFat * factor;
    totalNutrients.carbohydrates += ingredient.nutrients.carbohydrates * factor;
    totalNutrients.sugars += ingredient.nutrients.sugars * factor;
    totalNutrients.fiber += ingredient.nutrients.fiber * factor;
    totalNutrients.salt += ingredient.nutrients.salt * factor;
  });

  // Nettoyage des traces si l'allergène est présent en direct
  consolidatedAllergens.forEach(a => consolidatedTraces.delete(a));

  // 2. EMBALLAGES & ECO-SCORE
  let totalPackagingCost = 0;
  let totalPackagingWeight = 0;
  let recyclableWeight = 0;

  if (recipe.packagingItems) {
      recipe.packagingItems.forEach(item => {
          const pack = getPackaging(item.packagingId, packagings);
          if (pack) {
              totalPackagingCost += (item.quantity * pack.costPerUnit);
              const w = item.quantity * pack.weight;
              totalPackagingWeight += w;
              if (pack.recyclability === 'Recyclable' || pack.recyclability === 'Compostable' || pack.recyclability === 'Reusable') {
                  recyclableWeight += w;
              }
          }
      });
  }

  // 3. COÛTS INDIRECTS (Energie)
  let totalEnergyCost = 0;
  if (recipe.energyCostConfig) {
      const { durationMinutes, powerKw, costPerKwh } = recipe.energyCostConfig;
      if (durationMinutes && powerKw && costPerKwh) {
          totalEnergyCost = (durationMinutes / 60) * powerKw * costPerKwh;
      }
  }

  // 4. FINALISATION
  const lossFactor = recipe.moistureLoss / 100;
  const finalWeight = Math.max(0, totalInputWeight * (1 - lossFactor));
  const yieldPercent = totalInputWeight > 0 ? (finalWeight / totalInputWeight) * 100 : 0;
  const grossWeight = finalWeight + totalPackagingWeight;

  const costPerKg = finalWeight > 0 ? (totalMaterialCost / (finalWeight / 1000)) : 0;
  const totalProductionCost = totalMaterialCost + totalPackagingCost + (recipe.laborCost || 0) + totalEnergyCost;
  
  const carbonFootprintPerKg = finalWeight > 0 ? (totalCO2 / (finalWeight / 1000)) : 0;

  const concentrationFactor = finalWeight > 0 ? 100 / finalWeight : 0;

  const finalNutrientsPer100g: NutrientProfile = {
    energyKcal: totalNutrients.energyKcal * concentrationFactor,
    protein: totalNutrients.protein * concentrationFactor,
    fat: totalNutrients.fat * concentrationFactor,
    saturatedFat: totalNutrients.saturatedFat * concentrationFactor,
    carbohydrates: totalNutrients.carbohydrates * concentrationFactor,
    sugars: totalNutrients.sugars * concentrationFactor,
    fiber: totalNutrients.fiber * concentrationFactor,
    salt: totalNutrients.salt * concentrationFactor
  };

  const calculatedBrix = totalInputWeight > 0 ? (weightedBrix / totalInputWeight) : 0;
  const finalBrix = finalWeight > 0 ? Math.min(100, calculatedBrix * (totalInputWeight / finalWeight)) : 0;

  const fruitVegPercentFinal = totalInputWeight > 0 ? (totalFruitVegWeight / totalInputWeight) * 100 : 0;

  // Calcul Nutri-Score 2023
  const nsResult = calculateNutriScoreClass(finalNutrientsPer100g, fruitVegPercentFinal, hasRedMeat);

  // Calcul Eco-Packaging
  const packRatio = finalWeight > 0 ? (totalPackagingWeight / finalWeight) * 100 : 0; // % poids emballage vs produit
  const recyclableRate = totalPackagingWeight > 0 ? (recyclableWeight / totalPackagingWeight) * 100 : 0;
  
  // Algorithme Eco simplifié
  let ecoClass: 'A'|'B'|'C'|'D'|'E' = 'C';
  if (packRatio < 5 && recyclableRate > 90) ecoClass = 'A';
  else if (packRatio < 10 && recyclableRate > 80) ecoClass = 'B';
  else if (packRatio > 20 || recyclableRate < 50) ecoClass = 'D';
  if (totalPackagingWeight === 0 && finalWeight > 0) ecoClass = 'A'; // Vrac ou pas d'emballage

  return {
    totalInputWeight,
    finalWeight,
    grossWeight,
    yield: yieldPercent,
    costPerKg,
    totalMaterialCost,
    totalPackagingCost,
    totalEnergyCost,
    totalProductionCost,
    nutrientsPer100g: finalNutrientsPer100g,
    allergens: Array.from(consolidatedAllergens).sort(),
    traces: Array.from(consolidatedTraces).sort(),
    ingredientList: generateIncoList(recipe.items, ingredients),
    nutriScore: nsResult.class,
    nutriScoreScore: nsResult.score,
    calculatedLabels: Array.from(potentialLabels),
    theoreticalBrix: finalBrix,
    carbonFootprintPerKg,
    ecoScore: {
        ratio: packRatio,
        recyclableRate,
        class: ecoClass
    }
  };
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};

export const formatNumber = (val: number, decimals = 1) => {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
};
