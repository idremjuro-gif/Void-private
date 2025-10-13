const axios = require("axios");

module.exports = {
  config: {
    name: "gpt5",
    aliases: ["gpt", "chatgpt", "gpt5"],
    version: "1.2",
    author: "Christus x Aesther",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Chat with AI" },
    longDescription: { en: "Talk with GPT5 Model" },
    category: "ai",
    guide: { en: "Use: {p}ai <message>\nExample: {p}ai hello" }
  },

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ");
    if (!prompt) return b(api, event, "⚠️ Please provide a message to start chatting.\nExample: !ai hello");

    await a(api, event, prompt);
  },

  onReply: async function ({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;
    const prompt = event.body;
    if (!prompt) return;

    await a(api, event, prompt);
  },

  onChat: async function ({ api, event }) {
    const text = event.body || "";
    const match = text.match(/^(ai|gpt|chatgpt|gpt5)\s+(.+)/i);
    if (!match) return;

    const prompt = match[2].trim();
    if (!prompt) return;

    await a(api, event, prompt);
  }
};

async function a(api, event, prompt) {
  api.setMessageReaction("⏳", event.messageID, () => {}, true);

  try {
    const response = await axios.get("https://arychauhann.onrender.com/api/gpt5", { params: { prompt } });

    if (!response.data || !response.data.result) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return b(api, event, "❌ AI did not return a response.");
    }

    const answer = response.data.result.trim();

    api.sendMessage(`${answer}`, event.threadID, (err, info) => {
      if (err) return;
      api.setMessageReaction("✅", event.messageID, () => {}, true);

      global.GoatBot.onReply.set(info.messageID, {
        commandName: "ai",
        author: event.senderID
      });
    }, event.messageID);

  } catch (err) {
    console.error(err);
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    b(api, event, "❌ An error occurred while chatting with AI.");
  }
}

function b(api, event, text) {
  return api.sendMessage(text, event.threadID, event.messageID);
}
