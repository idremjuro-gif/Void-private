const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  viewHouse: async (uid, api) => {
    const { data: house } = await supabase
      .from('houses')
      .select('*')
      .eq('uid', uid)
      .single();

    if (!house) {
      api.sendMessage("🏠 Tu n’as pas encore de maison. Tape !buyhouse pour en acquérir une.", uid);
      return;
    }

    let houseMessage = `🏠 **Ta Maison**\n\n`;
    houseMessage += `Type: ${house.house_type}\n`;
    houseMessage += `Décorations: ${house.decorations || 'Aucune'}\n`;
    houseMessage += `Capacité de stockage: ${house.storage_capacity}\n`;
    houseMessage += `Objets stockés: ${house.stored_items || 'Aucun'}\n`;

    api.sendMessage(houseMessage, uid);
  },

  buyHouse: async (uid, houseType, api) => {
    // Vérifier si joueur a déjà une maison
    const { data: existingHouse } = await supabase
      .from('houses')
      .select('*')
      .eq('uid', uid)
      .single();

    if (existingHouse) {
      api.sendMessage("❌ Tu as déjà une maison. Tu peux la rénover ou vendre tes décorations.", uid);
      return;
    }

    // Créer maison de base
    const houseData = {
      uid,
      house_type: houseType,
      decorations: '',
      storage_capacity: 10,
      stored_items: ''
    };

    await supabase.from('houses').insert([houseData]);
    api.sendMessage(`🎉 Maison de type **${houseType}** achetée avec succès !`, uid);
  },

  decorateHouse: async (uid, decoration, api) => {
    const { data: house } = await supabase
      .from('houses')
      .select('*')
      .eq('uid', uid)
      .single();

    if (!house) {
      api.sendMessage("❌ Tu n’as pas de maison pour ajouter une décoration.", uid);
      return;
    }

    const newDecor = house.decorations ? house.decorations + ', ' + decoration : decoration;
    await supabase.from('houses').update({ decorations: newDecor }).eq('uid', uid);

    api.sendMessage(`✨ Décoration **${decoration}** ajoutée à ta maison !`, uid);
  },

  storeItem: async (uid, itemName, api) => {
    const { data: house } = await supabase
      .from('houses')
      .select('*')
      .eq('uid', uid)
      .single();

    if (!house) {
      api.sendMessage("❌ Tu n’as pas de maison pour stocker cet objet.", uid);
      return;
    }

    let stored = house.stored_items ? house.stored_items + ', ' + itemName : itemName;
    await supabase.from('houses').update({ stored_items: stored }).eq('uid', uid);

    api.sendMessage(`📦 Objet **${itemName}** stocké dans ta maison !`, uid);
  }
};
