
import React from 'react';

export const UserGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Guide d'Utilisation VisiPLM</h2>
        <p className="text-slate-500 text-lg">Maîtrisez la formulation, le calcul des coûts et la conformité réglementaire.</p>
      </div>
      
      {/* Configuration Initiale */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-lg shadow-md border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚙️</span>
            <h3 className="text-xl font-bold text-white">0. Configuration Initiale & IA</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Pour activer les fonctionnalités d'Intelligence Artificielle (autocomplétion des ingrédients, import PDF), vous devez configurer votre clé API.
          </p>
          <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2 mb-4 bg-slate-800/50 p-4 rounded border border-slate-600">
              <li>Rendez-vous dans l'onglet <strong>Paramètres</strong> (menu de gauche).</li>
              <li>Cliquez sur le lien pour générer une clé gratuite via <strong>Google AI Studio</strong>.</li>
              <li>Copiez votre clé (commençant par <code>AIza...</code>) et collez-la dans le champ dédié.</li>
              <li>Sauvegardez. La clé est stockée localement dans votre navigateur (sécurisé).</li>
          </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module Ingrédients */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🥕</span>
            <h3 className="text-xl font-bold text-slate-700">1. Gestion des Ingrédients</h3>
          </div>
          <ul className="space-y-3 text-slate-600 text-sm leading-relaxed">
            <li><strong className="text-teal-600">Import CSV / CIQUAL :</strong> Utilisez l'onglet "Imports" pour charger des bases de données externes (ex: ANSES Ciqual 2020) via fichier CSV.</li>
            <li><strong className="text-teal-600">Smart Import (IA) :</strong> Copiez-collez le texte brut d'une fiche technique PDF ou image. L'IA extraira automatiquement les nutriments, allergènes et labels.</li>
            <li><strong className="text-teal-600">Données Physico-Chimiques :</strong> Renseignez le Brix, le pH et l'activité de l'eau (aw) pour affiner les calculs de formulation.</li>
            <li><strong className="text-teal-600">Compression Images :</strong> Les photos sont automatiquement compressées pour ne pas surcharger votre navigateur.</li>
          </ul>
        </div>

        {/* Module Emballages */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📦</span>
            <h3 className="text-xl font-bold text-slate-700">2. Emballages (Packaging)</h3>
          </div>
          <ul className="space-y-3 text-slate-600 text-sm leading-relaxed">
            <li><strong className="text-blue-600">Typologie :</strong> Classez vos emballages en Primaire (contact alimentaire), Secondaire (regroupement) ou Tertiaire (transport).</li>
            <li><strong className="text-blue-600">Poids & Coûts :</strong> Saisissez le poids unitaire pour le calcul du Poids Brut et le coût unitaire pour le prix de revient.</li>
            <li><strong className="text-blue-600">Nomenclature :</strong> Ajoutez les emballages à votre recette pour obtenir un coût complet (BOM) et gérer l'éco-contribution (poids total matériaux).</li>
          </ul>
        </div>
      </div>

      {/* Module Formulation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🛠️</span>
          <h3 className="text-xl font-bold text-slate-700">3. Formulation & Calculs</h3>
        </div>
        <div className="space-y-4 text-slate-600 text-sm">
          <p>
            L'outil calcule en temps réel les impacts de vos modifications de recette.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
             <div>
                <h4 className="font-bold text-slate-800 mb-2">Nutrition & Réglementaire</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>Calcul automatique des valeurs pour 100g.</li>
                    <li>Détection automatique des allergènes (liste INCO).</li>
                    <li>Propagation des labels (Bio, Vegan...).</li>
                    <li><span className="bg-slate-100 px-1 rounded font-bold text-slate-800">Nutri-Score 2023 :</span> Algorithme officiel mis à jour (pénalisation sel/sucre accrue).</li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold text-slate-800 mb-2">Technique & Coûts</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>Gestion de la perte en eau (cuisson).</li>
                    <li>Calcul du Brix final théorique (concentration).</li>
                    <li>Prix de revient matière + emballage + main d'œuvre.</li>
                    <li>Simulation de marge et prix de vente cible.</li>
                </ul>
             </div>
          </div>
        </div>
      </div>

      {/* NOUVEAU: Module Gestion de Projet */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🚀</span>
          <h3 className="text-xl font-bold text-slate-700">4. Gestion de Projets R&D</h3>
        </div>
        <div className="space-y-4 text-slate-600 text-sm">
          <p>Suivez le cycle de vie complet de vos innovations, de l'idée au lancement industriel.</p>
          <ul className="space-y-2 list-disc list-inside bg-slate-50 p-4 rounded border border-slate-100">
              <li><strong className="text-indigo-600">Workflows :</strong> Liez plusieurs recettes (essais) à un projet unique.</li>
              <li><strong className="text-indigo-600">Qualité & Sécurité (HACCP) :</strong> Définissez les risques biologiques, chimiques et physiques. <span className="text-red-500 font-bold">Important :</span> Le passage en phase d'industrialisation est bloqué si tous les risques ne sont pas validés.</li>
              <li><strong className="text-indigo-600">Vieillissement (DLC) :</strong> Suivez les tests de conservation avec photos à chaque point de contrôle (J+0, J+15...).</li>
              <li><strong className="text-indigo-600">Échantillonnage :</strong> Tracez les envois clients et leurs retours (Feedback).</li>
              <li><strong className="text-indigo-600">Reporting :</strong> Générez un rapport PDF complet du projet via le bouton "Rapport Synthèse" (Onglet Vue d'ensemble).</li>
          </ul>
        </div>
      </div>

      {/* Architecture & Roadmap */}
      <div className="bg-slate-800 text-slate-300 p-6 rounded-lg border border-slate-700 shadow-md">
        <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💾</span>
            <h3 className="text-xl font-bold text-white">5. Données & Stockage</h3>
        </div>
        <p className="text-sm mb-6 leading-relaxed">
            VisiPLM fonctionne actuellement en mode "Client-Side" autonome.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-slate-700/50 p-4 rounded border border-slate-600">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <h4 className="font-bold text-teal-400">LocalStorage (Actuel)</h4>
                </div>
                <ul className="list-disc list-inside text-slate-400 text-xs space-y-1">
                    <li>Données stockées dans VOTRE navigateur.</li>
                    <li>Aucune donnée ne transite vers un serveur (sauf appels IA Google).</li>
                    <li><strong className="text-white">Compression Images :</strong> Les photos sont compressées avant stockage pour éviter de saturer la mémoire du navigateur.</li>
                    <li>Sauvegardez régulièrement via le bouton "Exporter".</li>
                </ul>
            </div>

            <div className="bg-slate-700/50 p-4 rounded border border-slate-600 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded-bl">READY</div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                    <h4 className="font-bold text-white">Migration Cloud (Prévu)</h4>
                </div>
                <ul className="list-disc list-inside text-slate-400 text-xs space-y-1">
                    <li>Architecture compatible avec Supabase/Firebase.</li>
                    <li>Permettra la collaboration multi-utilisateurs.</li>
                </ul>
            </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
          <h3 className="text-lg font-bold text-indigo-900 mb-3">Questions Fréquentes</h3>
          <div className="space-y-3 text-sm text-indigo-800">
              <p><strong>Je ne peux pas passer mon projet en "Industrialisation" ?</strong><br/>
              Vérifiez l'onglet HACCP. Tous les dangers identifiés doivent avoir la case "Validé" cochée. C'est une sécurité qualité.</p>
              
              <p><strong>Mes photos disparaissent ou l'appli ralentit ?</strong><br/>
              Le stockage navigateur est limité. Supprimez les anciens projets ou exportez vos données. La compression automatique aide, mais évitez d'ajouter 50 photos par recette.</p>
          </div>
      </div>
    </div>
  );
};
