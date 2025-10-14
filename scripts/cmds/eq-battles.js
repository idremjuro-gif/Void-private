const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini / Replicate API pour images et scénarios si nécessaire
const GEMINI_API_KEY = 'AIzaSyBKKDpyaluhRCAh8ikvm-ZFJidtfKBCVNw';
const REPLICATE_API_KEY = 'r8_68TK5E4rBuWhno024hPqxuNVakAgywU38tQVj';
const GEMINI_MODEL = 'gemini-2.5-flash';

module.exports = {
  startBattle: async (uid, opponentUid, api) => {
    // Récupérer les stats des joueurs
    const { data: player } = await supabase.from('players').select('*').eq('uid', uid).single();
    const { data: opponent } = await supabase.from('players').select('*').eq('uid', opponentUid).single();

    if (!player || !opponent) {
      api.sendMessage("Impossible de trouver les joueurs pour le combat.", uid);
      return;
    }

    // Stats de base
    let playerHP = player.hp || 100;
    let opponentHP = opponent.hp || 100;

    // Combat textuel simple PVP
    api.sendMessage(`⚔️ **${player.player_name}** attaque **${opponent.player_name}** !`, uid);

    const rounds = 5;
    for (let i = 0; i < rounds; i++) {
      const playerAttack = Math.floor(Math.random() * 20) + 5; // 5 à 25 dégâts
      const opponentAttack = Math.floor(Math.random() * 20) + 5;

      opponentHP -= playerAttack;
      playerHP -= opponentAttack;

      await api.sendMessage(`Round ${i + 1} :
✅ ${player.player_name} inflige ${playerAttack} dégâts.
❌ ${opponent.player_name} inflige ${opponentAttack} dégâts.
💚 HP restant - ${player.player_name}: ${playerHP > 0 ? playerHP : 0}, ${opponent.player_name}: ${opponentHP > 0 ? opponentHP : 0}`, uid);

      if (playerHP <= 0 || opponentHP <= 0) break;
    }

    // Déterminer le gagnant
    let winner, loser;
    if (playerHP > opponentHP) {
      winner = player.player_name;
      loser = opponent.player_name;
    } else if (opponentHP > playerHP) {
      winner = opponent.player_name;
      loser = player.player_name;
    } else {
      winner = null; // égalité
    }

    if (winner) {
      api.sendMessage(`🏆 **${winner}** a remporté le combat contre **${loser}** !`, uid);
    } else {
      api.sendMessage("⚖️ Le combat se termine sur une égalité !", uid);
    }

    // Mettre à jour les HP des joueurs dans Supabase
    await supabase.from('players').update({ hp: playerHP > 0 ? playerHP : 0 }).eq('uid', uid);
    await supabase.from('players').update({ hp: opponentHP > 0 ? opponentHP : 0 }).eq('uid', opponentUid);
  },

  usePotion: async (uid, potionType, api) => {
    // Récupérer le joueur
    const { data: player } = await supabase.from('players').select('*').eq('uid', uid).single();
    if (!player) return;

    let hpRestore = 0;
    switch (potionType.toLowerCase()) {
      case 'small': hpRestore = 20; break;
      case 'medium': hpRestore = 50; break;
      case 'large': hpRestore = 100; break;
      default: hpRestore = 10; break;
    }

    const newHP = (player.hp || 100) + hpRestore;
    await supabase.from('players').update({ hp: newHP }).eq('uid', uid);

    api.sendMessage(`💊 Tu as utilisé une potion (${potionType}) et récupéré ${hpRestore} HP. HP actuel: ${newHP}`, uid);
  }
};
