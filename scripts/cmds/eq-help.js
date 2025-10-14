module.exports = {
  config: {
    name: "eq-help",
    aliases: ["elfaliahelp", "EQ-help"],
    version: "1.1",
    author: "Merdi Madimba",
    countDown: 3,
    role: 0,
    shortDescription: "Guide complet pour Elfalia Quest avec toutes les commandes"
  },

  onCall: async ({ api, event }) => {
    const threadID = event.threadID;

    const helpMessage = `
✨ **🧙‍♂️ ELFALIA QUEST - GUIDE COMPLET** ✨

📌 **Commandes principales :**

────────────────────────
🎮 **/eq**  
Crée ton personnage et commence l’aventure.  
- Choisis ton nom, sexe, cheveux, tenue, arme, classe et alignement.  
- Si tu as déjà un personnage, possibilité de le recréer.  

🌍 **/eq-world**  
Explore le monde : villages, donjons, forêts, montagnes.  
- Rencontres PNJ et monstres.  
- Déplacements mis à jour sur la carte automatiquement.

🗺️ **/eq-map**  
Visualise ta position et celle des autres joueurs.  
- Carte dynamique en temps réel.

⚔️ **/eq-battles**  
Combat les monstres ou autres joueurs : PVE / PVP.  
- Utilise potions pour récupérer tes PV.  
- Gagne XP, or et équipement.

📜 **/eq-quests**  
Quêtes dynamiques générées par IA.  
- Choisis parmi 🅰️🅱️🅾️ options pour avancer dans l’histoire.  
- Décisions impactent récompenses et alignement.

🏪 **/eq-shop**  
Achète armes, armures et potions.  
- Gère ton or et ton inventaire pour progresser.

🎒 **/eq-inventory**  
Consulte et équipe tes objets, armes et potions.  

🏡 **/eq-houses**  
Gère et décore ta maison.  
- Stocke tes objets et ressources.

🛡️ **/eq-guilds**  
Crée ou rejoins une guilde.  
- Collabore avec les membres pour quêtes et combats.

────────────────────────
🔮 **Événements & Bonus :**

😈 **/eq-evil**  
Rejoins Hachigen et explore le côté obscur.  
- Quêtes et pouvoirs exclusifs.

🩺 **/eq-heal**  
Soigne tes PV via potions ou sanctuaires.

👥 **/eq-users**  
Liste des joueurs et classes disponibles.

🏆 **/eq-rankings**  
Classement global selon XP, or, quêtes terminées et victoires.

🛠️ **/eq-admin**  
Commandes réservées aux administrateurs : reset joueur, ajouter or, débloquer quêtes.

────────────────────────
💡 **Conseils pour devenir légendaire :**  
- Vérifie toujours tes PV avant les combats et quêtes.  
- Gère ton inventaire et achète des potions régulièrement.  
- Explore les villages pour débloquer missions spéciales.  
- Tes choix dans les quêtes influencent ton alignement et récompenses.  

🌟 Amuse-toi et deviens un héros légendaire d’**Elfalia Quest** !  
`;

    await api.sendMessage(helpMessage, threadID);
  }
};
