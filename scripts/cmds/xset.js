// 💸 xset.js — transfert d'argent entre joueurs
const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "1xbet-data.json");

// === Chargement & Sauvegarde ===
function loadData() {
  try { return JSON.parse(fs.readFileSync(dataFile)); }
  catch { return {}; }
}
function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "xset",
    version: "1.0",
    author: "Merdi Madimba",
    role: 0,
    description: "Transfère une somme d'argent à un autre joueur",
    category: "💸 Économie"
  },

  onStart: async function ({ api, event, args }) {
    const data = loadData();
    const { senderID, threadID, messageID, type, messageReply } = event;

    // Vérification du solde de l'expéditeur
    if (!data[senderID]) {
      let fbName = `Joueur-${senderID}`;
      try {
        const info = await api.getUserInfo(senderID);
        if (info && info[senderID]?.name) fbName = info[senderID].name;
      } catch {}
      data[senderID] = { money: 0, lastDaily: 0, name: fbName, bets: [] };
      saveData(data);
    }

    const sender = data[senderID];
    if (!args[0] && type !== "message_reply")
      return api.sendMessage("❌ Usage : /xset [montant] @mention OU en réponse à un message", threadID, messageID);

    const amount = Number(args[0]);
    if (isNaN(amount) || amount <= 0)
      return api.sendMessage("⚠️ Montant invalide. Entre un nombre positif.", threadID, messageID);

    // Déterminer le destinataire
    let targetID;
    if (type === "message_reply") targetID = messageReply.senderID;
    else if (Object.keys(event.mentions || {}).length > 0)
      targetID = Object.keys(event.mentions)[0];
    else if (args[1]) targetID = args[1];
    else
      return api.sendMessage("❌ Mentionne ou réponds à la personne à qui tu veux envoyer l'argent.", threadID, messageID);

    if (targetID === senderID)
      return api.sendMessage("❌ Tu ne peux pas t’envoyer de l’argent à toi-même.", threadID, messageID);

    // Création du destinataire s'il n'existe pas
    if (!data[targetID]) {
      let fbName = `Joueur-${targetID}`;
      try {
        const info = await api.getUserInfo(targetID);
        if (info && info[targetID]?.name) fbName = info[targetID].name;
      } catch {}
      data[targetID] = { money: 0, lastDaily: 0, name: fbName, bets: [] };
    }

    const receiver = data[targetID];

    // Vérif solde suffisant
    if (sender.money < amount)
      return api.sendMessage(`💰 Solde insuffisant. Ton solde actuel : ${sender.money}$`, threadID, messageID);

    // Transfert
    sender.money -= amount;
    receiver.money += amount;
    saveData(data);

    const msg = `✅ Transfert réussi !
📤 ${sender.name} → 📥 ${receiver.name}
💸 Montant : ${amount}$
💰 Nouveau solde : ${sender.money}$`;

    return api.sendMessage(msg, threadID, messageID);
  }
};
