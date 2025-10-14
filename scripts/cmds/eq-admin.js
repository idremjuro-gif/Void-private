const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  config: {
    name: "eq-admin",
    aliases: ["admin", "eqadmin"],
    version: "1.0",
    author: "Merdi Madimba",
    countDown: 5,
    role: 1, // 1 = admin
    shortDescription: "Commandes administrateurs : reset joueur, ajouter or, débloquer quêtes"
  },

  onCall: async ({ api, event }) => {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const args = event.body.split(' ').slice(1); // arguments après la commande

    // Vérifie si l'utilisateur est admin
    const admins = ['ID_ADMIN_1', 'ID_ADMIN_2']; // remplacer par UID admins
    if (!admins.includes(senderID)) {
      api.sendMessage("❌ Tu n'as pas les droits administrateurs.", threadID);
      return;
    }

    if (args.length === 0) {
      api.sendMessage("⚠️ Commandes disponibles : reset [uid], addgold [uid] [amount], unlockquest [uid] [questID]", threadID);
      return;
    }

    const action = args[0].toLowerCase();

    try {
      if (action === "reset") {
        const targetUID = args[1];
        if (!targetUID) return api.sendMessage("❌ Indique l'UID du joueur à réinitialiser.", threadID);

        await supabase.from('players').delete().eq('uid', targetUID);
        api.sendMessage(`✅ Joueur ${targetUID} réinitialisé avec succès.`, threadID);

      } else if (action === "addgold") {
        const targetUID = args[1];
        const amount = parseInt(args[2]);
        if (!targetUID || isNaN(amount)) return api.sendMessage("❌ Usage : addgold [uid] [amount]", threadID);

        const { data: player } = await supabase.from('players').select('gold').eq('uid', targetUID).single();
        const newGold = (player.gold || 0) + amount;

        await supabase.from('players').update({ gold: newGold }).eq('uid', targetUID);
        api.sendMessage(`💰 ${amount} or ajouté au joueur ${targetUID}. Total : ${newGold}`, threadID);

      } else if (action === "unlockquest") {
        const targetUID = args[1];
        const questID = args[2];
        if (!targetUID || !questID) return api.sendMessage("❌ Usage : unlockquest [uid] [questID]", threadID);

        const { data: player } = await supabase.from('players').select('quests_completed').eq('uid', targetUID).single();
        const updatedQuests = player.quests_completed ? [...player.quests_completed, questID] : [questID];

        await supabase.from('players').update({ quests_completed: updatedQuests }).eq('uid', targetUID);
        api.sendMessage(`✅ Quête ${questID} débloquée pour ${targetUID}.`, threadID);

      } else {
        api.sendMessage("❌ Action inconnue.", threadID);
      }

    } catch (err) {
      console.log("Erreur eq-admin :", err);
      api.sendMessage("⚠️ Une erreur est survenue lors de l'exécution de la commande.", threadID);
    }
  }
};
