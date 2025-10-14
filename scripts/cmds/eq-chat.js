const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  sendMessage: async (fromUid, toUid, message, api) => {
    // Vérifie si l'utilisateur destinataire existe
    const { data: recipient } = await supabase
      .from('players')
      .select('*')
      .eq('uid', toUid)
      .single();

    if (!recipient) {
      api.sendMessage("❌ L'utilisateur destinataire n'existe pas.", fromUid);
      return;
    }

    // Crée le message
    const messageData = {
      from_uid: fromUid,
      to_uid: toUid,
      message,
      timestamp: new Date().toISOString(),
      delivered: false
    };

    await supabase.from('messages').insert([messageData]);

    // Notifie le destinataire (ex : via thread de groupe ou privé)
    api.sendMessage(`📩 Nouveau message de <@${fromUid}> : "${message}"`, toUid);

    // Confirme l'envoi à l'expéditeur
    api.sendMessage("✅ Message envoyé avec succès !", fromUid);
  },

  getInbox: async (uid, api) => {
    // Récupère tous les messages reçus non lus
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('to_uid', uid)
      .order('timestamp', { ascending: true });

    if (!messages || messages.length === 0) {
      api.sendMessage("📭 Ta boîte de réception est vide.", uid);
      return;
    }

    let inboxText = "📬 Messages reçus :\n";
    messages.forEach(msg => {
      inboxText += `De <@${msg.from_uid}> : "${msg.message}"\n`;
    });

    api.sendMessage(inboxText, uid);

    // Marque tous les messages comme lus
    await supabase.from('messages').update({ delivered: true }).eq('to_uid', uid);
  },

  getOnlinePlayers: async (api) => {
    // Récupère tous les joueurs actuellement connectés
    const { data: players } = await supabase
      .from('players')
      .select('uid, player_name, class, alignment')
      .eq('online', true);

    if (!players || players.length === 0) {
      api.sendMessage("Aucun joueur en ligne actuellement.");
      return;
    }

    let onlineText = "🌐 Joueurs en ligne :\n";
    players.forEach(p => {
      onlineText += `- ${p.player_name} (UID: ${p.uid}, Classe: ${p.class}, Alignement: ${p.alignment})\n`;
    });

    api.sendMessage(onlineText);
  }
};
