const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  openShop: async (uid, api) => {
    // Récupérer le joueur
    const { data: player } = await supabase.from('players').select('*').eq('uid', uid).single();
    if (!player) {
      api.sendMessage("Impossible de trouver ton profil pour accéder à la boutique.", uid);
      return;
    }

    // Exemple d'items disponibles
    const shopItems = [
      { id: 1, name: "Épée de feu", type: "arme", price: 100 },
      { id: 2, name: "Armure de fer", type: "armure", price: 150 },
      { id: 3, name: "Potion de soin", type: "potion", price: 50 }
    ];

    let shopMessage = `🏪 **Boutique d'Elfalia**\nTon or : ${player.gold || 0}\n\nItems disponibles :\n`;
    shopItems.forEach(item => {
      shopMessage += `• ${item.name} (${item.type}) - ${item.price} gold - ID: ${item.id}\n`;
    });

    shopMessage += `\nPour acheter un item, réponds par : !buy [ID]`;

    api.sendMessage(shopMessage, uid);
  },

  buyItem: async (uid, itemId, api) => {
    // Récupérer le joueur
    const { data: player } = await supabase.from('players').select('*').eq('uid', uid).single();
    if (!player) {
      api.sendMessage("Profil introuvable pour effectuer l'achat.", uid);
      return;
    }

    // Liste d'exemple des items
    const shopItems = [
      { id: 1, name: "Épée de feu", type: "arme", price: 100 },
      { id: 2, name: "Armure de fer", type: "armure", price: 150 },
      { id: 3, name: "Potion de soin", type: "potion", price: 50 }
    ];

    const item = shopItems.find(it => it.id == itemId);
    if (!item) {
      api.sendMessage("Item invalide.", uid);
      return;
    }

    if ((player.gold || 0) < item.price) {
      api.sendMessage("Tu n'as pas assez d'or pour cet achat.", uid);
      return;
    }

    // Débiter l'or et ajouter l'item à l'inventaire
    const updatedGold = (player.gold || 0) - item.price;
    await supabase.from('players').update({ gold: updatedGold }).eq('uid', uid);

    // Ajouter à l'inventaire
    await supabase.from('inventory').insert([{ uid, item_name: item.name, item_type: item.type }]);

    api.sendMessage(`✅ Tu as acheté **${item.name}** pour ${item.price} gold.\nOr restant : ${updatedGold}`, uid);
  }
};
