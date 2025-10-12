const fs = require("fs");
const path = require("path");

const activeSessions = {};

module.exports = {
  config: {
    name: "quizma",
    aliases: ["quizmanga", "qm"],
    role: "0",
    author: "Merdi Madimba",
    version: "4.0",
    description: "Quiz Manga multivers ou par manga spécifique",
    category: "🎌 Manga & Anime"
  },

  onStart: async function ({ event, message }) {
    const threadID = event.threadID;

    if (activeSessions[threadID]) {
      return message.reply("❗ **Un Quizz est déjà en cours, veuillez attendre la fin !**");
    }

    await message.send(
      "**🎌 BIENVENUE DANS QUIZZ MANGA !** 🏯🍙\n\n" +
      "📌 Choisissez le mode de quiz :\n" +
      "**1️⃣ MULTIVERS** (questions mélangées de tous les mangas)\n" +
      "**2️⃣ UN SEUL MANGA** (sélectionnez votre manga préféré)\n\n" +
      "✅ Répondez par `1` ou `2` pour continuer."
    );

    activeSessions[threadID] = { status: "choosingUniverse" };
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
      return message.reply("🛑 STOP. Fin du Quizz !");
    }

    // === CHOIX UNIVERSE (MULTIVERS OU MANGA) ===
    if (session.status === "choosingUniverse") {
      if (body === "1") {
        session.universe = "multivers";
        session.status = "choosingMode";
        return message.reply(
          "🌍 Mode **MULTIVERS** activé !\n\n" +
          "Choisissez le mode de jeu :\n" +
          "**1️⃣ Général** (tout le monde)\n**2️⃣ Duel** (2 joueurs avec UID)"
        );
      } else if (body === "2") {
        session.universe = "single";
        session.status = "choosingManga";

        const filePath = path.join(__dirname, "manga_questions.json");
        if (!fs.existsSync(filePath)) {
          delete activeSessions[threadID];
          return message.reply("❌ Fichier manga_questions.json introuvable !");
        }

        let questions;
        try {
          questions = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch (e) {
          delete activeSessions[threadID];
          return message.reply("❌ Erreur de lecture dans manga_questions.json !");
        }

        // extraire la liste unique des mangas
        const mangas = Array.from(
          new Set(
            questions
              .filter(q => q.manga && q.manga.trim() !== "")
              .map(q => q.manga.trim())
          )
        );

        if (mangas.length === 0) {
          delete activeSessions[threadID];
          return message.reply("❌ Aucun manga trouvé dans le fichier !");
        }

        session.mangas = mangas;
        session.status = "choosingMangaSelection";

        let msg = "📚 Liste des mangas disponibles :\n\n";
        mangas.forEach((m, i) => {
          msg += `${i + 1}. ${m}\n`;
        });
        msg += "\n➡️ Répondez avec le numéro du manga que vous voulez.";

        return message.reply(msg);
      } else {
        return message.reply("⚠️ Choisissez `1` ou `2`.");
      }
    }

    // === CHOIX DU MANGA après envoi de la liste ===
    if (session.status === "choosingMangaSelection") {
      const idx = parseInt(body) - 1;
      if (isNaN(idx) || idx < 0 || idx >= session.mangas.length) {
        return message.reply("⚠️ Numéro invalide, choisissez dans la liste.");
      }

      session.selectedManga = session.mangas[idx];
      session.status = "choosingMode";
      return message.reply(
        `🎌 Vous avez choisi : **${session.selectedManga}** !\n\n` +
        "Choisissez le mode de jeu :\n" +
        "**1️⃣ Général** (tout le monde)\n**2️⃣ Duel** (2 joueurs avec UID)"
      );
    }

    // === CHOIX DU MODE (GENERAL / DUEL) ===
    if (session.status === "choosingMode") {
      if (body === "1") {
        session.mode = "general";
        session.status = "choosingQuestions";
        return message.reply(
          "**🌍 Mode Général activé !**\nCombien de questions voulez-vous ? (1-50)"
        );
      } else if (body === "2") {
        session.mode = "duel";
        session.status = "choosingDuelists";
        return message.reply(
          "**⚔️ Mode Duel activé !**\n➡️ Entrez les UID des duelistes séparés par une virgule.\nExemple : `126299037,1728919651`"
        );
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
        `✅ Joueurs enregistrés :\n👤 J1 : ${parts[0]}\n👤 J2 : ${parts[1]}\n\nCombien de questions voulez-vous ? (1-50)`
      );
    }

    // === CHOIX DU NOMBRE DE QUESTIONS ===
    if (session.status === "choosingQuestions" && !isNaN(body)) {
      const nbQuestions = parseInt(body);
      if (nbQuestions <= 0 || nbQuestions > 100) {
        return message.reply("⚠️ Choisissez un nombre valide entre 1 et 100.");
      }

      const filePath = path.join(__dirname, "manga_questions.json");

      let questions;
      try {
        questions = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch (e) {
        delete activeSessions[threadID];
        return message.reply("❌ Erreur de lecture dans manga_questions.json !");
      }

      // filtrer les questions selon multivers ou single
      if (session.universe === "single") {
        questions = questions.filter(q => q.manga === session.selectedManga);
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
          let result = "**🏁 FIN DU QUIZZ MANGA !**\n\n📊 RESULTATS :\n\n";
          for (const [name, score] of sorted) {
            result += `🏅 ${name} : ${score} pts\n`;
          }
          result += `\n👑 Le gagnant est : ${sorted[0]?.[0] || "Aucun"}`;
          await message.send(result);
          delete activeSessions[threadID];
          return;
        }

        answered = false;
        currentQuestion = selected[currentIndex];

        await message.send(
          `❓ Question ${currentIndex + 1}/${selected.length} :\n🗡️ ${currentQuestion.question}\n\n🎌 ${currentQuestion.manga} 🎌`
        );

        session.timeoutID = setTimeout(async () => {
          if (!answered) {
            const correctAnswer = Array.isArray(currentQuestion.answer)
              ? currentQuestion.answer[0]
              : currentQuestion.answer;
            await message.send(
              `⏰ Temps écoulé !\n✅ La bonne réponse était : ${correctAnswer}`
            );
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

      await message.send(
        `🔥 Le nombre des questions sera ${nbQuestions} !\n⚔️ Que le plus grand Otaku gagne ! 🍀`
      );
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

        let board = "**📊 Scores actuels :**\n\n";
        for (let [name, pts] of Object.entries(session.scores)) {
          board += `🍙 ${name} : ${pts} pts\n`;
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
