const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  showInventory: async (uid, api) => {
    // Récupérer l’inventaire du joueur
    const { data: items } = await supabase
      .from('inventory')
      .select('*')
      .eq('uid', uid);

    if (!items || items.length === 0) {
      api.sendMessage("👜 Ton inventaire est vide.", uid);
      return;
    }

    let inventoryMessage = `👜 **Ton Inventaire**\n\n`;
    items.forEach((item, index) => {
      inventoryMessage += `${index + 1}. ${item.item_name} (${item.item_type})\n`;
    });

    inventoryMessage += `\nPour utiliser un objet, tape : !use [Nom ou ID de l'objet]`;

    api.sendMessage(inventoryMessage, uid);
  },

  useItem: async (uid, itemNameOrId, api) => {
    // Récupérer l’item
    const { data: item } = await supabase
      .from('inventory')
      .select('*')
      .eq('uid', uid)
      .or(`item_name.eq.${itemNameOrId},id.eq.${itemNameOrId}`)
      .single();

    if (!item) {
      api.sendMessage("Objet introuvable dans ton inventaire.", uid);
      return;
    }

    // Exemple d’effet selon type
    let effectMessage = '';
    if (item.item_type === 'potion') {
      // Restaurer PV du joueur
      await supabase.from('players').update({ hp: 100 }).eq('uid', uid);
      effectMessage = `💖 Potion utilisée ! Tes PV sont restaurés à 100.`;
    } else if (item.item_type === 'arme' || item.item_type === 'armure') {
      effectMessage = `⚔️ ${item.item_name} équipé !`;
      // Optionnel : mettre à jour la table players pour arme/armure équipée
      await supabase.from('players').update({ equipped: item.item_name }).eq('uid', uid);
    } else {
      effectMessage = `ℹ️ L’objet ${item.item_name} a été utilisé.`;
    }

    // Supprimer l’objet de l’inventaire si consommable
    if (item.item_type === 'potion') {
      await supabase.from('inventory').delete().eq('id', item.id);
    }

    api.sendMessage(effectMessage, uid);
  }
};
