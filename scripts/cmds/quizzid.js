const fs = require("fs");
const path = require("path");

const activeSessions = {};

module.exports = {
config: {
name: "quizzid",
aliases: ["qid", "idfoot"],
role: "0",
author: "Merdi Madimba",
version: "1.0",
description: "Quiz d'identification des joueurs de football",
category: "🎮 Jeu"
},

onStart: async function ({ event, message }) {
const threadID = event.threadID;

if (activeSessions[threadID]) {  
  return message.reply("❗ Un quiz est déjà en cours dans ce groupe !");  
}  

await message.send(  
  "⚽ **Bienvenue dans le Quiz d'identification de joueurs de football !**\n\n" +  
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
      "➡️ Tapez le **nombre de questions** que vous voulez (entre 1 et 100)."  
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
    "➡️ Maintenant, tapez le **nombre de questions** (entre 1 et 20)."  
  );  
}  

// === CHOIX DU NOMBRE DE QUESTIONS ===  
if (session.status === "choosingQuestions" && !isNaN(body)) {  
  const nbQuestions = parseInt(body);  
  if (nbQuestions < 1 || nbQuestions > 20) {  
    return message.reply("⚠️ Choisissez un nombre valide entre **1 et 20**.");  
  }  

  const filePath = path.join(__dirname, "idfoot.json");  

  if (!fs.existsSync(filePath)) {  
    delete activeSessions[threadID];  
    return message.reply("❌ Fichier idfoot.json introuvable.");  
  }  

  let players;  
  try {  
    players = JSON.parse(fs.readFileSync(filePath, "utf-8"));  
  } catch (e) {  
    delete activeSessions[threadID];  
    return message.reply("❌ Erreur de lecture dans idfoot.json");  
  }  

  if (!Array.isArray(players) || players.length === 0) {  
    delete activeSessions[threadID];  
    return message.reply("❌ Aucun joueur trouvé.");  
  }  

  const selected = [...players].sort(() => Math.random() - 0.5).slice(0, nbQuestions);  
  const scores = {};  
  let currentIndex = 0;  
  let answered = false;  
  let currentPlayer = null;  

  const sendPlayer = async () => {  
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
    currentPlayer = selected[currentIndex];  

    await message.send({  
      body: `❓ **Joueur ${currentIndex + 1}/${selected.length} :**\n📸 Qui est-ce ?`,  
      attachment: await global.utils.getStreamFromURL(currentPlayer.image)  
    });  

    session.timeoutID = setTimeout(async () => {  
      if (!answered) {  
        const correctAnswer = Array.isArray(currentPlayer.answer)  
          ? currentPlayer.answer[0]  
          : currentPlayer.answer;  
        await message.send(`⏰ Temps écoulé ! La bonne réponse était : ${correctAnswer}`);  
        currentIndex++;  
        sendPlayer();  
      }  
    }, 10000);  
  };  

  session.status = "playing";  
  session.sendPlayer = sendPlayer;  
  session.currentPlayer = () => currentPlayer;  
  session.currentIndex = () => currentIndex;  
  session.updateIndex = () => { currentIndex++; };  
  session.scores = scores;  
  session.answered = () => answered;  
  session.setAnswered = val => { answered = val; };  

  await message.send(`✅ Le quiz démarre avec **${nbQuestions} joueurs** ! Bonne chance 🍀`);  
  sendPlayer();  
  return;  
}  

// === PENDANT LE QUIZ ===  
if (session.status === "playing" && session.currentPlayer) {  
  const currentP = session.currentPlayer();  
  if (!currentP || session.answered()) return;  

  const userAnswer = normalize(event.body || "");  
  const expectedAnswers = Array.isArray(currentP.answer)  
    ? currentP.answer.map(normalize)  
    : [normalize(currentP.answer)];  

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
    setTimeout(session.sendPlayer, 1500);  
  }  
}

}
};


      
