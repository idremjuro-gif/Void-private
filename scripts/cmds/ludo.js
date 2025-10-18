// ------------------ ludo.js ------------------
const ludoCards = require("./ludo-cards");

let games = {}; // parties en mémoire

// Définition du plateau emoji
const boardEmojis = [
  "🏁", "💰", "🃏", "⚡", "⬜", "⬜",
  "🌀", "⛔", "⬜", "💰", "🃏", "⬜",
  "⚡", "⬜", "🌀", "💰", "⛔", "⬜",
  "🃏", "⬜"
];

module.exports = {
  config: {
    name: "ludo",
    aliases: ["monopolyboard", "ludokingdom"],
    version: "4.0",
    author: "Merdi Madimba",
    countDown: 3,
    role: 0,
    shortDescription: { fr: "Ludo/Monopoly avec plateau emoji et cartes interactives" },
    longDescription: { fr: "Déplacement, plateau emoji, cases spéciales et cartes Chance/Malchance, actions sur joueurs" },
    category: "game",
    guide: {
      fr: "!ludo start [1-4] — créer une partie\n!join — rejoindre\n!roll — lancer le dé\n!pioche — piocher une carte\n!pause — mettre pause (joueur 1)\n!resume — reprendre\n!stop — arrêter la partie (joueur 1)"
    }
  },

  onStart: async function({ api, event, args }) {
    const threadID = event.threadID;
    const senderName = event.senderName;

    if (games[threadID]) return api.sendMessage("🚫 Une partie est déjà en cours ici.", threadID);

    const maxPlayers = Math.min(Math.max(parseInt(args[0]) || 1, 1), 4);
    const players = [{ name: senderName, id: event.senderID, money: 500, position: 0 }];
    if (maxPlayers === 1) players.push({ name: "Bot 🤖", id: "bot", money: 500, position: 0 });

    games[threadID] = {
      players,
      maxPlayers,
      turnIndex: 0,
      paused: false,
      started: maxPlayers === 1,
      boardLength: boardEmojis.length
    };

    const visual = renderBoard(games[threadID]);
    api.sendMessage(
      `🎲 Partie créée par ${senderName} !\n${visual}\n` +
      (maxPlayers === 1 ? "Tu joues contre le Bot 🤖.\nTape !roll pour commencer ton tour." :
      `Rejoignez avec !join (max ${maxPlayers}). Le joueur 1 (${senderName}) tapera !start quand tout le monde est prêt.`),
      threadID
    );
  },

  onReply: async function({ api, event, args }) {
    const threadID = event.threadID;
    const game = games[threadID];
    if (!game) return api.sendMessage("🚫 Aucune partie en cours.", threadID);

    const cmd = args[0]?.toLowerCase();
    const senderID = event.senderID;
    const senderName = event.senderName;

    // -------------------- Join --------------------
    if (cmd === "join") {
      if (game.started) return api.sendMessage("🚫 La partie a déjà commencé.", threadID);
      if (game.players.find(p => p.id === senderID)) return api.sendMessage("❌ Tu es déjà dans la partie.", threadID);
      if (game.players.length >= game.maxPlayers) return api.sendMessage("🚫 Nombre maximum atteint.", threadID);

      game.players.push({ name: senderName, id: senderID, money: 500, position: 0 });
      return api.sendMessage(`✅ ${senderName} a rejoint la partie !`, threadID);
    }

    // -------------------- Start --------------------
    if (cmd === "start") {
      if (game.started) return api.sendMessage("🚫 La partie a déjà commencé.", threadID);
      if (game.players[0].id !== senderID) return api.sendMessage("🚫 Seul le joueur 1 peut lancer la partie !", threadID);

      game.started = true;
      const visual = renderBoard(game);
      api.sendMessage(
        `🎮 La partie commence ! Joueurs : ${game.players.map(p=>p.name).join(", ")}\n${visual}\nC’est au tour de ${game.players[game.turnIndex].name} ! Tape !roll pour lancer le dé.`,
        threadID
      );
      return;
    }

    // -------------------- Roll --------------------
    if (cmd === "roll") {
      if (!game.started) return api.sendMessage("🚫 La partie n’a pas encore commencé !", threadID);
      if (game.paused) return api.sendMessage("⏸️ La partie est en pause.", threadID);

      const player = game.players[game.turnIndex];
      if (player.id !== senderID && player.id !== "bot") return api.sendMessage("🚫 Ce n’est pas ton tour !", threadID);

      if (player.skipNext) {
        player.skipNext = false;
        game.turnIndex = (game.turnIndex + 1) % game.players.length;
        return api.sendMessage(`⏩ ${player.name} doit passer ce tour ! Prochain joueur : ${game.players[game.turnIndex].name}`, threadID);
      }

      let dice = Math.floor(Math.random() * 6) + 1;

      // Animation du déplacement case par case
      const moveStep = async () => {
        if (dice <= 0) return afterMove();
        player.position = (player.position + 1) % game.boardLength;
        dice--;
        api.sendMessage(renderBoard(game), threadID);
        setTimeout(moveStep, 500);
      };

      const afterMove = () => {
        api.sendMessage(`📍 ${player.name} arrive à la case ${player.position + 1} (${boardEmojis[player.position]}) ! Tape !pioche si applicable.`, threadID);
      };

      moveStep();
      return;
    }

    // -------------------- Pioche --------------------
    if (cmd === "pioche") {
      const player = game.players[game.turnIndex];
      if(player.id !== senderID && player.id !== "bot") return api.sendMessage("🚫 Ce n’est pas ton tour !", threadID);

      ludoCards.drawCard(game, player, api, threadID, (result)=>{
        if(result === "piocheAgain"){
          api.sendMessage("🔄 Relance une carte immédiatement !", threadID);
          return ludoCards.drawCard(game, player, api, threadID, ()=>{});
        }
        if(result === true){
          return api.sendMessage(`${player.name} peut relancer le dé ! Tape !roll`, threadID);
        }

        // Tour suivant
        game.turnIndex = (game.turnIndex + 1) % game.players.length;
        api.sendMessage(`➡️ C’est au tour de ${game.players[game.turnIndex].name} !`, threadID);

        // Si Bot, lancer automatiquement
        if(game.players[game.turnIndex].id === "bot"){
          setTimeout(()=>module.exports.onReply({ api, event: { threadID, senderID: "bot" }, args: ["roll"] }), 1000);
        }
      });

      return;
    }

    // -------------------- Pause / Resume / Stop --------------------
    if (["pause", "resume", "stop"].includes(cmd)){
      if (game.players[0].id !== senderID) return api.sendMessage("🚫 Seul le joueur 1 peut utiliser cette commande.", threadID);
      if(cmd === "pause"){ game.paused=true; return api.sendMessage("⏸️ Partie en pause.", threadID); }
      if(cmd === "resume"){ game.paused=false; return api.sendMessage("▶️ Partie reprise !", threadID); }
      if(cmd === "stop"){
        const ranking = game.players.sort((a,b)=>b.money-a.money).map((p,i)=>`${i+1}. ${p.name} — ${p.money} 💰`).join("\n");
        delete games[threadID];
        return api.sendMessage(`🏁 Partie arrêtée par ${senderName} !\nClassement final :\n${ranking}`, threadID);
      }
    }
  }
};

// ------------------ Fonction utilitaire ------------------
function renderBoard(game) {
  return game.players.map(p=>{
    let board = boardEmojis.map((e,i)=>{
      if(game.players.some(pl=>pl.position === i)){
        const playersHere = game.players.filter(pl=>pl.position===i).map(pl=>pl.name.charAt(0)).join("");
        return `[${playersHere}]`;
      } else return e;
    }).join("");
    return `🎲 ${p.name} : ${board}`;
  }).join("\n");
}
