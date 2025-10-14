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
  config: {
    name: "eq-battles",
    aliases: ["elfaliabattle", "EQ-Battle"],
    version: "1.1",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: "Gère les combats PVE (monstres) et PVP (joueurs)"
  },

  startPVE: async (uid, api) => {
    const { data: player } = await supabase.from('players').select('*').eq('uid', uid).single();
    if (!player) return api.sendMessage("Tu dois créer ton personnage avec /eq", uid);

    // Monstres aléatoires pour la quête
    const monsters = [
      { name: "Gobelin des forêts", hp: 30, atk: 5, gold: 10, xp: 15 },
      { name: "Loup corrompu", hp: 50, atk: 8, gold: 20, xp: 25 },
      { name: "Ombre du temple", hp: 70, atk: 12, gold: 35, xp: 40 }
    ];
    const enemy = monsters[Math.floor(Math.random() * monsters.length)];

    let playerHP = player.hp || 100;
    let enemyHP = enemy.hp;

    api.sendMessage(`⚔️ Une rencontre ! **${player.player_name}** affronte **${enemy.name}** !`, uid);

    const fight = async () => {
      if (playerHP <= 0 || enemyHP <= 0) return endBattle();

      const playerAtk = Math.floor(Math.random() * (player.atk || 10)) + 5;
      enemyHP -= playerAtk;
      let message = `✅ ${player.player_name} attaque ${enemy.name} et inflige ${playerAtk} dégâts !\n`;

      if (enemyHP <= 0) {
        message += `🎉 ${player.player_name} a vaincu ${enemy.name} !`;
        return api.sendMessage(message, uid).then(endBattle);
      }

      const enemyAtk = Math.floor(Math.random() * enemy.atk) + 3;
      playerHP -= enemyAtk;
      message += `❌ ${enemy.name} riposte et inflige ${enemyAtk} dégâts !\n💚 HP restant - ${player.player_name}: ${playerHP > 0 ? playerHP : 0}, ${enemy.name}: ${enemyHP}`;
      api.sendMessage(message, uid);

      setTimeout(fight, 3000);
    };

    const endBattle = async () => {
      await supabase.from('players').update({ hp: playerHP > 0 ? playerHP : 0 }).eq('uid', uid);

      if (enemyHP <= 0) {
        const newGold = (player.gold || 0) + enemy.gold;
        const newXP = (player.xp || 0) + enemy.xp;
        await supabase.from('players').update({ gold: newGold, xp: newXP }).eq('uid', uid);
        api.sendMessage(`💰 Récompenses : ${enemy.gold} or et ${enemy.xp} XP !`, uid);
      } else {
        api.sendMessage(`☠️ ${player.player_name} a été vaincu par ${enemy.name}...`, uid);
      }
    };

    fight();
  },

  startPVP: async (uid, targetUid, api) => {
    const { data: player } = await supabase.from('players').select('*').eq('uid', uid).single();
    const { data: opponent } = await supabase.from('players').select('*').eq('uid', targetUid).single();

    if (!player || !opponent) return api.sendMessage("Impossible de trouver les joueurs pour le combat.", uid);

    let playerHP = player.hp || 100;
    let opponentHP = opponent.hp || 100;

    api.sendMessage(`⚔️ **${player.player_name}** attaque **${opponent.player_name}** !`, uid);

    const rounds = 5;
    for (let i = 0; i < rounds; i++) {
      const playerAtk = Math.floor(Math.random() * (player.atk || 10)) + 5;
      const opponentAtk = Math.floor(Math.random() * (opponent.atk || 10)) + 5;

      opponentHP -= playerAtk;
      playerHP -= opponentAtk;

      await api.sendMessage(`Round ${i + 1} :
✅ ${player.player_name} inflige ${playerAtk} dégâts.
❌ ${opponent.player_name} inflige ${opponentAtk} dégâts.
💚 HP restant - ${player.player_name}: ${playerHP > 0 ? playerHP : 0}, ${opponent.player_name}: ${opponentHP > 0 ? opponentHP : 0}`, uid);

      if (playerHP <= 0 || opponentHP <= 0) break;
    }

    let winner = null;
    if (playerHP > opponentHP) winner = player.player_name;
    else if (opponentHP > playerHP) winner = opponent.player_name;

    if (winner) api.sendMessage(`🏆 ${winner} a remporté le combat !`, uid);
    else api.sendMessage("⚖️ Le combat se termine sur une égalité !", uid);

    await supabase.from('players').update({ hp: playerHP > 0 ? playerHP : 0 }).eq('uid', uid);
    await supabase.from('players').update({ hp: opponentHP > 0 ? opponentHP : 0 }).eq('uid', targetUid);
  },

  usePotion: async (uid, potionType, api) => {
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

    api.sendMessage(`💊 ${player.player_name} utilise une potion (${potionType}) et récupère ${hpRestore} HP. HP actuel: ${newHP}`, uid);
  }
};
