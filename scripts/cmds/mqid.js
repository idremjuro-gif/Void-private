// ------------------ mangaquizzid.js ------------------
const axios = require("axios");
const activeSessions = {};

module.exports = {
  config: {
    name: "mangaquizzid",
    aliases: ["mqid", "animeid", "mangaid"],
    version: "5.0",
    author: "Merdi Madimba",
    role: 0,
    description: "Quiz d'identification de personnages manga populaires avec vérification intelligente via Gemini",
    category: "🎮 Jeu"
  },

  onStart: async function ({ event, message }) {
    const threadID = event.threadID;

    if (activeSessions[threadID]) {
      return message.reply("⚠️ Un quiz est déjà en cours dans ce groupe !");
    }

    activeSessions[threadID] = { status: "choosingQuestions" };

    return message.reply(
      "🎌 **Bienvenue dans le Quiz d'identification de personnages manga !**\n\n" +
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

      await message.reply("⏳ Récupération de personnages manga connus...");

      // === Fonction pour récupérer des personnages connus ===
      async function getPopularCharacters() {
        try {
          const res = await axios.get("https://api.jikan.moe/v4/top/characters");
          const chars = res.data.data.filter(c =>
            c.images?.jpg?.image_url &&
            c.name &&
            !c.name.toLowerCase().includes("unknown")
          );
          return chars.map(c => ({
            name: c.name,
            image: c.images.jpg.image_url
          }));
        } catch (err) {
          console.error("Erreur Jikan:", err.message);
          return [];
        }
      }

      let allCharacters = await getPopularCharacters();
      if (allCharacters.length === 0) {
        delete activeSessions[threadID];
        return message.reply("❌ Impossible de récupérer les personnages.");
      }

      // Mélanger et prendre exactement le nombre demandé
      allCharacters = allCharacters.sort(() => Math.random() - 0.5).slice(0, nbQuestions);
      session.characters = allCharacters;

      await message.send(`✅ Le quiz démarre avec **${session.characters.length} personnages populaires** ! 🍀`);

      // === Fonction d’envoi d’un personnage ===
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
          body: `🖼️ **Personnage ${session.currentIndex + 1}/${session.characters.length}**\n📸 Qui est-ce ?`,
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
Vérifie si le texte "${userInput}" correspond au personnage "${current.name}" d'un anime ou manga connu. 
Accepte : le prénom seul, le nom seul, le nom complet. N'accepte aucune erreur d'orthographe.
Ignore les majuscules et accents. Répond uniquement par "true" ou "false". 
Ne prends pas le nom du manga, juste le personnage.`;

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
