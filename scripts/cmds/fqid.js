const axios = require("axios");
const activeSessions = {};

module.exports = {
  config: {
    name: "footballquizzid",
    aliases: ["fqid", "footid"],
    version: "1.0",
    author: "Merdi Madimba",
    role: 0,
    description: "Quiz d'identification de joueurs de football avec API-Football",
    category: "🎮 Jeu"
  },

  onStart: async function ({ event, message }) {
    const threadID = event.threadID;

    if (activeSessions[threadID]) {
      return message.reply("⚠️ Un quiz est déjà en cours dans ce groupe !");
    }

    activeSessions[threadID] = { status: "choosingQuestions" };

    return message.reply(
      "⚽ **Bienvenue dans le Quiz d'identification de joueurs de football !**\n\n" +
      "➡️ Entrez le **nombre d'images** que vous voulez (entre 1 et 100)."
    );
  },

  onChat: async function ({ event, message, usersData }) {
    const threadID = event.threadID;
    const session = activeSessions[threadID];
    if (!session) return;

    const body = event.body?.trim();
    if (!body) return;

    // === Stop ===
    if (body.toLowerCase() === "!stop") {
      clearTimeout(session.timeoutID);
      delete activeSessions[threadID];
      return message.reply("🛑 Quiz arrêté.");
    }

    // === Choix du nombre de questions ===
    if (session.status === "choosingQuestions" && !isNaN(body)) {
      const nbQuestions = parseInt(body);
      if (nbQuestions < 1 || nbQuestions > 100)
        return message.reply("⚠️ Choisissez un nombre valide entre **1 et 100**.");

      session.status = "playing";
      session.currentIndex = 0;
      session.scores = {};
      session.answered = false;

      await message.reply("⏳ Récupération des joueurs depuis API-Football...");

      // === Fonction pour récupérer les joueurs d'une équipe ===
      async function getTeamPlayers(teamID) {
        try {
          const res = await axios.get("https://v3.football.api-sports.io/players/squad", {
            headers: {
              "x-rapidapi-key": "0f9152a7a994c53caf39311a2298bd76"
            },
            params: {
              team: teamID,
              league: 39, // Premier League
              season: 2024
            }
          });
          return res.data.response.map(player => ({
            name: player.name,
            image: player.photo
          }));
        } catch (err) {
          console.error("Erreur API-Football:", err.message);
          return [];
        }
      }

      // Charger les joueurs d'une équipe (par exemple, PSG)
      session.characters = await getTeamPlayers(33); // ID de l'équipe PSG

      if (session.characters.length === 0) {
        delete activeSessions[threadID];
        return message.reply("❌ Impossible de récupérer les joueurs.");
      }

      // Mélanger et prendre exactement le nombre demandé
      session.characters = session.characters.sort(() => Math.random() - 0.5).slice(0, nbQuestions);

      await message.send(`✅ Le quiz démarre avec **${session.characters.length} joueurs** ! 🍀`);

      // === Fonction d’envoi d’un joueur ===
      const sendCharacter = async () => {
        if (session.currentIndex >= session.characters.length) {
          const sorted = Object.entries(session.scores).sort((a, b) => b[1] - a[1]);
          let result = "🏁 **Fin du Quiz !**\n\n📊 **Score final :**\n\n";
          for (const [name, score] of sorted) {
            result += `🏅 ${name} : ${score} pts\n`;
          }
          result += `\n👑 Vainqueur : ${sorted[0]?.[0] || "Aucun"}`;
          await message.send(result);
          delete activeSessions[threadID];
          return;
        }

        session.answered = false;
        const current = session.characters[session.currentIndex];

        await message.send({
          body: `🖼️ **Joueur ${session.currentIndex + 1}/${session.characters.length}**\n📸 Qui est-ce ?`,
          attachment: await global.utils.getStreamFromURL(current.image)
        });

        session.timeoutID = setTimeout(async () => {
          if (!session.answered) {
            await message.send(`⏰ Temps écoulé ! La bonne réponse était : ${current.name}`);
            session.currentIndex++;
            sendCharacter();
          }
        }, 10000);
      };

      session.sendCharacter = sendCharacter;
      sendCharacter();
      return;
    }

    // === Pendant le quiz ===
    if (session.status === "playing") {
      if (session.answered) return;

      const current = session.characters[session.currentIndex];
      const userInput = body.trim();

      // Vérification intelligente via Gemini Proxy
      try {
        const prompt = `
Vérifie si le texte "${userInput}" correspond au joueur "${current.name}" d'un club de football connu. 
Accepte : le prénom seul, le nom seul, le nom complet. N'accepte aucune erreur d'orthographe.
Ignore les majuscules et accents. Répond uniquement par "true" ou "false".`;

        const res = await axios.get("https://arychauhann.onrender.com/api/gemini-proxy2", {
          params: { prompt }
        });

        const isCorrect = res.data?.result?.toLowerCase().includes("true");

        if (isCorrect) {
          session.answered = true;
          clearTimeout(session.timeoutID);

          const senderName = await usersData.getName(event.senderID);
          session.scores[senderName] = (session.scores[senderName] || 0) + 10;

          let board = "📊 **Score actuel :**\n\n";
          for (let [name, pts] of Object.entries(session.scores)) {
            board += `🏅 ${name} : ${pts} pts\n`;
          }

          await message.reply(`🎯 Bravo ${senderName} ! ✅ C’était bien **${current.name}**.\n\n${board}`);
          session.currentIndex++;
          setTimeout(session.sendCharacter, 1500);
        }
      } catch (err) {
        console.error("Erreur Gemini:", err.message);
      }
    }
  }
};
