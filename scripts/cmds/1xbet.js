// 🏆 1xbet.js (v3.0 - Supabase Edition)
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// === SUPABASE ===
const SUPABASE_URL = "https://vflmcbbkksuiwxquommy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// === FICHIERS ===
const matchesFile = path.join(__dirname, "1xbet-matches.json");
const teamsFile = path.join(__dirname, "teams.json");

if (!fs.existsSync(matchesFile)) fs.writeFileSync(matchesFile, JSON.stringify([]));
if (!fs.existsSync(teamsFile)) throw new Error("❌ Fichier teams.json introuvable !");

// === CONSTANTES DU JEU ===
const teams = JSON.parse(fs.readFileSync(teamsFile));
const MIN_BET = 20;
const DAILY_AMOUNT = 200;
const MATCH_COUNT = 5;
const RESOLVE_TIME = 30 * 1000;
const WELCOME_IMAGE = "http://goatbiin.onrender.com/GBhPN2QYD.png";
const BANK_UID = "100065927401614";

// === UTILITAIRES FICHIERS ===
function loadMatches() {
  try { return JSON.parse(fs.readFileSync(matchesFile)); }
  catch { return []; }
}
function saveMatches(matches) { fs.writeFileSync(matchesFile, JSON.stringify(matches, null, 2)); }

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

// === GESTION SUPABASE ===
async function getUser(uid) {
  const { data, error } = await supabase.from("users").select("*").eq("uid", uid).single();
  if (error && error.code !== "PGRST116") console.error("getUser error:", error.message);
  return data || null;
}

async function saveUser(user) {
  const { error } = await supabase.from("users").upsert(user, { onConflict: "uid" });
  if (error) console.error("saveUser error:", error.message);
}

async function updateMoney(uid, amount) {
  const user = await getUser(uid);
  if (!user) return;
  const newMoney = (user.money || 0) + amount;
  await saveUser({ ...user, money: newMoney });
}

async function getAllUsers() {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return [];
  return data;
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
async function resolveMatch(matchId) {
  const match = matches.find(m => m.id === matchId);
  if (!match || match.status === "finished") return;

  const goalsA = randomInt(5);
  const goalsB = randomInt(5);
  const score = `${goalsA}-${goalsB}`;
  match.score = score;
  match.status = "finished";

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

  for (const bet of match.bets) {
    const user = await getUser(bet.user);
    if (!user) continue;

    if (bet.choice === result) {
      const gain = Math.floor(bet.amount * bet.odds);
      await updateMoney(bet.user, gain);
      bet.status = "win";
      gainsText += `✅ ${user.name} a gagné **${gain}$**\n`;
    } else {
      // Perdu → transfert à la banque
      await updateMoney(BANK_UID, bet.amount);
      bet.status = "lose";
      gainsText += `❌ ${user.name} a perdu (${bet.amount}$)\n`;
    }
  }

  saveMatches(matches);
  if (threadToNotify) {
    try {
      global.api.sendMessage(`${recap}${gainsText || "Aucun pari enregistré pour ce match."}`, threadToNotify);
    } catch (err) {
      console.error("Erreur d’envoi du résultat :", err);
    }
  }
}

// === COMMANDE PRINCIPALE ===
module.exports = {
  config: {
    name: "1xbet",
    aliases: ["bet"],
    version: "3.0",
    author: "Merdi Madimba",
    role: 0,
    description: "Simulation de paris sportifs avec Supabase.",
    category: "🎮 Jeux"
  },

  onStart: async function ({ api, event, args }) {
    global.api = api;
    const { threadID, senderID, messageID } = event;

    // Init joueur
    let user = await getUser(senderID);
    if (!user) {
      let fbName = `Joueur-${senderID}`;
      try {
        const info = await api.getUserInfo(senderID);
        if (info && info[senderID]?.name) fbName = info[senderID].name;
      } catch {}
      user = { uid: senderID, name: fbName, money: 0, lastDaily: 0 };
      await saveUser(user);
    }

    const cmd = (args[0] || "").toLowerCase();

    // === MENU ===
    if (!cmd) {
      const body = `🏟️ 1𝙓𝘽𝙀𝙏 𝙋𝘼𝙍𝙄𝙎 𝙎𝙋𝙊𝙍𝙏𝙄𝙁 🏟️

⚽ /bet matches → Voir les matchs
🎰 /bet bet [ID] [A|N|B] [montant]
👤 /bet mybets → Tes paris
💵 /bet solde → Ton solde
💳 /bet daily → Bonus +${DAILY_AMOUNT}$
🏆 /bet top → Top 10 meilleurs joueurs`;

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
          `📍 Match ${m.id}\n⚽ ${m.teamA.name} 🆚 ${m.teamB.name}\n📈 Cotes → 🅰️ ${m.odds.A} | 🟰 ${m.odds.N} | 🅱️ ${m.odds.B}\n⏱ Statut : ${m.status}`
        ).join("\n\n");
        return api.sendMessage(`📋 MATCHS DISPONIBLES :\n\n${list}`, threadID, messageID);
      }

      case "solde":
        return api.sendMessage(`💰 ${user.name}, ton solde est de **${user.money}$**`, threadID, messageID);

      case "daily": {
        const now = Date.now();
        if (now - (user.lastDaily || 0) < 24 * 60 * 60 * 1000)
          return api.sendMessage("🕒 Reviens dans 24h pour réclamer ton bonus.", threadID, messageID);
        await updateMoney(senderID, DAILY_AMOUNT);
        await saveUser({ ...user, lastDaily: now });
        return api.sendMessage(`✅ +${DAILY_AMOUNT}$ ajoutés à ton solde !`, threadID, messageID);
      }

      case "top": {
        const players = await getAllUsers();
        const sorted = players.sort((a, b) => b.money - a.money).slice(0, 10);
        if (!sorted.length) return api.sendMessage("📭 Aucun joueur enregistré.", threadID, messageID);
        const medals = ["🥇", "🥈", "🥉"];
        const topList = sorted.map((p, i) => {
          const icon = medals[i] || "🏅";
          return `${icon} ${i + 1}. ${p.name} — ${p.money}$`;
        }).join("\n");
        return api.sendMessage(`🏆 TOP 10 JOUEURS 1XBET 🏆\n\n${topList}`, threadID, messageID);
      }

      case "bet": {
        const [idArg, choiceArg, amountArg] = args.slice(1);
        const matchID = Number(idArg);
        const choice = (choiceArg || "").toUpperCase();
        const amount = Number(amountArg);
        if (!matchID || !choice || !amount)
          return api.sendMessage("❌ Usage : /bet bet [ID] [A|N|B] [montant]", threadID, messageID);
        if (!["A", "N", "B"].includes(choice))
          return api.sendMessage("❌ Choix invalide. Utilise A, N ou B.", threadID, messageID);
        if (amount < MIN_BET) return api.sendMessage(`❌ Mise minimum : ${MIN_BET}$`, threadID, messageID);
        if (amount > user.money) return api.sendMessage("❌ Solde insuffisant.", threadID, messageID);

        const match = matches.find(m => m.id === matchID);
        if (!match) return api.sendMessage("❌ Match introuvable.", threadID, messageID);
        if (match.status !== "open") return api.sendMessage("🚫 Match fermé aux paris.", threadID, messageID);

        // Déduit la mise
        await updateMoney(senderID, -amount);
        const betObj = { user: senderID, choice, amount, odds: match.odds[choice], threadID };
        match.bets.push(betObj);
        saveMatches(matches);
        closeMatchAndScheduleResolve(match);

        return api.sendMessage(
          `🎯 Pari accepté : Match ${match.id} — ${match.teamA.name} 🆚 ${match.teamB.name}\nChoix : ${choice} | Mise : ${amount}$ | Cote : ${match.odds[choice]}\n⌛ Résultat dans ~${Math.round(RESOLVE_TIME / 1000)}s.`,
          threadID,
          messageID
        );
      }

      default:
        return api.sendMessage("❓ Commande inconnue. Tape /1xbet pour le menu.", threadID, messageID);
    }
  }
};
