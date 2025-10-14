const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  config: {
    name: "eq-heal",
    aliases: ["heal", "potions", "sanctuary"],
    version: "1.0",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: "Soigner les joueurs, utiliser des potions ou sanctuaires"
  },

  onCall: async ({ api, event }) => {
    const uid = event.senderID;
    const threadID = event.threadID;

    try {
      // Récupère le joueur
      const { data: player, error } = await supabase
        .from('players')
        .select('player_name, hp, max_hp, inventory')
        .eq('uid', uid)
        .single();

      if (error || !player) {
        api.sendMessage("❌ Joueur introuvable.", threadID);
        return;
      }

      let message = `💖 **${player.player_name}** - PV : ${player.hp}/${player.max_hp}\n\n`;
      message += "Que souhaites-tu faire ?\n";
      message += "A. Utiliser une potion\nB. Se rendre au sanctuaire\nC. Annuler";

      api.sendMessage(message, threadID);

      const handleChoice = async (answerEvent) => {
        if (answerEvent.senderID !== uid) return;

        const choice = answerEvent.body.toLowerCase();
        api.removeListener('message', handleChoice);

        if (choice === 'a') {
          // Cherche potion dans inventaire
          const potions = player.inventory?.filter(i => i.type === 'potion') || [];
          if (potions.length === 0) {
            api.sendMessage("❌ Tu n'as pas de potion dans ton inventaire.", threadID);
            return;
          }
          const potion = potions[0];
          player.hp = Math.min(player.max_hp, player.hp + potion.heal);
          player.inventory = player.inventory.filter(i => i !== potion);

          // Mise à jour Supabase
          await supabase.from('players').update({
            hp: player.hp,
            inventory: player.inventory
          }).eq('uid', uid);

          api.sendMessage(`💊 Tu as utilisé une potion et récupéré ${potion.heal} PV ! PV actuels : ${player.hp}/${player.max_hp}`, threadID);
        } else if (choice === 'b') {
          player.hp = player.max_hp;
          await supabase.from('players').update({ hp: player.hp }).eq('uid', uid);
          api.sendMessage(`⛩️ Tu es allé au sanctuaire. Tes PV sont complètement restaurés : ${player.hp}/${player.max_hp}`, threadID);
        } else {
          api.sendMessage("⚠️ Action annulée.", threadID);
        }
      };

      api.on('message', handleChoice);

    } catch (err) {
      console.log("Erreur eq-heal :", err);
      api.sendMessage("⚠️ Impossible d'accéder au système de soins pour le moment.", threadID);
    }
  }
};
