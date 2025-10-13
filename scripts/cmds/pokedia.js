const axios = require("axios");

module.exports = {
  config: {
    name: "pokepedia",
    aliases: ["pokemon", "pokeinfo", "pokémon"],
    version: "1.0",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: {
      fr: "Obtiens toutes les informations sur un Pokémon"
    },
    longDescription: {
      fr: "Recherche sur Pokepedia et génère un résumé complet du Pokémon demandé (type, génération, statistiques, attaques, etc.) avec Gemini IA."
    },
    category: "🧠 IA",
    guide: {
      fr: "{p}pokepedia [nom du Pokémon]"
    }
  },

  onStart: async function ({ api, event, args }) {
    const GOOGLE_API_KEY = "AIzaSyB-5xupIP8854HfB6AHPfLx7bEDCqoUSKE";
    const SEARCH_ENGINE_ID = "36bfdad9ce0e148a0";
    const GEMINI_API_KEY = "AIzaSyBbI6BZ1oEP-6XUYWD7V-kRQK6euVCg8F0";

    const query = args.join(" ");
    if (!query) {
      return api.sendMessage("⚠️ Veuillez préciser le nom d’un Pokémon. Exemple : !pokepedia Pikachu", event.threadID, event.messageID);
    }

    const searchingMsg = await api.sendMessage(`🔎 Recherche des informations sur **${query}** sur Poképedia...`, event.threadID);

    try {
      // Étape 1 : recherche Google Custom Search sur pokepedia.fr
      const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}+site:pokepedia.fr&key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}`;
      const searchRes = await axios.get(searchUrl);
      const items = searchRes.data.items;

      if (!items || items.length === 0) {
        return api.sendMessage(`❌ Aucun résultat trouvé pour **${query}** sur Poképedia.`, event.threadID, event.messageID);
      }

      const firstResult = items[0];
      const pageUrl = firstResult.link;
      const pageTitle = firstResult.title;
      const snippet = firstResult.snippet || "Aucune description disponible.";

      // Étape 2 : extraire le contenu brut du lien (Poképedia)
      const pageHtml = await axios.get(pageUrl);
      const cleanText = pageHtml.data
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const context = cleanText.substring(0, 6000);

      // Étape 3 : envoi du prompt à Gemini
      const prompt = `
Tu es un assistant Pokémon spécialisé dans Poképedia.fr.
À partir du texte suivant, crée un résumé structuré et concis de ce Pokémon.

TEXTE SOURCE :
${context}

QUESTION : Donne-moi une fiche complète du Pokémon ${query} avec :
- Type(s)
- Génération
- Talents
- Statistiques principales
- Attaques importantes
- Évolution(s)
- Informations utiles
- Un court résumé descriptif

Format clair, sans introduction inutile.
`;

      const geminiRes = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY,
        {
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        }
      );

      let aiText = "❌ Aucune réponse générée par l’IA.";
      if (geminiRes.data && geminiRes.data.candidates && geminiRes.data.candidates.length > 0) {
        aiText = geminiRes.data.candidates[0].content.parts[0].text;
      }

      // Étape 4 : envoi de la réponse finale
      let msg = `🎮 **${pageTitle}**\n🌐 ${pageUrl}\n\n${aiText}`;
      if (msg.length > 18000) msg = msg.slice(0, 17900) + "\n\n(...texte abrégé...)";

      api.sendMessage({ body: msg }, event.threadID, () => {
        api.unsendMessage(searchingMsg.messageID);
      });

    } catch (err) {
      console.error("Erreur Pokepedia:", err);
      api.sendMessage("❌ Une erreur est survenue lors de la recherche. Réessaie plus tard.", event.threadID, event.messageID);
    }
  }
};
