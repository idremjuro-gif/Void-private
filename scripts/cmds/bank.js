// 🏦 bank.js — by Merdi Madimba (v1.0 relié à 1xbet.js)
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "bank",
    version: "3.6",
    author: "Merdi Madimba",
    role: 0,
    shortDescription: "Système bancaire connecté à 1xbet",
    longDescription: "Gère ton argent entre la banque et le solde 1xbet (même JSON).",
    category: "💰 Économie"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const dataFile = path.join(__dirname, "1xbet-users.json");

    // création du fichier si absent
    if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}));

    function loadUsers() {
      try {
        return JSON.parse(fs.readFileSync(dataFile));
      } catch {
        return {};
      }
    }

    function saveUsers(users) {
      fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
    }

    const users = loadUsers();

    // si utilisateur absent, initialiser (cohérent avec 1xbet.js)
    if (!users[senderID]) {
      let fbName = `Joueur-${senderID}`;
      try {
        const info = await api.getUserInfo(senderID);
        if (info && info[senderID]?.name) fbName = info[senderID].name;
      } catch {}
      users[senderID] = {
        uid: senderID,
        name: fbName,
        money: 1000,
        lastDaily: 0,
        bankBalance: 0,
        bankLoan: null
      };
      saveUsers(users);
    } else {
      // garantir les champs
      users[senderID].money = users[senderID].money || 0;
      users[senderID].bankBalance = users[senderID].bankBalance || 0;
      if (!("bankLoan" in users[senderID])) users[senderID].bankLoan = null;
      saveUsers(users);
    }

    const user = users[senderID];
    const choice = args[0]?.toLowerCase();
    const fmt = (n) => Number(n).toLocaleString("en-US");
    const deco = (txt) => `🄿🄾🄻🅈 • ${txt}`;

    if (!choice || choice === "menu") {
      return api.sendMessage(
`🟦━━━━━━━━━━━━━━━━━━━━━🟦
💰 𝐒𝐘𝐒𝐓È𝐌𝐄 𝐁𝐀𝐍𝐂𝐀𝐈𝐑𝐄 💰
🟦━━━━━━━━━━━━━━━━━━━━━🟦

🏦 Commandes principales :
• /bank create — Créer ton compte
• /bank deposit <montant> — Déposer (depuis ton solde 1xbet)
• /bank withdraw <montant> — Retirer (vers ton solde 1xbet)
• /bank loan <montant> — Emprunter (remb. 5 min)
• /bank trade — Trading (Bitcoin / Forex / Miner)
• /bank balance — Voir ton solde (banque + 1xbet)

🟪━━━━━━━━━━━━━━━━━━━━━🟪`, threadID, messageID);
    }

    // create
    if (choice === "create") {
      return api.sendMessage(
`✅ ${deco("Compte bancaire créé !")}
💼 Solde bancaire : ${fmt(user.bankBalance)} $
🎯 Pour déposer : /bank deposit <montant> (depuis 1xbet)`, threadID, messageID);
    }

    // deposit (from 1xbet -> bank, +10% bonus)
    if (choice === "deposit") {
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount < 2000)
        return api.sendMessage("⚠️ Le dépôt minimum est de 2000 $", threadID, messageID);
      if (user.money < amount)
        return api.sendMessage("❌ Solde insuffisant sur ton compte 1xbet.", threadID, messageID);

      const bonus = Math.floor(amount * 0.1);
      user.money -= amount;
      user.bankBalance += amount + bonus;
      saveUsers(users);

      return api.sendMessage(
`💵 ${deco("Dépôt réussi !")}
┌─────────────
│ Retiré de 1xbet : ${fmt(amount)} $
│ Bonus bancaire : +${fmt(bonus)} $
│ Nouveau solde bancaire : ${fmt(user.bankBalance)} $
│ Solde 1xbet restant : ${fmt(user.money)} $
└─────────────`, threadID, messageID);
    }

    // withdraw (from bank -> 1xbet)
    if (choice === "withdraw") {
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) return api.sendMessage("⚠️ Montant invalide", threadID, messageID);
      if (user.bankBalance < amount) return api.sendMessage("💰 Solde bancaire insuffisant", threadID, messageID);

      user.bankBalance -= amount;
      user.money += amount;
      saveUsers(users);

      return api.sendMessage(
`💸 ${deco("Retrait effectué !")}
┌─────────────
│ Transféré vers 1xbet : ${fmt(amount)} $
│ Nouveau solde bancaire : ${fmt(user.bankBalance)} $
│ Solde 1xbet actuel : ${fmt(user.money)} $
└─────────────`, threadID, messageID);
    }

    // loan
    if (choice === "loan") {
      if (user.bankLoan) return api.sendMessage("⚠️ Tu as déjà un prêt en cours.", threadID, messageID);
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) return api.sendMessage("⚠️ Montant invalide", threadID, messageID);
      const interest = Math.floor(amount * 0.15);
      const total = amount + interest;
      user.bankBalance += amount;
      user.bankLoan = { amount: total, takenAt: Date.now() };
      saveUsers(users);

      api.sendMessage(
`💳 ${deco("Prêt accordé !")}
┌─────────────
│ Montant : ${fmt(amount)} $
│ Intérêts : ${fmt(interest)} $
│ Nouveau solde bancaire : ${fmt(user.bankBalance)} $
└─────────────
⏰ Remboursement automatique dans 5 minutes.`, threadID, messageID);

      setTimeout(() => {
        const stored = loadUsers();
        if (stored[senderID] && stored[senderID].bankLoan) {
          stored[senderID].bankBalance -= stored[senderID].bankLoan.amount;
          try {
            api.sendMessage(
`⏰ ${deco("Prêt remboursé !")}
💸 Déduit : ${fmt(stored[senderID].bankLoan.amount)} $
💼 Solde bancaire : ${fmt(stored[senderID].bankBalance)} $`, threadID);
          } catch (e) {}
          delete stored[senderID].bankLoan;
          saveUsers(stored);
        }
      }, 5 * 60 * 1000);
      return;
    }

    // trade
    if (choice === "trade") {
      if (user.bankBalance < 1000)
        return api.sendMessage("⚠️ Tu dois avoir au moins 1000 $ en banque pour trader.", threadID, messageID);

      // user-requested percentages:
      const actions = {
        "💹 Bitcoin": { min: -0.5, max: 0.5 }, // ±50%
        "📊 Forex": { min: -0.2, max: 0.2 },   // ±20%
        "⛏️ Miner": { min: 0.2, max: 0.2 }     // +20% fixed after 2 min
      };

      const keys = Object.keys(actions);
      const action = keys[Math.floor(Math.random() * keys.length)];
      const range = actions[action];

      if (action === "⛏️ Miner") {
        api.sendMessage(
`⛏️ ${deco("Mining en cours !")}
💼 Solde bancaire : ${fmt(user.bankBalance)} $
⏱️ Les gains (+20%) seront ajoutés dans 2 minutes...`, threadID, messageID);

        setTimeout(() => {
          const stored = loadUsers();
          if (!stored[senderID]) return;
          const profit = Math.floor(stored[senderID].bankBalance * 0.2);
          stored[senderID].bankBalance += profit;
          saveUsers(stored);
          try {
            api.sendMessage(
`🎉 ${deco("Mining terminé !")}
💰 Gain : ${fmt(profit)} $
💼 Nouveau solde bancaire : ${fmt(stored[senderID].bankBalance)} $`, threadID);
          } catch (e) {}
        }, 2 * 60 * 1000);
        return;
      }

      const pct = Math.random() * (range.max - range.min) + range.min;
      const profit = Math.floor(user.bankBalance * pct);
      user.bankBalance += profit;
      saveUsers(users);
      const result = profit > 0 ? "📈 Gain" : "📉 Perte";

      return api.sendMessage(
`🟦━━━━━━━━━━━━━━━━━━━━━🟦
💰 TRADING - ${action} 💰
🟦━━━━━━━━━━━━━━━━━━━━━🟦
🏦 Avant trading : ${fmt(user.bankBalance - profit)} $
💹 Variation : ${(pct * 100).toFixed(2)}%
${result} : ${fmt(profit)} $
💼 Nouveau solde : ${fmt(user.bankBalance)} $
🟪━━━━━━━━━━━━━━━━━━━━━🟪
${profit > 0 ? "🎉 Félicitations pour le profit !" : "⚠️ Perte subie, prudence la prochaine fois !"}`, threadID, messageID);
    }

    // balance
    if (choice === "balance") {
      return api.sendMessage(
`💼 ${deco("Situation financière")}
┌─────────────
│ 💳 Banque : ${fmt(user.bankBalance)} $
│ 💸 1xbet : ${fmt(user.money)} $
│ ${user.bankLoan ? `📉 Prêt restant : ${fmt(user.bankLoan.amount)} $` : "✅ Aucun prêt en cours"}
└─────────────`, threadID, messageID);
    }

    return api.sendMessage("❌ Commande inconnue. Utilise /bank menu pour voir les options.", threadID, messageID);
  }
};
