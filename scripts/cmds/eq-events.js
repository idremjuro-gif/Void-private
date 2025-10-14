const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  config: {
    name: "eq-events",
    aliases: ["events", "eqevents"],
    version: "1.0",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: "Événements dynamiques et mondiaux : boss, catastrophes, quêtes"
  },

  startEvents: async (api) => {
    // Boucle pour déclencher des événements toutes les minutes
    setInterval(async () => {
      try {
        // Sélection aléatoire d'un joueur
        const { data: players } = await supabase.from('players').select('uid, player_name, location');
        if (!players || players.length === 0) return;

        const randomIndex = Math.floor(Math.random() * players.length);
        const player = players[randomIndex];

        // Événement aléatoire : boss, faille, catastrophe
        const events = [
          `🌌 Une faille dimensionnelle apparaît près de ${player.location}. Les aventuriers sont appelés !`,
          `🔥 Un monstre ténébreux attaque ${player.location}. Qui relèvera le défi ?`,
          `⚡ Une tempête magique frappe ${player.location}. Les aventuriers doivent se protéger !`
        ];

        const randomEvent = events[Math.floor(Math.random() * events.length)];

        await api.sendMessage(randomEvent, player.uid);

      } catch (err) {
        console.log("Erreur eq-events :", err);
      }
    }, 60000); // toutes les 60 secondes
  }
};
