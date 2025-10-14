const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  config: {
    name: "eq-users",
    aliases: ["eqplayers", "playerslist"],
    version: "1.0",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: "Voir tous les joueurs enregistrés et leur classe"
  },

  onCall: async ({ api, event }) => {
    const threadID = event.threadID;

    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('uid, player_name, class, alignment');

      if (error) {
        api.sendMessage("❌ Erreur lors de la récupération des joueurs.", threadID);
        return;
      }

      if (!players || players.length === 0) {
        api.sendMessage("Aucun joueur enregistré pour le moment.", threadID);
        return;
      }

      let message = "🎮 **Liste des joueurs Elfalia Quest**\n\n";
      players.forEach((p, index) => {
        message += `${index + 1}. ${p.player_name} | Classe: ${p.class} | Alignement: ${p.alignment} | UID: ${p.uid}\n`;
      });

      api.sendMessage(message, threadID);
    } catch (err) {
      console.log("Erreur récupération joueurs :", err);
      api.sendMessage("⚠️ Impossible de récupérer les joueurs pour le moment.", threadID);
    }
  }
};
