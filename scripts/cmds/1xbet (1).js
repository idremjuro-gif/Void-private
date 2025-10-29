const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: '1xbet',
    aliases: ['bet'],
    version: '2.0',
    author: 'Merdi Madimba',
    countDown: 5,
    role: 0,
    shortDescription: 'Système complet de paris sportifs virtuels',
    longDescription: 'Simule un site de paris comme 1XBET avec plusieurs types de paris et solde connecté à /bank.',
    category: '💰 Économie',
    guide: {
      vi: '',
      en: '/1xbet — Ouvre le menu des paris\n/1xbet match <équipe1> vs <équipe2> — Crée un match\n/1xbet bet <type> <mise> — Parie sur un match'
    }
  },

  onStart: async function({ args, event, api, usersData }) {
    const userFile = path.join(__dirname, '1xbet-users.json');
    const matchFile = path.join(__dirname, '1xbet-matches.json');

    // Crée les fichiers s'ils n'existent pas
    if (!fs.existsSync(userFile)) fs.writeFileSync(userFile, JSON.stringify({}, null, 2));
    if (!fs.existsSync(matchFile)) fs.writeFileSync(matchFile, JSON.stringify([], null, 2));

    const users = JSON.parse(fs.readFileSync(userFile));
    const matches = JSON.parse(fs.readFileSync(matchFile));
    const uid = event.senderID;

    // Initialise le compte utilisateur s'il n'existe pas
    if (!users[uid]) {
      users[uid] = { balance: 1000, history: [] };
      fs.writeFileSync(userFile, JSON.stringify(users, null, 2));
    }

    const sub = args[0];

    // Affichage du menu principal
    if (!sub) {
      const menu = `💸 𝗠𝗘𝗡𝗨 𝟭𝗫𝗕𝗘𝗧 💸

🎮 | Commandes disponibles :
━━━━━━━━━━━━━━━━━━━
⚽ /1xbet match <équipe1> vs <équipe2> → Créer un match
💰 /1xbet bet <type> <mise> → Parier sur un match existant
📊 /1xbet mybets → Voir vos paris
🏦 /bank → Consulter ou recharger votre solde

🎯 | Types de paris disponibles :
━━━━━━━━━━━━━━━━━━━
1️⃣ Plus de buts 1ʳᵉ mi‑temps
2️⃣ Score exact
3️⃣ Over/Under (Plus ou Moins de buts)
4️⃣ Double chance
5️⃣ Les deux équipes marquent (BTTS)
6️⃣ Aucun but
7️⃣ Première ou dernière équipe à marquer
8️⃣ Minute du premier but
9️⃣ Carton rouge / Pénalty / Tête

💵 Votre solde actuel : ${users[uid].balance} 💸`;
      return api.sendMessage(menu, event.threadID, event.messageID);
    }

    // Créer un match
    if (sub === 'match') {
      const teams = args.slice(1).join(' ').split('vs');
      if (teams.length !== 2) return api.sendMessage('⚠️ Format : /1xbet match <équipe1> vs <équipe2>', event.threadID, event.messageID);
      const match = { id: Date.now(), team1: teams[0].trim(), team2: teams[1].trim(), status: 'open', bets: [] };
      matches.push(match);
      fs.writeFileSync(matchFile, JSON.stringify(matches, null, 2));
      return api.sendMessage(`✅ Match créé : ${match.team1} vs ${match.team2}`, event.threadID, event.messageID);
    }

    // Parier
    if (sub === 'bet') {
      const type = args[1];
      const amount = parseInt(args[2]);
      if (!type || isNaN(amount)) return api.sendMessage('⚠️ Format : /1xbet bet <type> <mise>', event.threadID, event.messageID);
      if (amount > users[uid].balance) return api.sendMessage('💀 Solde insuffisant ! Rechargez avec /bank', event.threadID, event.messageID);

      // On prend le dernier match ouvert
      const openMatch = matches.find(m => m.status === 'open');
      if (!openMatch) return api.sendMessage('⚠️ Aucun match ouvert. Créez-en un avec /1xbet match', event.threadID, event.messageID);

      users[uid].balance -= amount;
      openMatch.bets.push({ user: uid, type, amount });
      users[uid].history.push({ match: `${openMatch.team1} vs ${openMatch.team2}`, type, amount, result: 'En attente' });

      fs.writeFileSync(userFile, JSON.stringify(users, null, 2));
      fs.writeFileSync(matchFile, JSON.stringify(matches, null, 2));

      return api.sendMessage(`✅ Pari placé : ${type} (${amount}💰) sur ${openMatch.team1} vs ${openMatch.team2}`, event.threadID, event.messageID);
    }

    // Voir ses paris
    if (sub === 'mybets') {
      const userBets = users[uid].history;
      if (!userBets.length) return api.sendMessage('🕹️ Vous n’avez encore aucun pari.', event.threadID, event.messageID);

      let msg = '📜 Historique de vos paris :\n━━━━━━━━━━━━━━━━━━━\n';
      for (const bet of userBets) {
        msg += `⚽ ${bet.match}\n💬 Type : ${bet.type}\n💰 Mise : ${bet.amount}\n📈 Résultat : ${bet.result}\n━━━━━━━━━━━━━━━\n`;
      }
      return api.sendMessage(msg, event.threadID, event.messageID);
    }
  }
};