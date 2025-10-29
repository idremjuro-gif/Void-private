
//===========================//
// 🎯 1XBET SYSTEM by Merdi Madimba
// Compatible GoatBot v2 Messenger
//===========================//

const fs = require('fs');

module.exports = {
  config: {
    name: "1xbet",
    version: "5.0",
    author: "Merdi Madimba",
    role: 0,
    shortDescription: "Simule un vrai système de paris sportifs",
    longDescription: "Parie sur des matchs virtuels avec plusieurs options comme score exact, double chance, etc.",
    category: "🎮 Jeux",
    guide: {
      en: `/1xbet menu — Voir les options disponibles
/1xbet match — Voir les matchs disponibles
/1xbet bet — Placer un pari
/1xbet result — Voir les résultats
/1xbet balance — Voir ton solde`
    }
  },

  onStart: async function({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const users = global.betUsers || (global.betUsers = {});
    const matches = global.betMatches || (global.betMatches = {});
    const choice = args[0]?.toLowerCase();

    const fmt = n => Number(n).toLocaleString('en-US');

    if (!choice || choice === "menu") {
      return api.sendMessage(
`🎯 𝗠𝗘𝗡𝗨 𝟭𝗫𝗕𝗘𝗧 🎯
━━━━━━━━━━━━━━━━━
🏆 /1xbet match → Voir les matchs du jour
💸 /1xbet bet → Parier sur un match
📊 /1xbet result → Résultats et gains
💰 /1xbet balance → Ton solde
━━━━━━━━━━━━━━━━━
⚽ Options disponibles :
- Score exact
- 1ère/2e mi-temps
- Plus ou moins de buts
- Double chance
- Les deux équipes marquent
- Premier but
- Aucun but
━━━━━━━━━━━━━━━━━`, threadID, messageID);
    }

    // Initialiser utilisateur
    if (!users[senderID]) users[senderID] = { balance: 10000, bets: [] };
    const user = users[senderID];

    // 🔸 Voir solde
    if (choice === "balance") {
      return api.sendMessage(
`💼 Ton solde actuel : ${fmt(user.balance)} $`, threadID, messageID);
    }

    // 🔸 Voir matchs
    if (choice === "match") {
      if (Object.keys(matches).length === 0) {
        matches["001"] = { id: "001", teamA: "PSG", teamB: "Real Madrid", score: null, bets: [] };
        matches["002"] = { id: "002", teamA: "Chelsea", teamB: "Barcelona", score: null, bets: [] };
        matches["003"] = { id: "003", teamA: "Bayern", teamB: "Liverpool", score: null, bets: [] };
      }
      let msg = "📅 𝗠𝗔𝗧𝗖𝗛𝗦 𝗗𝗨 𝗝𝗢𝗨𝗥
━━━━━━━━━━━━━━━
";
      for (const m of Object.values(matches)) {
        msg += `⚽ [${m.id}] ${m.teamA} 🆚 ${m.teamB}
`;
      }
      msg += "
Utilise : /1xbet bet <idMatch> <type> <prédiction> <mise>";
      return api.sendMessage(msg, threadID, messageID);
    }

    // 🔸 Parier
    if (choice === "bet") {
      const [matchId, type, prediction, amountStr] = args.slice(1);
      const amount = parseInt(amountStr);
      const match = matches[matchId];

      if (!match) return api.sendMessage("❌ Match introuvable.", threadID, messageID);
      if (!type || !prediction || isNaN(amount)) return api.sendMessage("⚠️ Syntaxe : /1xbet bet <idMatch> <type> <prédiction> <mise>", threadID, messageID);
      if (user.balance < amount) return api.sendMessage("💸 Solde insuffisant.", threadID, messageID);

      user.balance -= amount;
      match.bets.push({ user: senderID, type, prediction, amount });
      user.bets.push({ matchId, type, prediction, amount });

      return api.sendMessage(
`✅ Pari placé !
🎮 Match : ${match.teamA} vs ${match.teamB}
🎯 Type : ${type}
📊 Prédiction : ${prediction}
💵 Mise : ${fmt(amount)} $`, threadID, messageID);
    }

    // 🔸 Résultat (aléatoire)
    if (choice === "result") {
      if (Object.keys(matches).length === 0)
        return api.sendMessage("⚠️ Aucun match en cours.", threadID, messageID);

      let msg = "🏁 𝗥𝗘́𝗦𝗨𝗟𝗧𝗔𝗧𝗦 𝗗𝗨 𝗝𝗢𝗨𝗥
━━━━━━━━━━━━━━━
";
      for (const m of Object.values(matches)) {
        const scoreA = Math.floor(Math.random() * 5);
        const scoreB = Math.floor(Math.random() * 5);
        m.score = `${scoreA}-${scoreB}`;
        msg += `⚽ ${m.teamA} ${m.score} ${m.teamB}
`;

        for (const b of m.bets) {
          let gain = 0;
          if (b.type === "score" && b.prediction === m.score) gain = b.amount * 5;
          if (b.type === "winner") {
            const winner = scoreA > scoreB ? m.teamA : scoreB > scoreA ? m.teamB : "draw";
            if ((b.prediction === m.teamA && winner === m.teamA) ||
                (b.prediction === m.teamB && winner === m.teamB)) gain = b.amount * 2;
            if (b.prediction === "draw" && winner === "draw") gain = b.amount * 3;
          }
          if (gain > 0) {
            users[b.user].balance += gain;
            msg += `🏆 +${fmt(gain)} $ gagné par ${b.user}
`;
          }
        }
        msg += "━━━━━━━━━━━━━━━
";
      }
      return api.sendMessage(msg, threadID, messageID);
    }
  }
};
