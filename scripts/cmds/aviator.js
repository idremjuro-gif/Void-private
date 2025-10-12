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

module.exports = {
  config: {
    name: "aviator",
    version: "6.1",
    author: "Merdi Madimba",
    role: 0,
    category: "🎮 Jeux",
    description: "Jeu de pari Aviator ✈️ réaliste et imprévisible jusqu’à 500 000x — commandes via /aviator ou /av",
    aliases: ["av"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const data = loadData();

    if (!data[senderID]) data[senderID] = { money: 0, lastDaily: 0, name: "" };

    // Récupérer nom utilisateur si vide
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
💸 𝙅𝙚𝙪 𝙙𝙚 𝙥𝙖𝙧𝙞 𝙧𝙖𝙥𝙞𝙙𝙚 𝙚𝙩 𝙧𝙞𝙨𝙦𝙪é
🔥 𝙂𝙖𝙜𝙣𝙚 𝙟𝙪𝙨𝙦𝙪'à 500 000𝙭  !

📃 **𝘾𝙤𝙢𝙢𝙖𝙣𝙙𝙚𝙨 𝘿𝙞𝙨𝙥𝙤𝙣𝙞𝙗𝙡𝙚 :**
🎰• /aviator bet [montant] → lancer une mise (min 20$)
💳• /aviator solde → voir ton solde
💵• /aviator daily → réclamer 200$ / jour
♻️• /aviator cash → retirer l'argent durant le vol (seul le joueur)
🗂️• /aviator top → top 10 des plus riches
📋• /aviator help → aide rapide

⚠️ 𝙎𝙚𝙪𝙡 𝙡𝙚 𝙟𝙤𝙪𝙚𝙪𝙧 𝙖𝙮𝙖𝙣𝙩 𝙡𝙖𝙣𝙘é 𝙡𝙖 𝙥𝙖𝙧𝙩𝙞𝙚 𝙥𝙚𝙪𝙩 𝙪𝙩𝙞𝙡𝙞𝙨𝙚𝙧 ⓒⓐⓢⓗ 𝙥𝙚𝙣𝙙𝙖𝙣𝙩 𝙡𝙚 𝙫𝙤𝙡.`;

      try {
        return api.sendMessage({ body, attachment: await global.utils.getStreamFromURL(imageURL) }, threadID, messageID);
      } catch {
        return api.sendMessage(body, threadID, messageID);
      }
    }

    // === SOUS-COMMANDES ===
    switch (sub) {
      case "help":
        return api.sendMessage(`📘 **𝘼𝙑𝙄𝘼𝙏𝙊𝙍 𝙃𝙀𝙇𝙋**
• /aviator bet [montant] → 𝘱𝘳𝘰𝘱𝘰𝘴𝘦𝘳 𝘶𝘯𝘦 𝘮𝘪𝘴𝘦
• /aviator solde → 𝘷𝘰𝘪𝘳 ton 𝘴𝘰𝘭𝘥𝘦
• /aviator daily → 𝘳é𝘤𝘭𝘢𝘮𝘦𝘳 200$ / 𝘫𝘰𝘶𝘳
• /aviator cash → 𝘳𝘦𝘵𝘪𝘳𝘦𝘳 𝘭'𝘢𝘳𝘨𝘦𝘯𝘵 𝘥𝘶𝘳𝘢𝘯𝘵 𝘭𝘦 𝘷𝘰𝘭
• /aviator top → 𝘵𝘰𝘱 10 𝘥𝘦𝘴 𝘱𝘭𝘶𝘴 𝘳𝘪𝘤𝘩𝘦𝘴`, threadID);

      case "solde": {
        const usr = data[senderID];
        return api.sendMessage(`💰 ${usr.name}, 𝕥𝕠𝕟 𝕤𝕠𝕝𝕕𝕖 𝕖𝕤𝕥 𝕕𝕖 **${usr.money}$**.`, threadID);
      }

      case "daily": {
        const usr = data[senderID];
        const now = Date.now();
        if (now - (usr.lastDaily || 0) < 24 * 60 * 60 * 1000) {
          const h = Math.ceil((24 * 60 * 60 * 1000 - (now - (usr.lastDaily || 0))) / (1000 * 60 * 60));
          return api.sendMessage(`🕒 ℝ𝕖𝕧𝕚𝕖𝕟𝕤 𝕕𝕒𝕟𝕤 ${h}h 𝕡𝕠𝕦𝕣 𝕣é𝕔𝕝𝕒𝕞𝕖𝕣 𝕥𝕠𝕟 𝕓𝕠𝕟𝕦𝕤.`, threadID);
        }
        usr.money += 200;
        usr.lastDaily = now;
        saveData(data);
        return api.sendMessage(`✅ 𝕋𝕦 𝕒𝕤 𝕣𝕖ç𝕦 **200$** ! ℕ𝕠𝕦𝕧𝕖𝕒𝕦 𝕤𝕠𝕝𝕕𝕖 : ${usr.money}$`, threadID);
      }

      case "top": {
        const sorted = Object.entries(data)
          .sort((a, b) => b[1].money - a[1].money)
          .slice(0, 10);
        const msg = sorted.map(([id, u], i) => `${i + 1}. 🏅 ${u.name || `Joueur-${id}`} → ${u.money}$`).join("\n");
        return api.sendMessage(`🏆 **𝕋𝕠𝕡 10 𝕓𝕖𝕤𝕥  :**\n\n${msg}`, threadID);
      }

      case "bet": {
        const amount = parseFloat(args[1]);
        if (!amount || amount < 20) return api.sendMessage("❌ 𝕄𝕠𝕟𝕥𝕒𝕟𝕥 𝕚𝕟𝕧𝕒𝕝𝕚𝕕𝕖. 𝕄𝕚𝕤𝕖 𝕞𝕚𝕟𝕚𝕞𝕒𝕝𝕖 : 20$", threadID);
        if (data[senderID].money < amount) return api.sendMessage("❌ 𝕊𝕠𝕝𝕕𝕖 𝕚𝕟𝕤𝕦𝕗𝕗𝕚𝕤𝕒𝕟𝕥.", threadID);

        if (activeGames[threadID]) return api.sendMessage("⏳ 𝙐𝙣𝙚 𝙥𝙖𝙧𝙩𝙞𝙚 𝙚𝙨𝙩 𝙙é𝙟à 𝙚𝙣 𝙘𝙤𝙪𝙧𝙨 𝙙𝙖𝙣𝙨 𝙘𝙚 𝙨𝙖𝙡𝙤𝙣. 𝘼𝙩𝙩𝙚𝙣𝙙𝙨 𝙡𝙖 𝙛𝙞𝙣.", threadID);

        // Déduire la mise et lancer le jeu
        data[senderID].money -= amount;
        saveData(data);

        startAviatorGame(api, threadID, senderID, amount);
        return api.sendMessage(`💸 ${data[senderID].name} 𝙖 𝙢𝙞𝙨é **${amount}$**. L’𝘢𝘷𝘪𝘰𝘯 𝘥é𝘤𝘰𝘭𝘭𝘦 ! 🚀 𝘜𝘵𝘪𝘭𝘪𝘴𝘦 /𝘢𝘷𝘪𝘢𝘵𝘰𝘳 𝘤𝘢𝘴𝘩 𝘰𝘶 /𝘢𝘷 𝘤𝘢𝘴𝘩 𝘱𝘰𝘶𝘳 𝘳𝘦𝘵𝘪𝘳𝘦𝘳 𝘢𝘷𝘢𝘯𝘵 𝘭𝘦 𝘥é𝘱𝘢𝘳𝘵.`, threadID);
      }

      case "cash": {
        const game = activeGames[threadID];
        if (!game || game.player !== senderID) return api.sendMessage("🚫 𝘼𝙪𝙘𝙪𝙣𝙚 𝙥𝙖𝙧𝙩𝙞𝙚 𝙚𝙣 𝙘𝙤𝙪𝙧𝙨 𝙥𝙤𝙪𝙧 𝙩𝙤𝙞 𝙙𝙖𝙣𝙨 𝙘𝙚 𝙨𝙖𝙡𝙤𝙣.", threadID);
        if (game.crashed || game.state !== "running") return api.sendMessage("🚀 𝙏𝙧𝙤𝙥 𝙩𝙖𝙧𝙙 ! L’𝙖𝙫𝙞𝙤𝙣 𝙚𝙨𝙩 𝙙é𝙟à 𝙥𝙖𝙧𝙩𝙞 💥", threadID);

        // Gain basé sur le multiplicateur actuel
        const gain = Math.floor(game.bet * game.currentMultiplier);
        data[senderID].money += gain;
        saveData(data);

        clearInterval(game.interval);
        delete activeGames[threadID];

        return api.sendMessage(`💰 𝘙𝘦𝘵𝘳𝘢𝘪𝘵 𝘳é𝘶𝘴𝘴𝘪 à **${game.currentMultiplier.toFixed(2)}x** ! 𝘛𝘶 𝘨𝘢𝘨𝘯𝘦𝘴 **${gain}$** 🎉`, threadID);
      }

      default:
        return api.sendMessage("⚠️ 𝘾𝙤𝙢𝙢𝙖𝙣𝙙𝙚 𝙄𝙣𝙘𝙤𝙣𝙣𝙚. 𝙏𝙖𝙥𝙚 /aviator help 𝙥𝙤𝙪𝙧 𝙫𝙤𝙞𝙧 𝙡𝙖 𝙡𝙞𝙨𝙩𝙚 𝙙𝙚𝙨 𝙩â𝙘𝙝𝙚𝙨.", threadID);
    }
  }
};

// === LOGIQUE DU JEU AVIATOR ===
async function startAviatorGame(api, threadID, playerID, bet) {
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
  api.sendMessage(`🛫 𝙇'𝙖𝙫𝙞𝙤𝙣 𝘾𝙤𝙢𝙢𝙚𝙣𝙘𝙚 𝙖 𝙖𝙫𝙖𝙣𝙘𝙚𝙧. 𝙛𝙖𝙞𝙩 /𝙖𝙫 𝙘𝙖𝙨𝙝 𝙥𝙤𝙪𝙧 𝙧𝙚𝙩𝙞𝙧é 𝙩𝙤𝙣 𝙖𝙧𝙜𝙚𝙣𝙩 𝙖𝙫𝙖𝙣𝙩 𝙡𝙚 𝙙𝙚𝙥𝙖𝙚𝙩 𝙙𝙚 𝙡'𝙖𝙫𝙞𝙤𝙣 💥`, threadID);

  game.interval = setInterval(() => {
    if (!activeGames[threadID]) return clearInterval(game.interval);

    let jump = Math.random() * (game.multiplier < 5 ? 1.2 : game.multiplier < 20 ? 3 : game.multiplier < 100 ? 10 : 50);
    game.multiplier += jump;
    game.currentMultiplier = game.multiplier;

    if (Math.random() < 0.03 || game.multiplier >= crashPoint) {
      clearInterval(game.interval);
      game.crashed = true;
      game.state = "finished";
      api.sendMessage(`💥🔴 𝙇'𝙖𝙫𝙞𝙤𝙣 𝙖 𝙙é𝙘𝙤𝙡𝙚𝙧 à **${game.multiplier.toFixed(2)}x** ! ${user.name} 𝙏𝙪 𝙫𝙞𝙚𝙣𝙨 𝙙𝙚 𝙥𝙚𝙧𝙙𝙧𝙚 𝙩𝙤𝙣 𝙥𝙖𝙧𝙞𝙨💥🔴`, threadID);
      delete activeGames[threadID];
      return;
    }

    const effect = ["✈️", "🚀", "💨", "🔥"][Math.floor(Math.random() * 4)];
    api.sendMessage(`${effect} Multiplicateur : **${game.multiplier.toFixed(2)}x**`, threadID);
  }, 1200);
}

// === POINT DE CRASH ALÉATOIRE ===
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
