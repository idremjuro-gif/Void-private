 // 💸 xset.js — transfert d'argent entre joueurs (compatible 1xbet.js v4.0)
const fs = require("fs");
const path = require("path");

const usersFile = path.join(__dirname, "1xbet-users.json");

// === Chargement & Sauvegarde ===
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(usersFile)); }
  catch { return {}; }
}
function saveUsers(data) {
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "xset",
    version: "4.0",
    author: "Merdi Madimba",
    role: 0,
    description: "Transfère de l'argent à un autre joueur",
    category: "💸 Économie"
  },

  onStart: async function ({ api, event, args }) {
    const { senderID, threadID, messageID, type, messageReply } = event;
    const users = loadUsers();

    // Création automatique du joueur expéditeur
    if (!users[senderID]) {
      let fbName = `Joueur-${senderID}`;
      try {
        const info = await api.getUserInfo(senderID);
        if (info && info[senderID]?.name) fbName = info[senderID].name;
      } catch {}
      users[senderID] = { uid: senderID, name: fbName, money: 0, lastDaily: 0 };
      saveUsers(users);
    }

    const sender = users[senderID];
    const amount = Number(args[0]);

    if (isNaN(amount) || amount <= 0)
      return api.sendMessage("⚠️ Montant invalide. Exemple : /xset 100 @nom", threadID, messageID);

    // Détermination du destinataire
    let targetID;
    if (type === "message_reply") targetID = messageReply.senderID;
    else if (Object.keys(event.mentions || {}).length > 0)
      targetID = Object.keys(event.mentions)[0];
    else if (args[1]) targetID = args[1];
    else
      return api.sendMessage("❌ Mentionne ou réponds à la personne à qui tu veux envoyer de l’argent.", threadID, messageID);

    if (targetID === senderID)
      return api.sendMessage("❌ Tu ne peux pas t’envoyer de l’argent à toi-même.", threadID, messageID);

    // Création automatique du destinataire
    if (!users[targetID]) {
      let fbName = `Joueur-${targetID}`;
      try {
        const info = await api.getUserInfo(targetID);
        if (info && info[targetID]?.name) fbName = info[targetID].name;
      } catch {}
      users[targetID] = { uid: targetID, name: fbName, money: 0, lastDaily: 0 };
    }

    const receiver = users[targetID];

    // Vérification du solde
    if (sender.money < amount)
      return api.sendMessage(`💰 Solde insuffisant. Ton solde actuel est de ${sender.money}$`, threadID, messageID);

    // Transfert d’argent
    sender.money -= amount;
    receiver.money += amount;
    saveUsers(users);

    const msg = `✅ Transfert effectué avec succès !
📤 ${sender.name} → 📥 ${receiver.name}
💸 Montant : ${amount}$
💰 Nouveau solde : ${sender.money}$`;

    return api.sendMessage(msg, threadID, messageID);
  }
};
