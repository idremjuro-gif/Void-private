const axios = require("axios");
const cheerio = require("cheerio");

 module.exports = {
  config: {
    name: "wiki",
    aliases: ["wikipedia", "wik"],
    version: "2.1",
    author: "Merdi Madimba",
    role: 0,
    shortDescription: {
      fr: "Recherche un article Wikipédia avec résumé et image."
    },
    longDescription: {
      fr: "Affiche un résumé clair et une image depuis Wikipédia (FR ou EN), en ignorant les paragraphes inutiles comme les homonymies."
    },
    category: "information",
    guide: {
      fr: "/wiki [terme à rechercher]"
    }
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(" ");
    if (!query)
      return api.sendMessage("❌ | Indique le sujet à rechercher.\nExemple : /wiki Naruto", event.threadID, event.messageID);

    const sendWikiResult = async (lang) => {
      const url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(query)}`;
      try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        
        const title = $("#firstHeading").text().trim() || query;

        
        let paragraphs = [];
        $("p").each((i, el) => {
          const text = $(el).text().trim();
          if (
            text &&
            !text.startsWith("Pour les articles homonymes") &&
            !text.startsWith("Cet article") &&
            !text.startsWith("Cette page") &&
            !text.startsWith("Il peut s’agir")
          ) {
            paragraphs.push(text);
          }
        });

        if (paragraphs.length === 0)
          return api.sendMessage(`❌ | Aucun contenu pertinent trouvé pour **${query}** sur Wikipédia (${lang}).`, event.threadID, event.messageID);

        const summary = paragraphs.slice(0, 3).join("\n\n");

        
        let imageUrl =
          $("table.infobox img").attr("src") ||
          $(".infobox img").attr("src") ||
          $(".thumbimage").first().attr("src");

        if (imageUrl && imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;

        const message = `📘 **${title}**\n\n🧠 ${summary}\n\n🔗 ${url}`;

        if (imageUrl) {
          const image = await axios.get(imageUrl, { responseType: "stream" });
          api.sendMessage({ body: message, attachment: image.data }, event.threadID, event.messageID);
        } else {
          api.sendMessage(message, event.threadID, event.messageID);
        }
      } catch (err) {
        if (lang === "fr") {
          
          await sendWikiResult("en");
        } else {
          api.sendMessage("❌ | Aucun article trouvé sur Wikipédia (FR/EN).", event.threadID, event.messageID);
        }
      }
    };

    
    await sendWikiResult("fr");
  }
};
