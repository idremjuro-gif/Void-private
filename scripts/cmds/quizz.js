const fs = require("fs");
const path = require("path");

const activeSessions = {};

module.exports = {
  config: {
    name: "quizz",
    aliases: ["quiz", "qg"],
    role: "0",
    author: "Merdi Madimba",
    version: "3.0",
    description: "Quiz de culture générale ou duel",
    category: "🎮 Jeu"
  },

  onStart: async function ({ event, message }) {
    const threadID = event.threadID;

    if (activeSessions[threadID]) {
      return message.reply("❗ Un quiz est déjà en cours dans ce groupe !");
    }

    await message.send(
      "📚 **Bienvenue dans le Quiz de Culture Générale !**\n\n" +
      "👉 Choisissez un mode de jeu :\n\n" +
      "1️⃣ **Quiz Général** (tout le monde peut participer)\n" +
      "2️⃣ **Duel** (seulement 2 joueurs avec UID)\n\n" +
      "➡️ Répondez par `1` ou `2` pour continuer."
    );

    activeSessions[threadID] = { status: "choosingMode" };
  },

  onChat: async function ({ event, message, usersData }) {
    const threadID = event.threadID;
    const session = activeSessions[threadID];
    if (!session) return;

    const normalize = str =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const body = event.body?.trim();

    // STOP
    if (body?.toLowerCase() === "!stop") {
      clearTimeout(session.timeoutID);
      delete activeSessions[threadID];
      return message.reply("🛑 Quiz arrêté.");
    }

    // === CHOIX DU MODE ===
    if (session.status === "choosingMode") {
      if (body === "1") {
        session.mode = "general";
        session.status = "choosingQuestions";
        return message.reply(
          "🌍 Mode **Quiz Général** choisi !\n\n" +
          "➡️ Tapez le **nombre de questions** que vous voulez (ex: `10`)."
        );
      } else if (body === "2") {
        session.mode = "duel";
        session.status = "choosingDuelists";
        return message.reply(
          "⚔️ Mode **Duel** choisi !\n\n" +
          "➡️ Entrez les **UID des deux duellistes** séparés par une virgule.\n" +
          "Exemple : `126299037,1728919651`"
        );
      } else {
        return message.reply("⚠️ Choisissez `1` ou `2`.");
      }
    }

    // === MODE DUEL : CHOIX DES JOUEURS ===
    if (session.status === "choosingDuelists") {
      const parts = body.split(",").map(x => x.trim());
      if (parts.length !== 2 || parts.some(x => isNaN(x))) {
        return message.reply("⚠️ Format invalide. Exemple : `126299037,1728919651`");
      }
      session.duelists = parts;
      session.status = "choosingQuestions";
      return message.reply(
        "✅ Joueurs enregistrés :\n" +
        `👤 Joueur 1 : ${parts[0]}\n` +
        `👤 Joueur 2 : ${parts[1]}\n\n` +
        "➡️ Maintenant, tapez le **nombre de questions** (ex: `10`)."
      );
    }

    // === CHOIX DU NOMBRE DE QUESTIONS ===
    if (session.status === "choosingQuestions" && !isNaN(body)) {
      const nbQuestions = parseInt(body);
      if (nbQuestions <= 0 || nbQuestions > 100) {
        return message.reply("⚠️ Choisissez un nombre valide entre 1 et 100.");
      }

      const filePath = path.join(__dirname, "culture_generale_questions.json");

      if (!fs.existsSync(filePath)) {
        delete activeSessions[threadID];
        return message.reply("❌ Fichier culture_generale_questions.json introuvable.");
      }

      let questions;
      try {
        questions = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch (e) {
        delete activeSessions[threadID];
        return message.reply("❌ Erreur de lecture dans culture_generale_questions.json");
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        delete activeSessions[threadID];
        return message.reply("❌ Aucune question trouvée.");
      }

      const selected = [...questions].sort(() => Math.random() - 0.5).slice(0, nbQuestions);
      const scores = {};
      let currentIndex = 0;
      let answered = false;
      let currentQuestion = null;

      const sendQuestion = async () => {
        if (currentIndex >= selected.length) {
          const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
          let result = "🏁 **Fin du Quiz !**\n\n📊 **Score final :**\n\n";
          for (const [name, score] of sorted) {
            result += `🏅 ${name} : ${score} pts\n`;
          }
          result += `\n👑 Vainqueur : ${sorted[0]?.[0] || "Aucun"}`;
          await message.send(result);
          delete activeSessions[threadID];
          return;
        }

        answered = false;
        currentQuestion = selected[currentIndex];

        await message.send(
          `❓ **Question ${currentIndex + 1}/${selected.length} :**\n` +
          `${currentQuestion.question}`
        );

        session.timeoutID = setTimeout(async () => {
          if (!answered) {
            const correctAnswer = Array.isArray(currentQuestion.answer)
              ? currentQuestion.answer[0]
              : currentQuestion.answer;
            await message.send(`⏰ Temps écoulé ! La bonne réponse était : ${correctAnswer}`);
            currentIndex++;
            sendQuestion();
          }
        }, 10000);
      };

      session.status = "playing";
      session.sendQuestion = sendQuestion;
      session.currentQuestion = () => currentQuestion;
      session.currentIndex = () => currentIndex;
      session.updateIndex = () => { currentIndex++; };
      session.scores = scores;
      session.answered = () => answered;
      session.setAnswered = val => { answered = val; };

      await message.send(`✅ Le quiz démarre avec **${nbQuestions} questions** ! Bonne chance 🍀`);
      sendQuestion();
      return;
    }

    // === PENDANT LE QUIZ ===
    if (session.status === "playing" && session.currentQuestion) {
      const currentQ = session.currentQuestion();
      if (!currentQ || session.answered()) return;

      const userAnswer = normalize(event.body || "");
      const expectedAnswers = Array.isArray(currentQ.answer)
        ? currentQ.answer.map(normalize)
        : [normalize(currentQ.answer)];

      // mode duel : vérifier si l’UID est valide
      if (session.mode === "duel" && !session.duelists.includes(event.senderID.toString())) {
        return;
      }

      if (expectedAnswers.includes(userAnswer)) {
        session.setAnswered(true);
        clearTimeout(session.timeoutID);

        const senderName = await usersData.getName(event.senderID);
        session.scores[senderName] = (session.scores[senderName] || 0) + 10;

        let board = "📊 **Score actuel :**\n\n";
        for (let [name, pts] of Object.entries(session.scores)) {
          board += `🏅 ${name} : ${pts} pts\n`;
        }

        await message.reply(
          `🎯 Bravo ${senderName} ! ✅ Bonne réponse.\n\n${board}`
        );
        session.updateIndex();
        setTimeout(session.sendQuestion, 1500);
      }
    }
  }
};
