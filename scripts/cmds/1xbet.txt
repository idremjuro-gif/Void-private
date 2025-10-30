// 1xbet.js — Paris sportifs (version complète, corrigée)
// Auteur: Merdi Madimba (adaptation finale)
// Fonctionnalités : 1X2, score exact, over/under, HT result, double chance, BTTS, HT score,
// minute 1er but, no goal, first/last team, last after85, specials (header/penalty/redcard),
// menu /bet, sauvegarde fichiers JSON, simulation de match et résolution.

// --------- REQUIRES & FICHIERS ----------
const fs = require("fs");
const path = require("path");

// Fichiers
const dataFile = path.join(__dirname, "1xbet-users.json");
const matchesFile = path.join(__dirname, "1xbet-matches.json");
const teamsFile = path.join(__dirname, "teams.json");

// Crée les fichiers s'ils n'existent pas
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}));
if (!fs.existsSync(matchesFile)) fs.writeFileSync(matchesFile, JSON.stringify([]));
if (!fs.existsSync(teamsFile)) throw new Error("❌ Fichier teams.json introuvable !");

// --------- CONSTANTES ----------
const teams = JSON.parse(fs.readFileSync(teamsFile));
const MIN_BET = 20;
const DAILY_AMOUNT = 200;
const MATCH_COUNT = 5;
const RESOLVE_TIME = 30 * 1000; // délai de résolution après fermeture (en ms)
const WELCOME_IMAGE = "http://goatbiin.onrender.com/GBhPN2QYD.png";
const OWNER_UID = "100065927401614"; // ton UID pour recevoir les pertes

// --------- UTILS FICHIERS ----------
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(dataFile)); } catch { return {}; }
}
function saveUsers(users) {
  fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
}
function loadMatches() {
  try { return JSON.parse(fs.readFileSync(matchesFile)); } catch { return []; }
}
function saveMatches(matches) {
  fs.writeFileSync(matchesFile, JSON.stringify(matches, null, 2));
}

// --------- UTILS GÉNÉRAUX ----------
function randomInt(max) { return Math.floor(Math.random() * (max + 1)); }
function pickTwoDistinct(arr) {
  const i = randomInt(arr.length - 1);
  let j;
  do j = randomInt(arr.length - 1); while (j === i);
  return [arr[i], arr[j]];
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function money(n) { return `${Math.floor(n)}$`; }
function now() { return Date.now(); }

// --------- COTES / MARCHÉS ----------
function randomizerForOdds() { return 0.9 + Math.random() * 0.6; }

function computeBasicOdds(A, B) {
  const drawProb = 0.15;
  const total = (A.strength || 50) + (B.strength || 50);
  const probA = (A.strength / total) * (1 - drawProb);
  const probB = (B.strength / total) * (1 - drawProb);
  const probN = drawProb;
  const rand = () => 0.9 + Math.random() * 0.4;
  return {
    '1X2': {
      A: Number((1 / clamp(probA, 0.01, 0.99) * rand()).toFixed(2)),
      N: Number((1 / clamp(probN, 0.01, 0.99) * rand()).toFixed(2)),
      B: Number((1 / clamp(probB, 0.01, 0.99) * rand()).toFixed(2))
    }
  };
}

function generateMarketOdds(match) {
  const odds = {};
  const base = computeBasicOdds(match.teamA, match.teamB)['1X2'];
  odds['1X2'] = base;

  // Score exact 0-0 -> 5-5
  odds['scoreExact'] = {};
  for (let a = 0; a <= 5; a++) {
    for (let b = 0; b <= 5; b++) {
      let factor = 10;
      if (a === b) factor = 12;
      if (Math.abs(a - b) === 1) factor = 8;
      if (a === 1 && b === 0) factor = 9;
      odds['scoreExact'][`${a}-${b}`] = Number((factor * randomizerForOdds()).toFixed(2));
    }
  }

  // Over/Under
  odds['overUnder'] = {};
  [0.5, 1.5, 2.5, 3.5].forEach(v => {
    const expGoals = (match.teamA.strength + match.teamB.strength) / 200;
    const pOver = clamp(0.2 + expGoals * (v + 0.5), 0.05, 0.95);
    odds['overUnder'][`over${v}`] = Number((1 / pOver * randomizerForOdds()).toFixed(2));
    odds['overUnder'][`under${v}`] = Number((1 / (1 - pOver) * randomizerForOdds()).toFixed(2));
  });

  // HT result
  odds['htResult'] = {
    A: Number((base.A * randomizerForOdds()).toFixed(2)),
    N: Number((base.N * randomizerForOdds()).toFixed(2)),
    B: Number((base.B * randomizerForOdds()).toFixed(2))
  };

  // BTTS
  odds['btts'] = { yes: Number((1.9 + Math.random() * 0.6).toFixed(2)), no: Number((1.8 + Math.random() * 0.6).toFixed(2)) };

  // HT score 0-0 -> 3-3
  odds['htScore'] = {};
  for (let a = 0; a <= 3; a++) for (let b = 0; b <= 3; b++) odds['htScore'][`${a}-${b}`] = Number((5 + Math.random() * 30).toFixed(2));

  // Minute of first goal buckets
  odds['firstGoalMinute'] = {
    '0-15': Number((3 + Math.random() * 3).toFixed(2)),
    '16-30': Number((3 + Math.random() * 3).toFixed(2)),
    '31-45': Number((3 + Math.random() * 3).toFixed(2)),
    '46-60': Number((4 + Math.random() * 3).toFixed(2)),
    '61-75': Number((4 + Math.random() * 3).toFixed(2)),
    '76-90': Number((6 + Math.random() * 4).toFixed(2))
  };

  // No goal
  odds['noGoal'] = Number((10 + Math.random() * 15).toFixed(2));

  // First / Last team
  odds['firstTeam'] = { A: Number((2 + Math.random() * 2).toFixed(2)), B: Number((2 + Math.random() * 2).toFixed(2)) };
  odds['lastTeam'] = { A: Number((2 + Math.random() * 2).toFixed(2)), B: Number((2 + Math.random() * 2).toFixed(2)) };

  // Last after 85
  odds['lastAfter85'] = { yes: Number((6 + Math.random() * 6).toFixed(2)), no: Number((1.1 + Math.random() * 0.5).toFixed(2)) };

  // Specials: header / penalty / redcard
  odds['specials'] = {
    header: { yes: Number((3 + Math.random() * 3).toFixed(2)), no: Number((1.3 + Math.random() * 0.6).toFixed(2)) },
    penalty: { yes: Number((4 + Math.random() * 4).toFixed(2)), no: Number((1.15 + Math.random() * 0.5).toFixed(2)) },
    redcard: { yes: Number((8 + Math.random() * 8).toFixed(2)), no: Number((1.02 + Math.random() * 0.2).toFixed(2)) }
  };

  // Double chance
  odds['doubleChance'] = {
    '1X': Number((1.25 + Math.random() * 0.8).toFixed(2)),
    'X2': Number((1.25 + Math.random() * 0.8).toFixed(2)),
    '12': Number((1.12 + Math.random() * 0.6).toFixed(2))
  };

  match.oddsExtended = odds;
}

// --------- GESTION USERS & MATCHES ----------
let matches = loadMatches();
let nextMatchId = matches.reduce((mx, m) => Math.max(mx, m.id || 0), 0) + 1;

function createMatches(threadID, count = MATCH_COUNT) {
  const newMatches = [];
  for (let i = 0; i < count; i++) {
    const [teamA, teamB] = pickTwoDistinct(teams);
    const match = {
      id: nextMatchId++,
      teamA,
      teamB,
      odds: {}, // legacy field
      oddsExtended: {},
      status: "open",
      createdAt: now(),
      createdInThread: threadID,
      bets: []
    };
    generateMarketOdds(match);
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

// --------- SIMULATION & RÉSOLUTION ----------
function simulateMatchEvents(match) {
  const maxGoals = 5;
  const goalsA = randomInt(maxGoals);
  const goalsB = randomInt(maxGoals);
  const total = goalsA + goalsB;

  let firstGoalMinute = null;
  let firstGoalTeam = null;
  if (total > 0) {
    // buckets for minute
    const buckets = [
      randomInt(15) + 1,
      16 + randomInt(14),
      31 + randomInt(14),
      46 + randomInt(14),
      61 + randomInt(14),
      76 + randomInt(14)
    ];
    firstGoalMinute = buckets[randomInt(buckets.length - 1)];
    const pA = goalsA === goalsB ? 0.5 : (goalsA > goalsB ? 0.65 : 0.35);
    firstGoalTeam = Math.random() < pA ? "A" : "B";
  }

  const lastAfter85 = total > 0 ? (Math.random() < 0.12) : false;
  const header = Math.random() < 0.45;
  const penalty = Math.random() < 0.12;
  const redcard = Math.random() < 0.07;
  const btts = goalsA > 0 && goalsB > 0;
  const halfGoalsA = Math.min(goalsA, randomInt(goalsA));
  const halfGoalsB = Math.min(goalsB, randomInt(goalsB));

  return { goalsA, goalsB, total, firstGoalMinute, firstGoalTeam, lastAfter85, header, penalty, redcard, btts, halfGoalsA, halfGoalsB };
}

async function resolveMatch(matchId) {
  const match = matches.find(m => m.id === matchId);
  if (!match || match.status === "finished") return;

  const ev = simulateMatchEvents(match);
  match.score = `${ev.goalsA}-${ev.goalsB}`;
  match.status = "finished";
  match.result = ev.goalsA > ev.goalsB ? "A" : ev.goalsB > ev.goalsA ? "B" : "N";
  match.events = ev;

  let recap = `🏁 Résultat Match ${match.id}\n⚽ ${match.teamA.name} ${match.score} ${match.teamB.name}\n`;
  recap += match.result === "N" ? "⚖️ Match Nul\n\n" : `🏆 ${(match.result === "A" ? match.teamA.name : match.teamB.name)} a gagné !\n\n`;

  let gainsText = "";
  const users = loadUsers();
  let ownerGain = 0;

  for (const bet of match.bets) {
    const user = users[bet.user];
    if (!user) continue;

    let win = false;

    // Évalue selon le marché
    switch (bet.market) {
      case "1X2":
        win = (bet.choice === match.result);
        break;

      case "scoreExact":
        win = (bet.choice === match.score);
        break;

      case "overUnder": {
        // bet.choice like 'over2.5' or 'under2.5'
        const num = Number(bet.choice.replace(/over|under/, ""));
        if (bet.choice.startsWith("over")) win = ev.total > num;
        else win = ev.total < num;
        break;
      }

      case "htResult": {
        const htRes = ev.halfGoalsA > ev.halfGoalsB ? "A" : ev.halfGoalsB > ev.halfGoalsA ? "B" : "N";
        win = (bet.choice === htRes);
        break;
      }

      case "doubleChance":
        if (bet.choice === "1X") win = (match.result === "A" || match.result === "N");
        if (bet.choice === "X2") win = (match.result === "B" || match.result === "N");
        if (bet.choice === "12") win = (match.result === "A" || match.result === "B");
        break;

      case "btts":
        win = (bet.choice === "yes" ? ev.btts : !ev.btts);
        break;

      case "htScore":
        win = (bet.choice === `${ev.halfGoalsA}-${ev.halfGoalsB}`);
        break;

      case "firstGoalMinute": {
        if (!ev.firstGoalMinute) win = false;
        else {
          const parts = bet.choice.split("-").map(Number);
          win = ev.firstGoalMinute >= parts[0] && ev.firstGoalMinute <= parts[1];
        }
        break;
      }

      case "noGoal":
        win = (ev.total === 0);
        break;

      case "firstOrLastTeam": {
        if (bet.choiceType === "first") win = (ev.firstGoalTeam === bet.choice);
        if (bet.choiceType === "last") {
          if (ev.total === 0) win = false;
          else {
            const lastTeam = ev.goalsA > ev.goalsB ? "A" : ev.goalsB > ev.goalsA ? "B" : (Math.random() < 0.5 ? "A" : "B");
            win = (lastTeam === bet.choice);
          }
        }
        break;
      }

      case "lastAfter85":
        win = (bet.choice === "yes" ? ev.lastAfter85 : !ev.lastAfter85);
        break;

      case "specials": {
        // bet.choiceKey (header/penalty/redcard) and bet.choice (yes/no)
        if (bet.choiceKey === "header") win = (ev.header === (bet.choice === "yes"));
        if (bet.choiceKey === "penalty") win = (ev.penalty === (bet.choice === "yes"));
        if (bet.choiceKey === "redcard") win = (ev.redcard === (bet.choice === "yes"));
        break;
      }

      default:
        win = false;
    }

    if (win) {
      const gain = Math.floor(bet.amount * bet.odds);
      user.money = (user.money || 0) + gain; // ajoute gains au solde principal
      bet.status = "win";
      gainsText += `✅ ${user.name} a gagné ${gain}$ (mise ${bet.amount}$ - marché ${bet.market} : ${bet.choice})\n`;
    } else {
      ownerGain += bet.amount;
      bet.status = "lose";
      gainsText += `❌ ${user.name} a perdu (${bet.amount}$ - marché ${bet.market} : ${bet.choice})\n`;
    }
  }

  // attribution des pertes au propriétaire (ownerGain)
  if (ownerGain > 0) {
    if (!users[OWNER_UID]) users[OWNER_UID] = { uid: OWNER_UID, name: "Merdi", money: 0 };
    users[OWNER_UID].money = (users[OWNER_UID].money || 0) + ownerGain;
  }

  saveUsers(users);
  saveMatches(matches);

  if (match.createdInThread) {
    try {
      const details = `Évènements : 1er but ${ev.firstGoalMinute ? ev.firstGoalMinute + "'" : "—"} ${ev.firstGoalTeam ? (ev.firstGoalTeam === "A" ? match.teamA.name : match.teamB.name) : ""} | Last>85: ${ev.lastAfter85} | Header:${ev.header} | Penalty:${ev.penalty} | Red:${ev.redcard}`;
      global.api.sendMessage(`${recap}${details}\n\n${gainsText || "Aucun pari enregistré."}`, match.createdInThread);
    } catch (e) {
      console.error("Erreur d’envoi :", e);
    }
  }
}

// --------- COMMANDE EXPORT ----------
module.exports = {
  config: {
    name: "1xbet",
    aliases: ["bet"],
    version: "1.0",
    author: "Merdi Madimba",
    role: 0,
    description: "Paris sportifs (marchés avancés)",
    category: "🎮 Jeux"
  },

  onStart: async function ({ api, event, args }) {
    global.api = api;
    const { threadID, senderID, messageID } = event;

    // initialise utilisateur si nécessaire
    let users = loadUsers();
    if (!users[senderID]) {
      let fbName = `Joueur-${senderID}`;
      try {
        const info = await api.getUserInfo(senderID);
        if (info && info[senderID] && info[senderID].name) fbName = info[senderID].name;
      } catch (e) { /* ignore */ }
      users[senderID] = { uid: senderID, name: fbName, money: 0, lastDaily: 0 };
      saveUsers(users);
    }
    const user = users[senderID];

    const cmd = (args[0] || "").toLowerCase();
        // Menu principal
    if (!cmd) {
      const menu = [
        "🏟️ ========= 1XBET - MENU =========",
        "📌 Commandes principales :",
        "• /bet matches → Voir matchs ouverts (génère si absent)",
        "• /bet bet [ID] [market] [option] [montant] → Placer pari",
        "• /bet solde → Voir ton solde",
        "• /bet daily → Bonus quotidien",
        "• /bet top → Top 10 joueurs",
        "• /bet help [market] → Aide sur un marché",
        "",
        "📘 Exemples :",
        "• /bet bet 3 1X2 A 100",
        "• /bet bet 3 scoreExact 2-1 50",
        "• /bet bet 3 overUnder over2.5 40",
        "================================"
      ].join("\n");
      try {
        const stream = await global.utils.getStreamFromURL(WELCOME_IMAGE);
        return api.sendMessage({ body: menu, attachment: stream }, threadID, messageID);
      } catch {
        return api.sendMessage(menu, threadID, messageID);
      }
    }

    // Sous-commandes
    switch (cmd) {
      case "matches": {
        let open = matches.filter(m => m.status === "open" && m.createdInThread === threadID);
        if (!open.length) open = createMatches(threadID, MATCH_COUNT);
        const list = open.map(m => {
          const o = m.oddsExtended || {};
          const over25 = (o.overUnder && o.overUnder["over2.5"]) ? o.overUnder["over2.5"] : "N/A";
          const btts = (o.btts && o.btts.yes) ? o.btts.yes : "N/A";
          return `📍 Match ${m.id}\n⚽ ${m.teamA.name} 🆚 ${m.teamB.name}\n1X2 → A:${o["1X2"].A} N:${o["1X2"].N} B:${o["1X2"].B}\nOdds rapides: over2.5:${over25} | BTTS yes:${btts}\n`;
        }).join("\n");
        return api.sendMessage(`📋 MATCHS DISPONIBLES :\n\n${list}`, threadID, messageID);
      }

      case "solde":
      case "balance":
        return api.sendMessage(`💰 ${user.name}, ton solde est de **${user.money}$**`, threadID, messageID);

      case "daily": {
        const nowTs = now();
        if (nowTs - (user.lastDaily || 0) < 24 * 60 * 60 * 1000) return api.sendMessage("🕒 Reviens dans 24h pour ton bonus.", threadID, messageID);
        user.money += DAILY_AMOUNT;
        user.lastDaily = nowTs;
        saveUsers(users);
        return api.sendMessage(`✅ +${DAILY_AMOUNT}$ ajoutés à ton solde !`, threadID, messageID);
      }

      case "top": {
        const sorted = Object.values(loadUsers()).sort((a, b) => (b.money || 0) - (a.money || 0)).slice(0, 10);
        if (!sorted.length) return api.sendMessage("📭 Aucun joueur enregistré.", threadID, messageID);
        const medals = ["🥇", "🥈", "🥉"];
        const topList = sorted.map((p, i) => `${medals[i] || "🏅"} ${p.name} — ${p.money}$`).join("\n");
        return api.sendMessage(`🏆 TOP 10 JOUEURS 🏆\n\n${topList}`, threadID, messageID);
      }

      case "help": {
        const market = args[1];
        const helpAll = [
          "📚 MARCHÉS DISPONIBLES",
          "",
          "1X2 : /bet bet [ID] 1X2 [A|N|B] [montant]",
          "ScoreExact : /bet bet [ID] scoreExact 2-1 50",
          "Over/Under : /bet bet [ID] overUnder over2.5 50  (ou under2.5)",
          "HTResult : /bet bet [ID] htResult [A|N|B]",
          "DoubleChance : /bet bet [ID] doubleChance [1X|X2|12] 50",
          "BTTS : /bet bet [ID] btts [yes|no] 50",
          "HTScore : /bet bet [ID] htScore 1-0 30",
          "FirstGoalMinute : /bet bet [ID] firstGoalMinute 0-15 20",
          "NoGoal : /bet bet [ID] noGoal yes 20",
          "First/Last Team : /bet bet [ID] firstOrLastTeam first A 50 (first|last)",
          "LastAfter85 : /bet bet [ID] lastAfter85 yes 20",
          "Specials : /bet bet [ID] specials header yes 20 (header|penalty|redcard)"
        ].join("\n");
        if (!market) return api.sendMessage(helpAll, threadID, messageID);
        if (market === "scoreExact") return api.sendMessage("Score exact : deviner le score final précis (p. ex. 2-1). Cotes élevées.", threadID, messageID);
        return api.sendMessage(helpAll, threadID, messageID);
      }

      case "bet": {
        // Support multiple syntaxes, ex:
        // /bet bet 3 1X2 A 100
        // /bet bet 3 scoreExact 2-1 50
        // /bet bet 3 overUnder over2.5 40
        // /bet bet 3 specials header yes 20
        // /bet bet 3 firstOrLastTeam first A 50
        const rest = args.slice(1);
        if (rest.length < 4) return api.sendMessage("❌ Usage : /bet bet [ID] [market] [option] [montant] (Tape /bet help pour la liste)", threadID, messageID);

        const matchID = Number(rest[0]);
        const market = rest[1];
        // Pour specials et firstOrLastTeam, option peut comporter 2 tokens
        let option, amount;
        if (market === "specials") {
          // expecting: specials <header|penalty|redcard> <yes|no> <montant>
          if (rest.length < 5) return api.sendMessage("❌ Usage pour specials : /bet bet [ID] specials [header|penalty|redcard] [yes|no] [montant]", threadID, messageID);
          option = `${rest[2]}|${rest[3]}`; // ex "header|yes"
          amount = Number(rest[4]);
        } else if (market === "firstOrLastTeam") {
          // expecting: firstOrLastTeam <first|last> <A|B> <montant>
          if (rest.length < 5) return api.sendMessage("❌ Usage pour firstOrLastTeam : /bet bet [ID] firstOrLastTeam [first|last] [A|B] [montant]", threadID, messageID);
          option = `${rest[2]}|${rest[3]}`; // ex "first|A"
          amount = Number(rest[4]);
        } else {
          option = rest[2];
          amount = Number(rest[3]);
        }

        if (!matchID || !market || !option || !amount) return api.sendMessage("❌ Paramètres invalides. Tape /bet help.", threadID, messageID);
        if (amount < MIN_BET) return api.sendMessage(`❌ Mise minimum : ${MIN_BET}$`, threadID, messageID);
        if (amount > user.money) return api.sendMessage("❌ Solde insuffisant.", threadID, messageID);

        const match = matches.find(m => m.id === matchID);
        if (!match) return api.sendMessage("❌ Match introuvable.", threadID, messageID);
        if (match.status !== "open") return api.sendMessage("🚫 Match fermé aux paris.", threadID, messageID);

        // Déterminer cote selon marché
        let odds = 0;
        try {
          if (!match.oddsExtended) return api.sendMessage("❌ Marchés indisponibles pour ce match.", threadID, messageID);

          if (market === "1X2") odds = match.oddsExtended["1X2"][option];
          else if (market === "scoreExact") odds = match.oddsExtended["scoreExact"][option];
          else if (market === "overUnder") odds = match.oddsExtended["overUnder"][option];
          else if (market === "htResult") odds = match.oddsExtended["htResult"][option];
          else if (market === "doubleChance") odds = match.oddsExtended["doubleChance"][option];
          else if (market === "btts") odds = match.oddsExtended["btts"][option];
          else if (market === "htScore") odds = match.oddsExtended["htScore"][option];
          else if (market === "firstGoalMinute") odds = match.oddsExtended["firstGoalMinute"][option];
          else if (market === "noGoal") odds = match.oddsExtended["noGoal"];
          else if (market === "lastAfter85") odds = match.oddsExtended["lastAfter85"][option];
          else if (market === "firstOrLastTeam") {
            // option = "first|A" or "last|B"
            const [choiceType, team] = option.split("|");
            // use odds from firstTeam or lastTeam
            odds = choiceType === "first" ? match.oddsExtended["firstTeam"][team] : match.oddsExtended["lastTeam"][team];
          } else if (market === "specials") {
            // option = "header|yes"
            const [key, val] = option.split("|");
            if (!["header", "penalty", "redcard"].includes(key) || !["yes", "no"].includes(val)) return api.sendMessage("❌ Usage specials invalide.", threadID, messageID);
            odds = match.oddsExtended["specials"][key][val];
          } else {
            return api.sendMessage("❌ Marché inconnu. Tape /bet help.", threadID, messageID);
          }
        } catch (e) {
          return api.sendMessage("❌ Erreur lecture cote.", threadID, messageID);
        }

        if (!odds || odds <= 0) return api.sendMessage("❌ Cote introuvable / marché indisponible.", threadID, messageID);

        // Enregistre le pari
        user.money -= amount;
        // construit l'objet choix standardisé
        let choiceObj = option;
        if (market === "specials") {
          const [k, v] = option.split("|");
          choiceObj = { key: k, value: v };
        } else if (market === "firstOrLastTeam") {
          const [ctype, team] = option.split("|");
          choiceObj = { type: ctype, team: team };
        }

        const betRecord = {
          user: senderID,
          market,
          // on stocke choice de façon simple (string) pour la plupart des marchés,
          // mais si specials/firstOrLastTeam on stocke choiceKey/choiceType
          choice: (typeof choiceObj === "string") ? choiceObj : (market === "specials" ? choiceObj.value : (market === "firstOrLastTeam" ? choiceObj.team : "")),
          // pour specials/firstOrLastTeam on ajoute champs supplémentaires
          choiceKey: (market === "specials" ? choiceObj.key : undefined),
          choiceType: (market === "firstOrLastTeam" ? choiceObj.type : undefined),
          amount,
          odds,
          status: "pending",
          placedAt: now()
        };

        match.bets.push(betRecord);
        saveUsers(users);
        saveMatches(matches);

        // Fermer et scheduler résolution
        closeMatchAndScheduleResolve(match);

        return api.sendMessage(
          `🎯 Pari accepté : Match ${match.id}\nMarché : ${market}\nOption : ${market === "specials" ? `${betRecord.choiceKey} ${betRecord.choice}` : (market === "firstOrLastTeam" ? `${betRecord.choiceType} ${betRecord.choice}` : betRecord.choice)}\nMise : ${amount}$\nCote : ${odds}\n⌛ Résultat dans ~${Math.round(RESOLVE_TIME / 1000)}s.`,
          threadID,
          messageID
        );
      }

      default:
        return api.sendMessage("❓ Commande inconnue. Tape /bet pour le menu.", threadID, messageID);
    }
  }
};
    
