const axios = require('axios');

module.exports = {
  config: {
    name: "dl",
    aliases: ["alldl", "autodl"],
    version: "1.6",
    author: "Christus ✦ Aesther ✦ AnjaraFy",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Download any video from a link 🎬"
    },
    description: {
      en: "Auto or manual downloader for TikTok, YouTube, Instagram, etc."
    },
    category: "🌀 𝗠𝗘𝗗𝗜𝗔",
    guide: {
      en: "💡 Usage:\n• !dl <url>\n• Reply to a message containing a link\n• or enable auto mode: `!dl on` / `!dl off`"
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📥 COMMAND EXECUTION (Manual)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  onStart: async function ({ api, event, args }) {
    let videoURL = args.join(" ");

    // 📎 If user replied to a message with a link
    if (!videoURL) {
      if (event.messageReply && event.messageReply.body) {
        const found = event.messageReply.body.match(/https?:\/\/[^\s]+/);
        if (found) videoURL = found[0];
      }
    }

    if (!videoURL) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage(
        "⚠️ | Please provide a valid link after the command or reply to a message containing one.",
        event.threadID,
        event.messageID
      );
    }

    try {
      const { data: apiUrls } = await axios.get("https://raw.githubusercontent.com/romeoislamrasel/romeobot/refs/heads/main/api.json");
      const apiUrl = apiUrls.alldl;

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const res = await axios.get(`${apiUrl}/allLink`, { params: { link: videoURL } });

      if (res.status === 200 && res.data.download_url) {
        const { download_url, platform, video_title } = res.data;
        const stream = await global.utils.getStreamFromURL(download_url, "video.mp4");

        api.setMessageReaction("✅", event.messageID, () => {}, true);

        const infoMsg =
`╭──────────────────────────────╮
│ 🎬 𝗩𝗶𝗱𝗲𝗼 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱𝗲𝗿 𝗕𝗼𝘁 ⚡
│──────────────────────────────│
│ 📱 Platform : ${platform || "Unknown"}
│ 📖 Title : ${video_title || "Untitled"}
│ 💾 Status : ✅ Success
╰──────────────────────────────╯`;

        api.sendMessage({
          body: infoMsg,
          attachment: stream
        }, event.threadID, (err) => {
          if (err) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            api.sendMessage("❌ | Failed to send the video.", event.threadID, event.messageID);
          }
        }, event.messageID);
      } else {
        api.setMessageReaction("🚫", event.messageID, () => {}, true);
        api.sendMessage("❌ | Unable to get the download link.", event.threadID, event.messageID);
      }

    } catch (error) {
      console.error(error);
      api.setMessageReaction("💀", event.messageID, () => {}, true);
      api.sendMessage("⚠️ | An unexpected error occurred while fetching the video.", event.threadID, event.messageID);
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔄 AUTO DOWNLOAD MODE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  onChat: async function ({ api, event }) {
    const threadID = event.threadID;
    if (!global.autoDownloadStates) global.autoDownloadStates = {};
    if (!global.autoDownloadStates[threadID]) global.autoDownloadStates[threadID] = "on";

    const body = event.body?.toLowerCase();

    // 🌙 Enable / disable auto mode
    if (body === "!dl on") {
      global.autoDownloadStates[threadID] = "on";
      return api.sendMessage("✅ | Auto-download mode is now **ON** ⚡", threadID, event.messageID);
    }
    if (body === "!dl off") {
      global.autoDownloadStates[threadID] = "off";
      return api.sendMessage("🚫 | Auto-download mode is now **OFF** 💤", threadID, event.messageID);
    }

    // If disabled
    if (global.autoDownloadStates[threadID] === "off") return;

    // 🔗 Detect URLs automatically
    const urlMatch = event.body?.match(/https:\/\/[^\s]+/g);
    if (!urlMatch) return;
    const videoURL = urlMatch[0];

    // ⚙️ Supported domains
    const supported = /(tiktok\.com|youtube\.com|youtu\.be|instagram\.com|facebook\.com|x\.com|twitter\.com)/i;
    if (!supported.test(videoURL)) return;

    try {
      const { data: apiUrls } = await axios.get("https://raw.githubusercontent.com/romeoislamrasel/romeobot/refs/heads/main/api.json");
      const apiUrl = apiUrls.alldl;

      api.setMessageReaction("🔍", event.messageID, () => {}, true);
      const res = await axios.get(`${apiUrl}/allLink`, { params: { link: videoURL } });

      if (res.status === 200 && res.data.download_url) {
        const { download_url, platform, video_title } = res.data;
        const stream = await global.utils.getStreamFromURL(download_url, "video.mp4");

        const infoMsg =
`╭──────────────────────────────╮
│ ⚙️ 𝗔𝘂𝘁𝗼 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱 𝗠𝗼𝗱𝗲 🎞️
│──────────────────────────────│
│ 🌍 Platform : ${platform || "Unknown"}
│ 🎥 Title : ${video_title || "No Title"}
│ ✅ Status : Downloaded successfully
╰──────────────────────────────╯`;

        api.setMessageReaction("✅", event.messageID, () => {}, true);
        api.sendMessage({ body: infoMsg, attachment: stream }, threadID, event.messageID);

      } else {
        api.setMessageReaction("🚫", event.messageID, () => {}, true);
      }

    } catch (error) {
      console.error(error);
      api.setMessageReaction("💀", event.messageID, () => {}, true);
    }
  }
};
