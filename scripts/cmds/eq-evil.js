const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  joinEvil: async (uid, api) => {
    // Vérifie si le joueur existe
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('uid', uid)
      .single();

    if (!player) {
      api.sendMessage("❌ Joueur introuvable.", uid);
      return;
    }

    // Vérifie si le joueur est déjà du côté d'Hachigen
    if (player.alignment === 'Ténèbres') {
      api.sendMessage("⚠️ Tu es déjà du côté des ténèbres.", uid);
      return;
    }

    // Demande confirmation
    api.sendMessage("🔥 Hachigen, le roi des enfers, t'invite à rejoindre les ténèbres. Veux-tu accepter ? (oui/non)", uid);

    const handleAnswer = async (event) => {
      if (event.senderID !== uid) return;

      const response = event.body.toLowerCase();
      if (response === 'oui') {
        // Met à jour l'alignement et active les pouvoirs spéciaux
        await supabase.from('players').update({
          alignment: 'Ténèbres',
          evil_powers: ['Shadow Strike', 'Dark Aura', 'Soul Drain']
        }).eq('uid', uid);

        api.sendMessage("😈 Tu as rejoint Hachigen ! Tes pouvoirs des ténèbres ont été activés.", uid);
      } else {
        api.sendMessage("🌟 Tu as refusé l'offre d'Hachigen et restes du côté de la lumière.", uid);
      }

      api.removeListener('message', handleAnswer);
    };

    api.on('message', handleAnswer);
  },

  getEvilPlayers: async (api) => {
    // Récupère tous les joueurs ayant rejoint Hachigen
    const { data: evilPlayers } = await supabase
      .from('players')
      .select('uid, player_name, class, evil_powers')
      .eq('alignment', 'Ténèbres');

    if (!evilPlayers || evilPlayers.length === 0) {
      api.sendMessage("Aucun joueur n’a rejoint Hachigen pour le moment.");
      return;
    }

    let listText = "🌑 Joueurs du côté des ténèbres :\n";
    evilPlayers.forEach(p => {
      listText += `- ${p.player_name} (UID: ${p.uid}, Classe: ${p.class}, Pouvoirs: ${p.evil_powers.join(', ')})\n`;
    });

    api.sendMessage(listText);
  }
};
