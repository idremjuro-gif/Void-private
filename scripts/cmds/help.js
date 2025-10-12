const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;
const doNotDelete = "『[✰𝗠𝗜𝗧𝗔𝗠𝗔💌』"; // changing this wont change the goatbot V2 of list cmd it is just a decoyy

module.exports = {
  config: {
    name: "help",
    version: "1.17",
    author: "NTKhang", // original author Kshitiz 
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "View command usage and list all commands directly",
    },
    longDescription: {
      en: "View command usage and list all commands directly",
    },
    category: "info",
    guide: {
      en: "{pn} / help cmdName ",
    },
    priority: 1,
  },

  onStart: async function ({ message, args, event, threadsData, role }) {
    const { threadID } = event;
    const threadData = await threadsData.get(threadID);
    const prefix = getPrefix(threadID);

    if (args.length === 0) {
      const categories = {};
      let msg = "";

      msg += `》💎 𝙈𝙀𝙍𝙔𝙇 𝘾𝙈𝘿𝙨 💎 《\n✶⊶⊷⊶⊷❂⊶⊷⊶⊷✶`; // replace with your name 

      for (const [name, value] of commands) {
        if (value.config.role > 1 && role < value.config.role) continue;

        const category = value.config.category || "Uncategorized";
        categories[category] = categories[category] || { commands: [] };
        categories[category].commands.push(name);
      }

      Object.keys(categories).forEach((category) => {
        if (category !== "info") {
          msg += `\n》『${category.toUpperCase()}』》⊱✮`;


          const names = categories[category].commands.sort();
          for (let i = 0; i < names.length; i += 3) {
            const cmds = names.slice(i, i + 3).map((item) => ` 🔖${item}|\n`);
            msg += `\n ${cmds.join(" ".repeat(Math.max(1, 10 - cmds.join("").length)))}`;
          }

          msg += ``;
        }
      });

      const totalCommands = commands.size;
      msg += `\n𝗧𝗢𝗧𝗔𝗟 𝙲𝚖𝚍 ${totalCommands}\n𝚌𝚘𝚖𝚖𝚊𝚗𝚍 𝚝𝚑𝚊 𝚞 𝚌𝚊𝚗 𝚞𝚜𝚎`;
      msg += `𝚝𝚢𝚙𝚎: 「${prefix} 𝗵𝗲𝗹𝗽」+「 𝗰𝗺𝗱𝗡𝗮𝗺𝗲」𝚝𝚘 𝚟𝚒𝚎𝚠 𝚍𝚎𝚝𝚊𝚒𝚕𝚜 𝚘𝚏 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚜\n`;
      msg += `🌐 | 𝙈𝙀𝙍𝘿𝙄~𝙈𝘼𝘿𝙄𝙈𝘽𝘼`; // its not decoy so change it if you want 

      const helpListImages = [
        "https://i.ibb.co/Nn172Cmz/image.jpg", // add image link here
        "https://i.ibb.co/HfdNg3fd/image.jpg",
        "https://i.ibb.co/X9mNPG5/image.jpg",
        "https://i.ibb.co/Nn172Cmz/image.jpg",
        "https://i.ibb.co/HfdNg3fd/image.jpg",
        // Add more image links as needed
      ];

      const helpListImage = helpListImages[Math.floor(Math.random() * helpListImages.length)];

      await message.reply({
        body: msg,
        attachment: await global.utils.getStreamFromURL(helpListImage),
      });
    } else {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get(aliases.get(commandName));

      if (!command) {
        await message.reply(`Command "${commandName}" not found.`);
      } else {
        const configCommand = command.config;
        const roleText = roleTextToString(configCommand.role);
        const author = configCommand.author || "Unknown";

        const longDescription = configCommand.longDescription ? configCommand.longDescription.en || "No description" : "No description";

        const guideBody = configCommand.guide?.en || "No guide available.";
        const usage = guideBody.replace(/{p}/g, prefix).replace(/{n}/g, configCommand.name);

        const response = `╭── 𝙉𝘼𝙈𝙀 ────⭓
  │ ${configCommand.name}
  ├── 🔵𝙄𝙉𝙁𝙊
  │ Description: ${longDescription}
  │ Other names: ${configCommand.aliases ? configCommand.aliases.join(", ") : "Do not have"}
  │ Other names in your group: Do not have
  │ Version: ${configCommand.version || "1.0"}
  │ Role: ${roleText}
  │ Time per command: ${configCommand.countDown || 1}s
  │ Author: ${author}
  ├── 🔵𝙐𝙨𝙖𝙜𝙚
  │ ${usage}
  ├── 🔵𝙉𝙤𝙩𝙚𝙨
  │ The content inside <XXXXX> can be changed
  │ The content inside [a|b|c] is a or b or c
  ╰━━━━━━━❖`;

        await message.reply(response);
      }
    }
  },
};

function roleTextToString(roleText) {
  switch (roleText) {
    case 0:
      return "0 (All users)";
    case 1:
      return "1 (Group administrators)";
    case 2:
      return "2 (Admin bot)";
    default:
      return "Unknown role";
  }
}
