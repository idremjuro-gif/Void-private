const axios = require("axios");

module.exports = {
  config: {
    name: "panime",
    aliases: ["personnage", "animeinfo", "wikianime"],
    version: "2.0",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: "Afficher les infos d’un personnage d’anime",
    longDescription:
      "Affiche une image, le nom, le manga/anime d’origine et la biographie d’un personnage d’anime célèbre.",
    category: "🎌 Anime",
    guide: {
      fr: "{p}panime <nom du personnage>\nExemple : {p}panime Luffy",
      en: "{p}panime <character name>\nExample: {p}panime Luffy",
    },
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(" ");
    if (!query)
      return api.sendMessage(
        "❗ Merci d’indiquer le nom d’un personnage manga/anime.\nExemple : !panime Luffy",
        event.threadID,
        event.messageID
      );

    try {
      // === Requête principale (personnage) ===
      const res = await axios.get(
        `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(query)}&limit=1`
      );

      const character = res.data.data[0];
      if (!character)
        return api.sendMessage(
          `😕 Aucun personnage trouvé pour : ${query}`,
          event.threadID,
          event.messageID
        );

      // === Infos principales ===
      const name = character.name || "Inconnu";
      const kanji = character.name_kanji || "Non disponible";
      const nicknames = character.nicknames?.length
        ? character.nicknames.join(", ")
        : "Aucun";
      const about = character.about
        ? character.about.replace(/\r?\n|\r/g, " ").slice(0, 450) + "..."
        : "Aucune biographie disponible.";
      const favorites = character.favorites || 0;
      const image = character.images?.jpg?.image_url;

      // === Récupération du ou des animes liés ===
      const animeRes = await axios.get(
        `https://api.jikan.moe/v4/characters/${character.mal_id}/anime`
      );
      let animeList = "Non listé";
      if (animeRes.data.data.length > 0) {
        animeList = animeRes.data.data
          .slice(0, 3)
          .map((a) => a.anime.title)
          .join(", ");
      }

      // === Message formaté façon “Wiki” ===
      const infoMsg = `📖 | **Fiche du personnage : ${name}**
───────────────────────────────
🎴 **Nom japonais :** ${kanji}
🏷️ **Surnoms :** ${nicknames}
🎬 **Apparaît dans :** ${animeList}
❤️ **Favoris :** ${favorites}
───────────────────────────────
📝 **Description :**
${about}
───────────────────────────────
🔍 Source : *MyAnimeList.net*`;

      // === Envoi du message avec image ===
      if (image) {
        const imgStream = await axios.get(image, { responseType: "stream" });
        api.sendMessage(
          { body: infoMsg, attachment: imgStream.data },
          event.threadID,
          event.messageID
        );
      } else {
        api.sendMessage(infoMsg, event.threadID, event.messageID);
      }
    } catch (error) {
      console.error(error);
      api.sendMessage(
        "❌ Une erreur est survenue. Réessaie avec un autre nom.",
        event.threadID,
        event.messageID
      );
    }
  },
};
