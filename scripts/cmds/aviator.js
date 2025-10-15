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

const activeGames = {}; // parties actives par salon
const OWNER_ID = "100065927401614"; // Ton UID pour récupérer les pertes

module.exports = {
  config: {
    name: "aviator",
    version: "6.3",
    author: "Merdi Madimba",
    role: 0,
    category: "🎮 Jeux",
    description: "Jeu de pari Aviator ✈️ réaliste et imprévisible jusqu’à 500 000x — commandes via /aviator ou /av",
    aliases: ["av"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const data = loadData();

    // Init joueur
    if (!data[senderID]) data[senderID] = { money: 0, lastDaily: 0, name: "" };
    if (!data[OWNER_ID]) data[OWNER_ID] = { money: 0, lastDaily: 0, name: "Propriétaire" };

    if (!data[senderID].name) {
      try {
        const info = await api.getUserInfo(senderID);
        data[senderID].name = info[senderID]?.name || "Joueur inconnu";
      } catch {
        data[senderID].name = "Joueur inconnu";
      }
      saveData(data);
    }

    const user = data[senderID];
    const sub = args[0]?.toLowerCase();

    // === MENU PRINCIPAL ===
    if (!sub) {
      const imageURL = "http://goatbiin.onrender.com/QOehEbv-y.jpg";
      const body = `🎰 **𝘼𝙑𝙄𝘼𝙏𝙊𝙍 𝙂𝘼𝙈𝙀 !** ✈️
💸 Jeu de pari rapide et risqué
🔥 Gagne jusqu'à 500 000x !

📃 **Commandes :**
🎰 /aviator bet [montant] → lancer une mise (min 20$)
💳 /aviator solde → voir ton solde
💵 /aviator daily → réclamer 200$ / jour
♻️ /aviator cash → retirer l'argent durant le vol
🗂️ /aviator top → top 10 des plus riches
📋 /aviator help → aide rapide

⚠️ Seul le joueur ayant lancé la partie peut utiliser /cash pendant le vol.`;

      try {
        return api.sendMessage({ body, attachment: await global.utils.getStreamFromURL(imageURL) }, threadID, messageID);
      } catch {
        return api.sendMessage(body, threadID, messageID);
      }
    }

    // === SOUS-COMMANDES ===
    switch (sub) {
      case "help":
        return api.sendMessage(`📘 **Aviator Help**
• /aviator bet [montant] → proposer une mise
• /aviator solde → voir ton solde
• /aviator daily → réclamer 200$ / jour
• /aviator cash → retirer l'argent durant le vol
• /aviator top → top 10 des plus riches`, threadID);

      case "solde":
        return api.sendMessage(`💰 ${user.name}, ton solde est de **${user.money}$**`, threadID);

      case "daily": {
        const now = Date.now();
        if (now - (user.lastDaily || 0) < 24 * 60 * 60 * 1000) {
          const h = Math.ceil((24 * 60 * 60 * 1000 - (now - (user.lastDaily || 0))) / (1000 * 60 * 60));
          return api.sendMessage(`🕒 Reviens dans ${h}h pour réclamer ton bonus.`, threadID);
        }
        user.money += 200;
        user.lastDaily = now;
        saveData(data);
        return api.sendMessage(`✅ +200$ ajoutés à ton solde ! Nouveau solde : ${user.money}$`, threadID);
      }

      case "top": {
        const sorted = Object.entries(data)
          .sort((a, b) => b[1].money - a[1].money)
          .slice(0, 10);
        const msg = sorted.map(([id, u], i) => `${i + 1}. 🏅 ${u.name} → ${u.money}$`).join("\n");
        return api.sendMessage(`🏆 Top 10 joueurs :\n\n${msg}`, threadID);
      }

      case "bet": {
        const amount = parseFloat(args[1]);
        if (!amount || amount < 20) return api.sendMessage("❌ Montant invalide. Mise minimale : 20$", threadID);
        if (user.money < amount) return api.sendMessage("❌ Solde insuffisant.", threadID);
        if (activeGames[threadID]) return api.sendMessage("⏳ Une partie est déjà en cours ici.", threadID);

        user.money -= amount;
        saveData(data);

        startAviatorGame(api, threadID, senderID, amount);
        return api.sendMessage(`💸 ${user.name} a misé **${amount}$**. L’avion décolle ! Utilise /aviator cash pour retirer avant le crash.`, threadID);
      }

      case "cash": {
        const game = activeGames[threadID];
        if (!game || game.player !== senderID) return api.sendMessage("🚫 Aucune partie en cours pour toi.", threadID);
        if (game.crashed || game.state !== "running") return api.sendMessage("🚀 Trop tard ! L’avion a déjà crashé.", threadID);

        const gain = Math.floor(game.bet * game.currentMultiplier);
        user.money += gain;
        saveData(data);

        clearInterval(game.interval);
        delete activeGames[threadID];

        return api.sendMessage(`💰 Retrait réussi à **${game.currentMultiplier.toFixed(2)}x** ! Tu gagnes **${gain}$** 🎉`, threadID);
      }

      default:
        return api.sendMessage("⚠️ Commande inconnue. Tape /aviator help pour la liste.", threadID);
    }
  }
};

// === LOGIQUE DU JEU AVIATOR ===
function startAviatorGame(api, threadID, playerID, bet) {
  const data = loadData();
  const user = data[playerID];

  const game = activeGames[threadID] = {
    player: playerID,
    bet,
    multiplier: 1.0,
    currentMultiplier: 1.0,
    crashed: false,
    state: "running"
  };

  const crashPoint = generateCrashPoint();
  api.sendMessage(`🛫 L'avion commence à avancer. Utilise /aviator cash pour retirer ton argent avant le crash !`, threadID);

  game.interval = setInterval(() => {
    if (!activeGames[threadID]) return clearInterval(game.interval);

    let jump = Math.random() * (game.multiplier < 5 ? 1.2 : game.multiplier < 20 ? 3 : game.multiplier < 100 ? 10 : 50);
    game.multiplier += jump;
    game.currentMultiplier = game.multiplier;

    if (Math.random() < 0.03 || game.multiplier >= crashPoint) {
      clearInterval(game.interval);
      game.crashed = true;
      game.state = "finished";

      // Transfert du pari perdu vers ton solde
      data[OWNER_ID].money += game.bet;
      saveData(data);

      api.sendMessage(`💥🔴 L'avion a crashé à **${game.multiplier.toFixed(2)}x** ! ${user.name} a perdu **${game.bet}$**.`, threadID);
      delete activeGames[threadID];
      return;
    }

    const effect = ["✈️", "🚀", "💨", "🔥"][Math.floor(Math.random() * 4)];
    api.sendMessage(`${effect} Multiplicateur : **${game.multiplier.toFixed(2)}x**`, threadID);
  }, 1200);
}

function generateCrashPoint() {
  const r = Math.random() * 100;
  if (r < 50) return 1 + Math.random() * 1.5;
  if (r < 70) return 2.5 + Math.random() * 7.5;
  if (r < 80) return 10 + Math.random() * 40;
  if (r < 85) return 50 + Math.random() * 150;
  if (r < 90) return 200 + Math.random() * 300;
  if (r < 95) return 500 + Math.random() * 4500;
  if (r < 97) return 5000 + Math.random() * 20000;
  if (r < 99) return 25000 + Math.random() * 75000;
  return 100000 + Math.random() * 400000;
}
