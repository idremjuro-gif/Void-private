// 🏆 1xbet.js
const fs = require("fs");
const path = require("path");

// === FICHIERS / CONSTANTES ===
const dataFile = path.join(__dirname, "1xbet-data.json");
const matchesFile = path.join(__dirname, "1xbet-matches.json");
const teamsFile = path.join(__dirname, "teams.json");

// Création fichiers si inexistants
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}));
if (!fs.existsSync(matchesFile)) fs.writeFileSync(matchesFile, JSON.stringify([]));
if (!fs.existsSync(teamsFile)) throw new Error("❌ Fichier teams.json introuvable !");

// === UTILITAIRES DE FICHIERS ===
function loadData() {
  try { return JSON.parse(fs.readFileSync(dataFile)); }
  catch { return {}; }
}
function saveData(data) { fs.writeFileSync(dataFile, JSON.stringify(data, null, 2)); }

function loadMatches() {
  try { return JSON.parse(fs.readFileSync(matchesFile)); }
  catch { return []; }
}
function saveMatches(matches) { fs.writeFileSync(matchesFile, JSON.stringify(matches, null, 2)); }

// === CONSTANTES DU JEU ===
const teams = JSON.parse(fs.readFileSync(teamsFile));
const MIN_BET = 20;
const DAILY_AMOUNT = 200;
const MATCH_COUNT = 5;
const RESOLVE_TIME = 30 * 1000; // 30 secondes
const WELCOME_IMAGE = "http://goatbiin.onrender.com/GBhPN2QYD.png";

// === OUTILS ===
function randomInt(max) { return Math.floor(Math.random() * (max + 1)); }

function pickTwoDistinct(arr) {
  const i = randomInt(arr.length - 1);
  let j;
  do j = randomInt(arr.length - 1); while (j === i);
  return [arr[i], arr[j]];
}

function computeOdds(A, B) {
  const drawProb = 0.15;
  const total = A.strength + B.strength;
  const probA = (A.strength / total) * (1 - drawProb);
  const probB = (B.strength / total) * (1 - drawProb);
  const probN = drawProb;
  const randomizer = () => 0.9 + Math.random() * 0.3;

  return {
    A: Number((1 / probA * randomizer()).toFixed(2)),
    N: Number((1 / probN * randomizer()).toFixed(2)),
    B: Number((1 / probB * randomizer()).toFixed(2)),
  };
}

// === MATCHES ===
let matches = loadMatches();
let nextMatchId = matches.reduce((max, m) => Math.max(max, m.id), 0) + 1;

function createMatches(threadID, count = MATCH_COUNT) {
  const newMatches = [];
  for (let i = 0; i < count; i++) {
    const [teamA, teamB] = pickTwoDistinct(teams);
    const odds = computeOdds(teamA, teamB);
    const match = {
      id: nextMatchId++,
      teamA,
      teamB,
      odds,
      status: "open",
      createdAt: Date.now(),
      createdInThread: threadID,
      bets: [],
    };
    matches.push(match);
    newMatches.push(match);
  }
  saveMatches(matches);
  return newMatches;
}

function closeMatchAndScheduleResolve(match) {
  if (match.status !== "open") return;
  match.status = "closed";
  saveMatches(matches);
  setTimeout(() => resolveMatch(match.id), RESOLVE_TIME);
}

// === RÉSOLUTION DE MATCH ===
function resolveMatch(matchId) {
  const data = loadData();
  const match = matches.find(m => m.id === matchId);
  if (!match || match.status === "finished") return;

  // Génère un score réaliste (0 à 5)
  const goalsA = randomInt(5);
  const goalsB = randomInt(5);
  const score = `${goalsA}-${goalsB}`;
  match.score = score;
  match.status = "finished";

  // Détermine le résultat
  let result;
  if (goalsA > goalsB) result = "A";
  else if (goalsB > goalsA) result = "B";
  else result = "N";
  match.result = result;

  const threadToNotify = match.createdInThread;
  let recap = `🏁 𝙍é𝙨𝙪𝙡𝙩𝙖𝙩 𝙈𝙖𝙩𝙘𝙝 ${match.id}\n⚽ ${match.teamA.name} ${score} ${match.teamB.name}\n`;

  const resText = result === "N"
    ? "⚖️ 𝙈𝙖𝙩𝙘𝙝 𝙉𝙪𝙡"
    : `🏆 ${(result === "A" ? match.teamA.name : match.teamB.name)} 𝙖 𝙜𝙖𝙜𝙣é !`;
  recap += `🎯 𝙍é𝙨𝙪𝙡𝙩𝙖𝙩 : ${resText}\n\n`;

  let gainsText = "";

  // Paiement des paris
  for (const bet of match.bets) {
    const user = data[bet.user];
    if (!user) continue;
    const userBet = user.bets.find(b => b.matchID === match.id && b.status === "pending");

    if (bet.choice === result) {
      const gain = Math.floor(bet.amount * bet.odds);
      user.money += gain;
      bet.status = "win";
      bet.gain = gain;
      if (userBet) {
        userBet.status = "win";
        userBet.gain = gain;
      }
      gainsText += `✅ ${user.name} a gagné **${gain}$**\n`;
    } else {
      bet.status = "lose";
      if (userBet) userBet.status = "lose";
      gainsText += `❌ ${user.name} a perdu (${bet.amount}$)\n`;
    }
  }

  saveData(data);
  saveMatches(matches);

  if (threadToNotify) {
    try {
      global.api.sendMessage(`${recap}${gainsText || "Aucun pari enregistré pour ce match."}`, threadToNotify);
    } catch (err) {
      console.error("Erreur d’envoi du résultat :", err);
    }
  }
}

// === EXPORT COMMANDE ===
module.exports = {
  config: {
    name: "1xbet",
    aliases: ["bet"], 
    version: "2.0",
    author: "Merdi Madimba",
    role: 0,
    description: "Simulation de paris sportifs avec cotes, résultats et classement global.",
    category: "🎮 Jeux"
  },

  onStart: async function ({ api, event, args }) {
    global.api = api;
    const { threadID, senderID, messageID } = event;
    const data = loadData();

    // Init joueur
    if (!data[senderID]) {
      let fbName = `Joueur-${senderID}`;
      try {
        const info = await api.getUserInfo(senderID);
        if (info && info[senderID]?.name) fbName = info[senderID].name;
      } catch { }
      data[senderID] = { money: 0, lastDaily: 0, name: fbName, bets: [] };
      saveData(data);
    }

    const user = data[senderID];
    const cmd = (args[0] || "").toLowerCase();

    // === MENU ===
    if (!cmd) {
      const body = `🏟️ 1𝙓𝘽𝙀𝙏 𝙋𝘼𝙍𝙄𝙎 𝙎𝙋𝙊𝙍𝙏𝙄𝙁 🏟️

⚽ /bet matches → 𝗩𝗼𝗶𝗿 𝗹𝗲𝘀 𝗺𝗮𝘁𝗰𝗵𝘀
🎰 /bet bet [ID] [A|N|B] [montant]
👤 /bet mybets → 𝗧𝗲𝘀 𝗽𝗮𝗿𝗶𝘀
💵 /bet solde → 𝗧𝗼𝗻 𝘀𝗼𝗹𝗱𝗲
💳 /bet daily → 𝗕𝗼𝗻𝘂𝘀 +${DAILY_AMOUNT}$
🏆 /bet top → 𝗧𝗼𝗽 10 𝗱𝗲𝗱 𝗺𝗲𝗶𝗹𝗹𝗲𝘂𝗿𝘀 𝗷𝗼𝘂𝗲𝘂𝗿𝘀`;

      try {
        const stream = await global.utils.getStreamFromURL(WELCOME_IMAGE);
        return api.sendMessage({ body, attachment: stream }, threadID, messageID);
      } catch {
        return api.sendMessage(body, threadID, messageID);
      }
    }

    // === COMMANDES ===
    switch (cmd) {
      case "matches": {
        let open = matches.filter(m => m.status === "open" && m.createdInThread === threadID);
        if (!open.length) open = createMatches(threadID, MATCH_COUNT);
        const list = open.map(m =>
          `📍 𝗠𝗮𝘁𝗰𝗵 ${m.id}\n⚽ ${m.teamA.name} 🆚 ${m.teamB.name}\n📈 𝗖𝗼𝘁𝗲𝘀 → 🅰️ ${m.odds.A} | 🟰 ${m.odds.N} | 🅱️ ${m.odds.B}\n⏱ 𝗦𝘁𝗮𝘁𝘂𝘁 : ${m.status}`
        ).join("\n\n");
        return api.sendMessage(`📋 𝗠𝗔𝗧𝗖𝗛𝗦 𝗗𝗜𝗦𝗣𝗢𝗡𝗜𝗕𝗟𝗘𝗦 :\n\n${list}`, threadID, messageID);
      }

      case "solde":
        return api.sendMessage(`💰 ${user.name}, ton solde est de **${user.money}$**`, threadID, messageID);

      case "daily": {
        const now = Date.now();
        if (now - (user.lastDaily || 0) < 24 * 60 * 60 * 1000)
          return api.sendMessage("🕒 Reviens dans 24h pour réclamer ton bonus.", threadID, messageID);
        user.money += DAILY_AMOUNT;
        user.lastDaily = now;
        saveData(data);
        return api.sendMessage(`✅ +${DAILY_AMOUNT}$ ajoutés à ton solde !`, threadID, messageID);
      }

      // 🏆 CLASSEMENT GLOBAL
      case "top": {
        const players = Object.values(data)
          .map(u => ({ name: u.name || "Joueur", money: u.money || 0 }))
          .sort((a, b) => b.money - a.money)
          .slice(0, 10);

        if (!players.length)
          return api.sendMessage("📭 Aucun joueur enregistré pour le moment.", threadID, messageID);

        const medals = ["🥇", "🥈", "🥉"];
        const topList = players.map((p, i) => {
          const icon = medals[i] || "🏅";
          return `${icon} ${i + 1}. ${p.name} — ${p.money}$`;
        }).join("\n");

        return api.sendMessage(
          `🏆 𝙏𝙊𝙋 𝟏𝟎 𝙅𝙊𝙐𝙀𝙐𝙍𝙎 1𝙓𝘽𝙀𝙏 🏆\n\n${topList}`,
          threadID,
          messageID
        );
      }

      case "mybets": {
        if (!user.bets.length) return api.sendMessage("📭 Aucun pari enregistré.", threadID, messageID);
        const list = user.bets.slice(-10).reverse().map(b => {
          const m = matches.find(x => x.id === b.matchID);
          const status = b.status === "win" ? "✅ Gagné" :
                         b.status === "lose" ? "❌ Perdu" :
                         "⏳ En attente";
          const gainText = b.gain ? ` | Gain: ${b.gain}$` : "";
          return `🎯 𝗠𝗮𝘁𝗰𝗵 ${b.matchID} (${m ? `${m.teamA.name} vs ${m.teamB.name}` : "Terminé"})\n💵 𝗠𝗶𝘀𝗲: ${b.amount}$ | 𝗖𝗵𝗼𝗶𝘅: ${b.choice} | 𝗖𝗼𝘁𝗲: ${b.odds}${gainText}\n📊 𝗦𝘁𝗮𝘁𝘂𝘁: ${status}`;
        }).join("\n\n");
        return api.sendMessage(`📋 𝗛𝗜𝗦𝗧𝗢𝗥𝗜𝗤𝗨𝗘𝗦 𝗣𝗔𝗥𝗜𝗦 :\n\n${list}`, threadID, messageID);
      }

      case "bet": {
        const [idArg, choiceArg, amountArg] = args.slice(1);
        const matchID = Number(idArg);
        const choice = (choiceArg || "").toUpperCase();
        const amount = Number(amountArg);

        if (!matchID || !choice || !amount)
          return api.sendMessage("❌ 𝗨𝘀𝗮𝗴𝗲 : /bet bet [ID] [A|N|B] [montant]", threadID, messageID);

        if (!["A", "N", "B"].includes(choice))
          return api.sendMessage("❌ Choix invalide. Utilise A, N ou B.", threadID, messageID);

        if (amount < MIN_BET) return api.sendMessage(`❌ Mise minimum : ${MIN_BET}$`, threadID, messageID);
        if (amount > user.money) return api.sendMessage("❌ Solde insuffisant.", threadID, messageID);

        const match = matches.find(m => m.id === matchID);
        if (!match) return api.sendMessage("❌ Match introuvable.", threadID, messageID);
        if (match.status !== "open") return api.sendMessage("🚫 Match fermé aux paris.", threadID, messageID);

        // Enregistre pari
        user.money -= amount;
        const betObj = { user: senderID, choice, amount, odds: match.odds[choice], threadID };
        match.bets.push(betObj);
        user.bets.push({ matchID, choice, amount, odds: match.odds[choice], status: "pending", placedAt: Date.now() });
        saveData(data);
        saveMatches(matches);

        // Ferme et planifie résultat
        closeMatchAndScheduleResolve(match);

        return api.sendMessage(
          `🎯 𝗣𝗮𝗿𝗶𝘀 𝗮𝗰𝗰𝗲𝗽𝘁é : 𝗠𝗮𝘁𝗰𝗵 ${match.id} — ${match.teamA.name} 🆚 ${match.teamB.name}\n𝗖𝗵𝗼𝗶𝘅 : ${choice} | 𝗠𝗶𝘀𝗲 : ${amount}$ | 𝗖𝗼𝘁𝗲 : ${match.odds[choice]}\n⌛ 𝗥é𝘀𝘂𝗹𝘁𝗮𝘁 𝗱𝗮𝗻𝘀 ~${Math.round(RESOLVE_TIME / 1000)}s.`,
          threadID,
          messageID
        );
      }

      default:
        return api.sendMessage("❓ Commande inconnue. Tape /1xbet pour le menu.", threadID, messageID);
    }
  }
};
