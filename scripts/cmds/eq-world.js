const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini / Replicate API
const GEMINI_API_KEY = 'AIzaSyBKKDpyaluhRCAh8ikvm-ZFJidtfKBCVNw';
const REPLICATE_API_KEY = 'r8_68TK5E4rBuWhno024hPqxuNVakAgywU38tQVj';
const GEMINI_MODEL = 'gemini-2.5-flash';

const worldZones = [
  "Village d’Aeloria",
  "Forêt de Nyra",
  "Montagnes de Khazar",
  "Temple du Crépuscule",
  "Donjon du Vent",
  "Plaine d’Orval"
];

module.exports = {
  enterWorld: async (uid, api) => {
    // Récupérer le nom du joueur
    const { data: player } = await supabase
      .from("players")
      .select("*")
      .eq("uid", uid)
      .single();

    // Définir position aléatoire au départ
    const startZone = worldZones[Math.floor(Math.random() * worldZones.length)];
    const randomX = Math.floor(Math.random() * 1000);
    const randomY = Math.floor(Math.random() * 1000);

    await supabase.from("map_positions").upsert({
      uid,
      player_name: player.player_name,
      location: startZone,
      x: randomX,
      y: randomY
    });

    api.sendMessage(`🌍 Bienvenue dans **${startZone}**, **${player.player_name}** ! Explore et découvre les quêtes !`, uid);

    // Boucle d'événements aléatoires (Hachigen, monstres, rencontres)
    setInterval(async () => {
      const rand = Math.random();

      // 5% de chance : apparition Hachigen
      if (rand < 0.05) {
        api.sendMessage(`🔥 **Hachigen, le roi des enfers**, apparaît ! Il t’invite à rejoindre les ténèbres. Veux-tu accepter ? (oui/non)`, uid);
      }

      // 10% de chance : rencontre un monstre
      else if (rand < 0.15) {
        api.sendMessage(`⚔️ Un monstre sauvage apparaît dans **${startZone}** ! Prépare-toi au combat.`, uid);
      }

      // 20% de chance : PNJ ou événement aléatoire
      else if (rand < 0.35) {
        api.sendMessage(`🧙‍♂️ Un PNJ mystérieux te salue dans **${startZone}**. Veux-tu lui parler ? (oui/non)`, uid);
      }
    }, 60000);

    // Fonction pour déplacer le joueur
    module.exports.movePlayer = async (uid, newZone, api) => {
      const randomX = Math.floor(Math.random() * 1000);
      const randomY = Math.floor(Math.random() * 1000);

      await supabase.from("map_positions").upsert({
        uid,
        player_name: player.player_name,
        location: newZone,
        x: randomX,
        y: randomY
      });

      api.sendMessage(`🧭 Tu arrives maintenant dans **${newZone}**.`, uid);
    };
  }
};
