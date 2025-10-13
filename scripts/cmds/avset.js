// 💸 avset.js — transfert d'argent entre joueurs Aviator
const fs = require("fs");
const path = require("path");

// === FICHIER DE SAUVEGARDE ===
const dataFile = path.join(__dirname, "aviator-data.json");

if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}));

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "avset",
    version: "1.0",
    author: "Merdi Madimba",
    role: 0,
    category: "🎮 Aviator",
    description: "Transfère de l'argent entre deux joueurs Aviator ✈️",
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, type, messageReply, messageID } = event;
    const data = loadData();

    // Vérifier ou créer l'expéditeur
    if (!data[senderID]) {
      let fbName = `Joueur-${senderID}`;
      try {
        const info = await api.getUserInfo(senderID);
        if (info && info[senderID]?.name) fbName = info[senderID].name;
      } catch {}
      data[senderID] = { money: 0, lastDaily: 0, name: fbName };
      saveData(data);
    }

    const sender = data[senderID];

    // Vérification syntaxe
    if (!args[0])
      return api.sendMessage("❌ Usage : /avset [montant] @mention OU en réponse à un message.", threadID, messageID);

    const amount = Number(args[0]);
    if (isNaN(amount) || amount <= 0)
      return api.sendMessage("⚠️ Montant invalide. Entre un nombre positif.", threadID, messageID);

    // Identifier le destinataire
    let targetID;
    if (type === "message_reply") targetID = messageReply.senderID;
    else if (Object.keys(event.mentions || {}).length > 0)
      targetID = Object.keys(event.mentions)[0];
    else
      return api.sendMessage("❌ Mentionne ou réponds à la personne à qui tu veux envoyer l'argent.", threadID, messageID);

    if (targetID === senderID)
      return api.sendMessage("🚫 Tu ne peux pas t’envoyer de l’argent à toi-même.", threadID, messageID);

    // Créer le destinataire si inexistant
    if (!data[targetID]) {
      let fbName = `Joueur-${targetID}`;
      try {
        const info = await api.getUserInfo(targetID);
        if (info && info[targetID]?.name) fbName = info[targetID].name;
      } catch {}
      data[targetID] = { money: 0, lastDaily: 0, name: fbName };
      saveData(data);
    }

    const receiver = data[targetID];

    // Vérifier le solde du donneur
    if (sender.money < amount)
      return api.sendMessage(`💰 Solde insuffisant. Ton solde actuel : ${sender.money}$`, threadID, messageID);

    // Transfert
    sender.money -= amount;
    receiver.money += amount;
    saveData(data);

    const msg = `✅ Transfert effectué avec succès ✈️
📤 **${sender.name}**
📥 **${receiver.name}**
💸 Montant : ${amount}$
💰 Nouveau solde : ${sender.money}$`;

    return api.sendMessage(msg, threadID, messageID);
  }
};
