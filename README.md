# 🚀 VisiPLM - Solution de Formulation & Gestion de Projet R&D

**VisiPLM** est une application web moderne de type PLM (Product Lifecycle Management) dédiée aux ingénieurs R&D et responsables Qualité de l'industrie agroalimentaire. Elle permet de piloter le développement produit de l'idée initiale jusqu'à la mise sur le marché.

---

## 🌟 Fonctionnalités Actuelles

### 1. 🧪 Formulation & Nutrition (Cœur de Métier)
- **Calculateur de Recettes Précis** : Prise en compte des pertes à la cuisson (moisture loss) et calcul automatique du rendement (yield).
- **Nutri-Score 2023** : Implémentation complète du nouvel algorithme européen (plus sévère sur le sucre, le sel et les graisses saturées).
- **Générateur de Liste INCO** : Génération automatique de la liste des ingrédients par ordre pondéral décroissant avec mise en gras des allergènes réglementaires.
- **Profil Physico-Chimique** : Suivi du Brix (théorique et final), du pH et de l'Aw.
- **Gestion des Traces** : Distinction nette entre les allergènes de composition et les traces (contaminations croisées).

### 2. 🌍 Éco-Conception & Carbon Footprint
- **Calcul CO2 (Agribalyse)** : Estimation de l'impact carbone par kg de produit fini basée sur les données environnementales des ingrédients.
- **Éco-Score Emballage** : Notation (A à E) calculée selon le ratio poids emballage/produit et le taux de recyclabilité des matériaux utilisés.

### 3. 🧠 Intelligence Artificielle (Gemini AI Integration)
- **Smart Import (OCR)** : Analyse et extraction automatique de données depuis un texte brut (copier-coller de fiches techniques PDF).
- **Guessing Nutritionnel** : Prédiction des valeurs nutritionnelles, allergènes et CO2 à partir du simple nom d'un ingrédient.
- **Optimiseur de Coût** : Analyse de la recette par l'IA pour suggérer des alternatives de matières premières moins chères sans dégrader la qualité.

### 4. 🚀 Pilotage de Projets R&D
- **Workflow Industrialisation** : Suivi par étapes (Idée, Faisabilité, Développement, Validation, Industrialisation, Lancement).
- **Validation HACCP** : Analyse des risques (Bio, Chim, Phys, Allergène) intégrée au projet.
- **Tests de Vieillissement (DLC)** : Suivi par jalons (J+X) avec stockage de photos témoins et commentaires.
- **Analyse d'Impact** : Sécurité interdisant la suppression d'une matière première si elle est utilisée dans un projet client actif.

### 5. 📦 Gestion de Données & GED
- **Import CIQUAL Officiel** : Importation de masse d'ingrédients via Excel avec mapping automatique des colonnes de l'ANSES.
- **Gestion Documentaire (GED)** : Stockage Base64 des fiches techniques, certificats et photos directement dans le navigateur.
- **Versioning & Snapshots** : Historique des modifications avec possibilité de "restaurer" une ancienne version de recette.

---

## 🛠️ Spécifications Techniques

- **Frontend** : React, TypeScript, Tailwind CSS.
- **Calculs** : Service dédié (`calculationService.ts`) pour la précision physique et nutritionnelle.
- **Intelligence Artificielle** : SDK Google Gemini Flash 1.5.
- **Stockage Actuel** : `localStorage` (Persistance locale via le navigateur).

---

## 🔮 Roadmap & Améliorations Futures (Backend & Pro)

### 1. Migration vers un Backend (Priorité Haute)
L'application utilise actuellement le `localStorage`, ce qui limite le volume de données et interdit la collaboration. La prochaine étape majeure est la migration vers une infrastructure Cloud (**Supabase** ou **Firebase**) :
- **Collaboration temps réel** : Partage des recettes et projets entre collègues d'une même équipe.
- **Base de données relationnelle** : Meilleure intégrité des données et requêtes SQL complexes.
- **Cloud Storage** : Stockage illimité de PDF hautes résolutions et de photos HD (remplaçant le Base64 actuel).
- **Authentification** : Gestion des accès par rôles (Admin, R&D, Qualité, Achats).

### 2. Fonctionnalités Métier Avancées
- **Export PDF Natif** : Génération de PDF professionnels (fiches techniques) via une librairie dédiée côté serveur (type Puppeteer ou jsPDF).
- **Module Réglementaire Export** : Adaptation du Nutri-Score et de l'étiquetage pour d'autres zones géographiques (USA/FDA, UK).
- **Comparateur de Versions** : Vue diff côte à côte entre deux essais labo pour visualiser l'impact d'un changement de MP sur le coût et la nutrition.

### 3. Logistique & Achats
- **Calcul de Revient Transport** : Intégration des coûts logistiques (incoterms) dans le prix de revient global.
- **Gestion des Stocks Labo** : Inventaire des échantillons MP reçus pour les essais culinaires.

---

## 📝 Installation & Utilisation

1. Clonez le dépôt.
2. Installez les dépendances : `npm install`.
3. Configurez votre clé API Gemini dans l'onglet **Paramètres** de l'application.
4. Lancez le serveur de développement : `npm run dev`.

---
*Développé pour l'excellence opérationnelle en R&D Agroalimentaire.*
