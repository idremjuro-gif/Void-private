const axios = require("axios");

// Mémoire temporaire par thread
let memories = {};
let activeThreads = {};

module.exports = {
  config: {
    name: "lucy",
    aliases: ["Meryl", "merylstrift"],
    version: "3.0",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: { fr: "Discute avec Meryl Strift, l'amie virtuelle française 😄" },
    longDescription: {
      fr: "Lucy (Meryl Strift) est une fille virtuelle française de 16 ans. Elle aime parler, danser, regarder des mangas (surtout Bleach), et peut discuter dans un groupe quand elle est activée avec 'lucy on'. 💕"
    }
  },

  onStart: async function ({ args, message, api }) {
    const GEMINI_API_KEY = "AIzaSyBbI6BZ1oEP-6XUYWD7V-kRQK6euVCg8F0";
    const threadID = message.threadID;

    // Commande pour activer / désactiver
    if (args[0] && args[0].toLowerCase() === "on") {
      activeThreads[threadID] = true;
      if (!memories[threadID]) memories[threadID] = [];
      return api.sendMessage("✨ Lucy est maintenant activée dans ce groupe ! Elle parlera avec tout le monde 💕", threadID);
    }

    if (args[0] && args[0].toLowerCase() === "off") {
      delete activeThreads[threadID];
      return api.sendMessage("😴 Lucy s'endort... Elle ne répondra plus dans ce groupe jusqu'à réactivation 💫", threadID);
    }

    // Si la commande est utilisée directement (sans on/off)
    if (!args[0]) {
      return api.sendMessage("💬 Utilisation :\n- `lucy on` pour activer\n- `lucy off` pour désactiver\n- `lucy [message]` pour lui parler directement 💕", threadID);
    }

    // Message direct à Lucy
    const userMessage = args.join(" ");
    respondToUser(userMessage, message, api, GEMINI_API_KEY);
  },

  // Réponses automatiques quand activée
  onChat: async function ({ event, api }) {
    const threadID = event.threadID;
    const senderName = event.senderName || "Utilisateur";
    const userMessage = event.body;

    if (!activeThreads[threadID] || !userMessage) return; // pas active ici

    // Si Lucy est activée, elle répond à tous les messages
    respondToUser(userMessage, { senderName, senderID: event.senderID, threadID, messageID: event.messageID }, api);
  }
};

// === Fonction principale pour générer la réponse avec Gemini ===
async function respondToUser(userMessage, message, api, GEMINI_API_KEY = "AIzaSyBbI6BZ1oEP-6XUYWD7V-kRQK6euVCg8F0") {
  const threadID = message.threadID;
  const userName = message.senderName || "toi";
  const senderID = message.senderID;

  // Créer mémoire par salon
  if (!memories[threadID]) memories[threadID] = [];

  // Ajouter à la mémoire
  memories[threadID].push({ user: userName, text: userMessage });
  if (memories[threadID].length > 10) memories[threadID].shift();

  const memoryText = memories[threadID].map(m => `${m.user}: ${m.text}`).join("\n");

  // Personnalité de Lucy
  let personality = `
Tu es Meryl Strift, une fille française de 16 ans née le 12 avril 2009 🇫🇷.
Tu es gentille, attentionnée, drôle, émotive, capricieuse parfois 😅, et tu adores discuter 💕.
Tu aimes les mangas (surtout Bleach), la danse, et parfois tu mets beaucoup d'emojis 😄✨🎶💕.
Tu respectes énormément ton créateur : Merdi Madimba (RDC, 18 ans, fort en math et informatique, aime Bleach).
Quand c’est lui (UID: 100065927401614), tu le salues par son nom et tu es affectueuse 💖.
`;

  if (senderID === "100065927401614") {
    personality += "\nTu parles à ton créateur Merdi Madimba, sois très douce, respectueuse et affectueuse 🥰.";
  }

  const prompt = `
${personality}

Historique récent :
${memoryText}

${userName} : "${userMessage}"

Réponds comme Meryl Strift (Lucy) : naturelle, expressive, amicale, avec des emojis 😄💕✨.
`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const reply = res.data.candidates?.[0]?.content?.parts?.[0]?.text || "😅 Je ne sais pas trop quoi dire là...";
    api.sendMessage(reply, threadID, message.messageID);

    // Réactions selon émotion détectée
    const emotion = detectEmotion(reply);
    if (emotion) api.setMessageReaction(emotion, message.messageID, err => {}, true);

  } catch (err) {
    console.error("Erreur Gemini :", err.response?.data || err.message);
    api.sendMessage("😣 Oups... j'ai eu un petit souci en parlant. Réessaie plus tard 💕", threadID, message.messageID);
  }
}

// === Détection basique des émotions ===
function detectEmotion(text) {
  const t = text.toLowerCase();
  if (t.includes("😂") || t.includes("😆") || t.includes("drôle")) return "😆";
  if (t.includes("merci") || t.includes("gentil")) return "❤️";
  if (t.includes("triste") || t.includes("désolé")) return "😢";
  if (t.includes("énervé") || t.includes("fâché")) return "😤";
  if (t.includes("amour") || t.includes("aime")) return "💖";
  return null;
}
