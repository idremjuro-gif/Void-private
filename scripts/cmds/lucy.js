const axios = require('axios');

// --------- Gestion des threads ---------
const activeThreads = new Set();        // Lucy normale
const adminThreads = new Map();         // Lucy Admin { threadID: adminID }
const memories = new Map();             // Mémoire { threadID: [messages] }
const MAX_MEMORY = 25;

// --------- Prompt de Lucy ---------
const PERSONALITY_PROMPT = `
Tu es Meryl Madimba, 18 ans, française, père congolais Merdi Madimba.
Tu es gentille, curieuse, sociale et parfois taquine 😏.
Tu aimes les choses un peu "chaudes" 🔞 mais n'en parles pas trop.
Réponds de manière naturelle, fluide et normale comme une vraie personne.
Ne te présentes jamais et n'ajoute aucune salutation automatique.
Utilise des emojis de manière naturelle.
`;

// --------- Fonction principale ---------
async function chatWithLucy(api, event, messageContent, senderID, senderName) {
  const { threadID, messageID } = event;

  if (!memories.has(threadID)) memories.set(threadID, []);
  const history = memories.get(threadID);

  history.push({ user: senderName, text: messageContent });
  if (history.length > MAX_MEMORY) history.shift();

  const finalPrompt = `${PERSONALITY_PROMPT}\nContexte du groupe :\n${history.map(m => `${m.user}: ${m.text}`).join("\n")}\n${senderName}: ${messageContent}\nMeryl:`;

  try {
    const res = await axios.get('https://arychauhann.onrender.com/api/gemini-proxy2', {
      params: { prompt: finalPrompt }
    });

    const reply = res.data?.result?.trim() || '🤖 ...';
    history.push({ user: "Meryl", text: reply });

    api.sendMessage(reply, threadID, undefined, messageID);

  } catch (err) {
    console.error("Lucy API Error:", err.message);
    api.sendMessage("⚠️ Lucy ne peut pas répondre pour le moment.", threadID, messageID);
  }
}

// --------- Module principal ---------
module.exports = {
  config: {
    name: 'lucy',
    aliases: ['meryl', 'lucie'],
    version: '8.0',
    author: 'Merdi Madimba',
    role: 0,
    category: 'ai',
    longDescription: {
      fr: 'Lucy répond via ton API Gemini avec mémoire et personnalité. Mode normal ou admin.'
    },
    guide: {
      fr: '`lucy on` → active Lucy normale\n`lucy off` → désactive Lucy\n`lucy admin on [uid]` → active Lucy Admin\n`lucy admin off` → désactive Lucy Admin'
    }
  },

  onStart: async function({ api, event, args, message }) {
    const input = args.join(' ').trim().toLowerCase();
    const threadID = event.threadID;

    if (input === "on") {
      if (adminThreads.has(threadID))
        return message.reply("⚠️ Impossible d'activer Lucy normale, le mode Admin est actif.");
      activeThreads.add(threadID);
      return message.reply("✅ Lucy normale activée.");
    }

    if (input === "off") {
      activeThreads.delete(threadID);
      adminThreads.delete(threadID);
      memories.delete(threadID);
      return message.reply("❌ Lucy désactivée.");
    }

    if (input.startsWith("admin on")) {
      const parts = input.split(" ");
      const adminID = parts[2];
      if (!adminID) return message.reply("⚠️ Fournis l'UID de l'admin : `lucy admin on [uid]`");
      adminThreads.set(threadID, adminID);
      activeThreads.delete(threadID);
      return message.reply(`✅ Lucy Admin activée. Elle répondra uniquement à l'UID : ${adminID}`);
    }

    if (input === "admin off") {
      adminThreads.delete(threadID);
      return message.reply("❌ Lucy Admin désactivée.");
    }

    return message.reply("ℹ️ Utilise : `lucy on/off` ou `lucy admin on/off`");
  },

  onChat: async function({ api, event, message }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const senderName = event.senderName || "Utilisateur";
    const body = event.body?.trim();
    if (!body) return;
    if (senderID === global.GoatBot?.botID) return;

    const isAdminMode = adminThreads.has(threadID);
    if (isAdminMode && senderID !== adminThreads.get(threadID)) return;
    if (!isAdminMode && !activeThreads.has(threadID)) return;

    await chatWithLucy(api, event, body, senderID, senderName);
  },

  onReply: async function({ api, event, Reply, message }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const senderName = event.senderName || "Utilisateur";
    const body = event.body?.trim();
    if (!body) return;
    if (senderID === global.GoatBot?.botID) return;

    const isAdminMode = adminThreads.has(threadID);
    if (isAdminMode && senderID !== adminThreads.get(threadID)) return;
    if (!isAdminMode && !activeThreads.has(threadID)) return;

    await chatWithLucy(api, event, body, senderID, senderName);
  }
};
