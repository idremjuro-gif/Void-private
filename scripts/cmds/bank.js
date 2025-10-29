//===========================//
// 💰 BANK SYSTEM by Merdi Madimba
// Compatible GoatBot v2 Messenger
//===========================//

module.exports = {
  config: {
    name: "bank",
    version: "1.0",
    author: "Merdi Madimba",
    role: 0,
    shortDescription: "Système bancaire virtuel",
    longDescription: "Crée un compte, dépose, retire, emprunte et fais du trading.",
    category: "💰 Économie",
    guide: {
      en: `
🏦 /bank menu — Voir le menu complet
🏦 /bank create — Créer un compte bancaire (500 $)
🏦 /bank deposit <montant> — Déposer de l'argent (min. 2000 $)
🏦 /bank withdraw <montant> — Retirer de l'argent
🏦 /bank loan <montant> — Faire un prêt (remb. 5 min)
🏦 /bank trade — Faire du trading (Bitcoin / Forex / Miner)
🏦 /bank balance — Voir ton solde
`
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const users = global.bankUsers || (global.bankUsers = {});
    const user = users[senderID] || null;
    const choice = args[0]?.toLowerCase();

    // 💠 Fonction d'affichage formaté
    const fmt = (num) => Number(num).toLocaleString("en-US");

    // 💬 Menu principal
    if (!choice || choice === "menu") {
      return api.sendMessage(
`🟦━━━━━━━━━━━━━━━━━━━━━🟦
💰 𝐒𝐘𝐒𝐓𝐄̀𝐌𝐄 𝐁𝐀𝐍𝐂𝐀𝐈𝐑𝐄 💰
🟦━━━━━━━━━━━━━━━━━━━━━🟦

🏦 1. /bank create → Créer un compte (500 $)
💵 2. /bank deposit <montant> → Dépôt (min. 2000 $, bonus 10 %)
💸 3. /bank withdraw <montant> → Retrait
💳 4. /bank loan <montant> → Prêt (remb. 5 min)
📈 5. /bank trade → Trading (Bitcoin / Forex / Mining)
💼 6. /bank balance → Voir ton solde

🪙 Banques disponibles :
- RawBank 🏦
- PayPal 💳
- MasterCard 💰
- Visa 💸
- Binance 🪙

🟪━━━━━━━━━━━━━━━━━━━━━🟪
Utilise /bank help pour plus d'infos.
`, threadID, messageID);
    }

    // 🔐 Création de compte
    if (choice === "create") {
      if (user) return api.sendMessage("⚠️ Tu as déjà un compte bancaire.", threadID, messageID);

      users[senderID] = {
        bank: null,
        balance: 0,
        password: null,
        loan: null,
        createdAt: Date.now()
      };

      return api.sendMessage(
`🏦 Choisis ta banque :
1️⃣ RawBank
2️⃣ PayPal
3️⃣ MasterCard
4️⃣ Visa
5️⃣ Binance

💡 Réponds avec le numéro de la banque choisie.`, threadID, (err, info) => {
        global.client.handleReply.push({
          type: "chooseBank",
          name: this.config.name,
          messageID: info.messageID,
          author: senderID
        });
      });
    }

    // 💰 Dépôt
    if (choice === "deposit") {
      if (!user) return api.sendMessage("🚫 Tu n’as pas encore de compte. Fais /bank create.", threadID, messageID);
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount < 2000)
        return api.sendMessage("⚠️ Le dépôt minimum est de 2000 $.", threadID, messageID);
      const bonus = amount * 0.1;
      user.balance += amount + bonus;

      return api.sendMessage(
`✅ Dépôt effectué !
💵 Montant : ${fmt(amount)} $
🎁 Bonus : +${fmt(bonus)} $
🏦 Nouveau solde : ${fmt(user.balance)} $`, threadID, messageID);
    }

    // 💸 Retrait
    if (choice === "withdraw") {
      if (!user) return api.sendMessage("🚫 Tu n’as pas de compte.", threadID, messageID);
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) return api.sendMessage("⚠️ Montant invalide.", threadID, messageID);
      if (user.balance < amount) return api.sendMessage("💰 Solde insuffisant.", threadID, messageID);

      user.balance -= amount;
      return api.sendMessage(
`💸 Retrait réussi !
Montant retiré : ${fmt(amount)} $
💼 Nouveau solde : ${fmt(user.balance)} $`, threadID, messageID);
    }

    // 💳 Prêt
    if (choice === "loan") {
      if (!user) return api.sendMessage("🚫 Crée un compte d’abord.", threadID, messageID);
      if (user.loan) return api.sendMessage("⚠️ Tu as déjà un prêt en cours.", threadID, messageID);

      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) return api.sendMessage("⚠️ Montant invalide.", threadID, messageID);

      const interest = Math.floor(amount * 0.15);
      const total = amount + interest;
      user.balance += amount;
      user.loan = { amount: total, takenAt: Date.now() };

      api.sendMessage(
`💳 Prêt accordé !
💰 Montant : ${fmt(amount)} $
📈 Intérêts : ${fmt(interest)} $
🕒 Remboursement automatique dans 5 minutes.`, threadID, messageID);

      setTimeout(() => {
        if (users[senderID] && users[senderID].loan) {
          users[senderID].balance -= users[senderID].loan.amount;
          api.sendMessage(
`⏰ Prêt remboursé automatiquement !
💸 Montant total déduit : ${fmt(users[senderID].loan.amount)} $`, threadID);
          delete users[senderID].loan;
        }
      }, 5 * 60 * 1000);
    }

    // 📈 Trading
    if (choice === "trade") {
      if (!user) return api.sendMessage("🚫 Crée un compte d’abord.", threadID, messageID);
      const actions = ["💹 Bitcoin", "📊 Forex", "⛏️ Miner"];
      const gains = [0.25, -0.1, 0.5, -0.2, 0.35, -0.15];
      const pick = gains[Math.floor(Math.random() * gains.length)];
      const base = user.balance;
      const profit = Math.floor(base * pick);
      user.balance += profit;

      const result = pick > 0 ? "📈 Gain" : "📉 Perte";
      return api.sendMessage(
`${result} sur ton trading (${actions[Math.floor(Math.random() * actions.length)]}) !
💰 Résultat : ${fmt(profit)} $
💼 Nouveau solde : ${fmt(user.balance)} $`, threadID, messageID);
    }

    // 💼 Solde
    if (choice === "balance") {
      if (!user) return api.sendMessage("🚫 Crée un compte avec /bank create.", threadID, messageID);
      return api.sendMessage(
`🏦 Banque : ${user.bank || "Non définie"}
💰 Solde : ${fmt(user.balance)} $
${user.loan ? `💳 Prêt restant : ${fmt(user.loan.amount)} $` : "✅ Aucun prêt en cours."}`, threadID, messageID);
    }
  },

  // 🔁 Gestion du choix de la banque
  onReply: async function ({ api, event, handleReply }) {
    const { author, type } = handleReply;
    if (event.senderID !== author) return;

    if (type === "chooseBank") {
      const banks = ["RawBank", "PayPal", "MasterCard", "Visa", "Binance"];
      const idx = parseInt(event.body);
      if (isNaN(idx) || idx < 1 || idx > banks.length)
        return api.sendMessage("⚠️ Numéro invalide. Réessaye.", event.threadID);

      const users = global.bankUsers;
      const user = users[event.senderID];
      user.bank = banks[idx - 1];
      user.balance = 0;

      api.sendMessage(
`✅ Compte créé avec succès !
🏦 Banque : ${user.bank}
💰 Solde initial : 0 $
🔐 Tu pourras déposer dès maintenant !`, event.threadID);
    }
  }
};
