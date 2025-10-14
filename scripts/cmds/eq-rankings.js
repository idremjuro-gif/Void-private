const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  config: {
    name: "eq-rankings",
    aliases: ["rankings", "eqrank"],
    version: "1.0",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: "Classement global des joueurs : XP, or, quêtes, victoires"
  },

  showRankings: async (api, event) => {
    const threadID = event.threadID;

    try {
      // Récupère tous les joueurs et tri par XP descendante
      const { data: players } = await supabase
        .from('players')
        .select('player_name, class, xp, gold, quests_completed, victories')
        .order('xp', { ascending: false });

      if (!players || players.length === 0) {
        await api.sendMessage("📜 Aucun joueur trouvé pour le moment.", threadID);
        return;
      }

      let message = "🏆 **Classement des aventuriers d'Elfalia** 🏆\n\n";

      players.forEach((p, index) => {
        message += `${index + 1}. ${p.player_name} (${p.class})\n`;
        message += `XP: ${p.xp || 0}, Or: ${p.gold || 0}, Quêtes: ${p.quests_completed || 0}, Victoires: ${p.victories || 0}\n\n`;
      });

      await api.sendMessage(message, threadID);

    } catch (err) {
      console.log("Erreur eq-rankings :", err);
      await api.sendMessage("❌ Une erreur est survenue lors du chargement du classement.", threadID);
    }
  }
};
