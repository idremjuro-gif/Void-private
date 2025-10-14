const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ5...'; // ta clé
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GEMINI_API_KEY = 'AIzaSyBKKDpyaluhRCAh8ikvm-ZFJidtfKBCVNw';
const GEMINI_MODEL = 'gemini-2.5-flash';

const zones = [
  "Village de Luminis",
  "Forêt de Nyra",
  "Montagne d'Aegis",
  "Temple du Crépuscule",
  "Plaines d'Eldora"
];

module.exports = {
  enterWorld: async (uid, api) => {
    const threadID = uid; // Messages privés

    // Place le joueur dans une zone aléatoire au départ
    const startZone = zones[Math.floor(Math.random() * zones.length)];
    const randomX = Math.floor(Math.random() * 500);
    const randomY = Math.floor(Math.random() * 500);

    await supabase.from('map_positions').upsert({
      uid,
      player_name: "",
      location: startZone,
      x: randomX,
      y: randomY
    });

    await api.sendMessage(`🌍 Tu arrives dans la zone **${startZone}**. Explore, rencontre des PNJ et accomplis des quêtes !`, threadID);

    // Boucle pour événements aléatoires
    setInterval(async () => {
      const rand = Math.random();

      // Apparition du roi des enfers Hachigen
      if (rand < 0.05) {
        api.sendMessage(`🔥 Hachigen, le roi des enfers, apparaît ! Il t’invite à rejoindre les ténèbres. Veux-tu accepter ? (oui/non)`, threadID);
      }

      // Rencontres aléatoires
      if (rand >= 0.05 && rand < 0.15) {
        const otherPlayers = await supabase.from('map_positions').select('*').neq('uid', uid);
        if (otherPlayers.data.length > 0) {
          const playerMet = otherPlayers.data[Math.floor(Math.random() * otherPlayers.data.length)];
          api.sendMessage(`⚔️ Tu croises **${playerMet.player_name}** à ${startZone}. Veux-tu : Parler / Coopérer / Combattre ?`, threadID);
        }
      }

      // Quêtes dynamiques
      if (rand >= 0.15 && rand < 0.25) {
        const prompt = `Génère une quête courte pour un joueur dans la zone ${startZone}, avec 3 choix possibles a, b, c.`;
        try {
          const questRes = await axios.post(`https://gemini.googleapis.com/v1/predictions?model=${GEMINI_MODEL}`, {
            prompt
          }, {
            headers: { "Authorization": `Bearer ${GEMINI_API_KEY}` }
          });

          const questText = questRes.data.output || "Un événement mystérieux se produit...";
          api.sendMessage(`📝 Quête disponible :\n${questText}`, threadID);
        } catch (err) {
          console.log("Erreur Gemini quête :", err);
        }
      }
    }, 60000); // toutes les 60 secondes

    // Commandes de déplacement simulées
    api.sendMessage(`Utilise les commandes :\n!move [zone] pour te déplacer.\n!quest pour voir tes quêtes.\n!players pour voir les joueurs en ligne.`, threadID);
  }
};
