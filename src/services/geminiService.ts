
import { GoogleGenAI, Type } from "@google/genai";
import { Ingredient, Allergen, LabelTag, Recipe } from "../types";
import { storageService } from "./storageService";

// Helper pour récupérer la clé API (User Settings > Environment)
const getApiKey = async (): Promise<string | undefined> => {
    const settings = await storageService.getSettings();
    if (settings.apiKey && settings.apiKey.trim() !== '') {
        return settings.apiKey;
    }
    return process.env.API_KEY;
};

export const guessIngredientData = async (ingredientName: string): Promise<Partial<Ingredient> | null> => {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    console.warn("API Key manquante pour Gemini (Vérifiez les Paramètres).");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Génère une estimation nutritionnelle technique pour l'ingrédient agroalimentaire: "${ingredientName}". 
      Basé sur CIQUAL/USDA pour la nutrition.
      Basé sur AGRIBALYSE pour l'empreinte carbone (kg CO2e / kg de produit).
      Estime aussi les données physico-chimiques (Brix, pH) si pertinent (sinon null).
      Estime les labels probables (Bio, Vegan...).
      Estime le % de Fruits/Légumes pour le Nutri-Score.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            costPerKg: { type: Type.NUMBER },
            nutrients: {
              type: Type.OBJECT,
              properties: {
                energyKcal: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
                saturatedFat: { type: Type.NUMBER },
                carbohydrates: { type: Type.NUMBER },
                sugars: { type: Type.NUMBER },
                fiber: { type: Type.NUMBER },
                salt: { type: Type.NUMBER },
              },
              required: ["energyKcal", "protein", "fat", "saturatedFat", "carbohydrates", "sugars", "salt"]
            },
            allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
            labels: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ex: Bio, Vegan, Gluten Free" },
            physico: { 
                type: Type.OBJECT,
                properties: {
                    brix: { type: Type.NUMBER },
                    ph: { type: Type.NUMBER }
                }
            },
            fruitVegetablePercent: { type: Type.NUMBER, description: "Pourcentage de fruit/légume dans le produit (0-100)" },
            carbonFootprint: { type: Type.NUMBER, description: "Empreinte carbone Agribalyse en kg CO2e / kg" },
            isLiquid: { type: Type.BOOLEAN }
          }
        }
      }
    });

    return parseResponse(response.text);

  } catch (error) {
    console.error("Erreur Gemini:", error);
    return null;
  }
};

export const parseTechnicalSheet = async (rawText: string): Promise<Partial<Ingredient> | null> => {
    const apiKey = await getApiKey();
    if (!apiKey) return null;
    
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyse OCR Fiche Technique: "${rawText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        costPerKg: { type: Type.NUMBER },
                        nutrients: {
                            type: Type.OBJECT,
                            properties: {
                                energyKcal: { type: Type.NUMBER },
                                protein: { type: Type.NUMBER },
                                fat: { type: Type.NUMBER },
                                saturatedFat: { type: Type.NUMBER },
                                carbohydrates: { type: Type.NUMBER },
                                sugars: { type: Type.NUMBER },
                                fiber: { type: Type.NUMBER },
                                salt: { type: Type.NUMBER },
                            },
                             required: ["energyKcal", "protein", "fat", "saturatedFat", "carbohydrates", "sugars", "salt"]
                        },
                        allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
                        labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                         physico: { 
                            type: Type.OBJECT,
                            properties: {
                                brix: { type: Type.NUMBER },
                                ph: { type: Type.NUMBER }
                            }
                        },
                        fruitVegetablePercent: { type: Type.NUMBER },
                        isLiquid: { type: Type.BOOLEAN }
                    }
                }
            }
        });
        return parseResponse(response.text);
    } catch (e) {
        console.error(e);
        return null;
    }
}

// NOUVEAU: Optimiseur de Coût
export const optimizeRecipeCost = async (recipe: Recipe, allIngredients: Ingredient[]): Promise<string | null> => {
    const apiKey = await getApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    
    // Préparation contexte
    const ingredientsContext = recipe.items.map(item => {
        const ing = allIngredients.find(i => i.id === item.ingredientId);
        return `- ${ing?.name}: ${item.quantity}g à ${ing?.costPerKg}€/kg`;
    }).join('\n');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `En tant qu'expert R&D agroalimentaire, analyse cette recette et propose 3 pistes concrètes pour réduire le coût matière de 10% SANS dégrader le Nutri-Score ni la qualité organoleptique majeure.
            
            Recette: "${recipe.name}"
            Ingrédients:
            ${ingredientsContext}
            
            Format de réponse souhaité : Liste à puces avec nom de l'ingrédient à substituer ou réduire, l'alternative technique proposée, et l'économie estimée. Sois précis techniquement.`,
        });
        return response.text || "Aucune suggestion.";
    } catch (e) {
        console.error(e);
        return null;
    }
};

const parseResponse = (text: string | undefined): Partial<Ingredient> | null => {
    if (!text) return null;
    const data = JSON.parse(text);

    // Helpers mapping
    const mapEnum = (list: string[], enumObj: any, defaultVal?: any) => {
        const mapped: any[] = [];
        if (list && Array.isArray(list)) {
            list.forEach((item: string) => {
                const lower = item.toLowerCase();
                Object.values(enumObj).forEach((enumVal: any) => {
                    if (lower.includes(enumVal.toLowerCase()) || enumVal.toLowerCase().includes(lower)) {
                        if (!mapped.includes(enumVal)) mapped.push(enumVal);
                    }
                });
            });
        }
        if (mapped.length === 0 && defaultVal) mapped.push(defaultVal);
        return mapped;
    };

    return {
      name: data.name,
      costPerKg: data.costPerKg || 0,
      nutrients: {
        energyKcal: data.nutrients?.energyKcal || 0,
        protein: data.nutrients?.protein || 0,
        fat: data.nutrients?.fat || 0,
        saturatedFat: data.nutrients?.saturatedFat || 0,
        carbohydrates: data.nutrients?.carbohydrates || 0,
        sugars: data.nutrients?.sugars || 0,
        fiber: data.nutrients?.fiber || 0,
        salt: data.nutrients?.salt || 0,
      },
      allergens: mapEnum(data.allergens, Allergen, Allergen.NONE),
      labels: mapEnum(data.labels, LabelTag),
      physico: {
          brix: data.physico?.brix,
          ph: data.physico?.ph,
          aw: data.physico?.aw
      },
      fruitVegetablePercent: data.fruitVegetablePercent || 0,
      carbonFootprint: data.carbonFootprint || 0,
      isLiquid: !!data.isLiquid
    };
}
