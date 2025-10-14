const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini / Replicate API pour génération d’images de cartes
const GEMINI_API_KEY = 'AIzaSyBKKDpyaluhRCAh8ikvm-ZFJidtfKBCVNw';
const REPLICATE_API_KEY = 'r8_68TK5E4rBuWhno024hPqxuNVakAgywU38tQVj';
const GEMINI_MODEL = 'gemini-2.5-flash';

module.exports = {
  generateMap: async (api, threadID) => {
    // Récupère toutes les positions des joueurs
    const { data: positions } = await supabase
      .from('map_positions')
      .select('*');

    // Crée un prompt pour Gemini/Replicate afin de générer la carte avec les joueurs
    let mapPrompt = `Create a detailed fantasy world map, showing villages, forests, mountains, and dungeons. Place the following players as markers on the map with their names: `;
    positions.forEach(p => {
      mapPrompt += `${p.player_name} at (${p.x},${p.y}), `;
    });
    mapPrompt += "Fantasy style, full color, top-down view, beautiful illustration.";

    // Génération de l’image via Replicate
    let mapImageUrl = "";
    try {
      const response = await axios.post('https://api.replicate.com/v1/predictions', {
        version: "flux-pro",
        input: { prompt: mapPrompt }
      }, {
        headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }
      });

      mapImageUrl = response.data.output[0];
    } catch (err) {
      console.log("Erreur génération carte :", err);
      mapImageUrl = ""; // fallback
    }

    // Envoie la carte dans le chat
    await api.sendMessage({
      body: "🗺️ Voici la carte actuelle du monde avec les positions des joueurs :",
      attachment: mapImageUrl ? await api.getStreamFromURL(mapImageUrl) : undefined
    }, threadID);
  },

  updatePlayerPosition: async (uid, newZone, api) => {
    // Génère des coordonnées aléatoires dans la zone
    const randomX = Math.floor(Math.random() * 1000);
    const randomY = Math.floor(Math.random() * 1000);

    // Récupère le nom du joueur
    const { data: player } = await supabase
      .from('players')
      .select('player_name')
      .eq('uid', uid)
      .single();

    // Mets à jour la position dans Supabase
    await supabase.from("map_positions").upsert({
      uid,
      player_name: player.player_name,
      location: newZone,
      x: randomX,
      y: randomY
    });

    api.sendMessage(`🧭 Tu es maintenant dans **${newZone}**.`, uid);
  }
};
