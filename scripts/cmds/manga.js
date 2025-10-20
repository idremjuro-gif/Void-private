// ---------------- manga.js ----------------
const axios = require("axios");

module.exports = {
  config: {
    name: "manga",
    aliases: ["anime", "episodes"],
    version: "2.0",
    author: "Merdi Madimba",
    role: 0,
    shortDescription: {
      fr: "Trouve et regarde un anime complet"
    },
    longDescription: {
      fr: "Recherche un anime et envoie les liens complets des épisodes en VF ou VOSTFR selon la disponibilité."
    },
    category: "🎬 Divertissement",
    guide: {
      fr: "{p}manga [nom de l'anime]"
    }
  },

  onStart: async function ({ event, message, args }) {
    const mangaName = args.join(" ");
    if (!mangaName)
      return message.reply("🎌 Entrez le nom du manga ou anime à rechercher.\nExemple : !manga One Piece");

    message.reply(`🔍 Recherche de *${mangaName}*...`);

    try {
      // 🔹 Nouvelle API : Anime-DB
      const searchUrl = `https://api.anime-db.info/anime?search=${encodeURIComponent(mangaName)}`;
      const res = await axios.get(searchUrl);
      const results = res.data.data || [];

      if (!Array.isArray(results) || results.length === 0)
        return message.reply(`❌ Aucun anime trouvé pour *${mangaName}*.`);

      const anime = results[0]; // premier résultat
      const animeTitle = anime.title;
      const animeImage = anime.image_url || null;
      const animeSynopsis = anime.synopsis ? anime.synopsis.substring(0, 250) + "..." : "Aucune description.";
      const searchName = animeTitle.replace(/\s+/g, "-").toLowerCase();

      // Envoi d’un aperçu avec image
      message.reply({
        body: `🎬 **${animeTitle}** trouvé !\n\n${animeSynopsis}\n\nLangue disponible : VF ou VOSTFR.\n\nChoisis la qualité d'image :\n\n1️⃣ 480p\n2️⃣ 720p\n3️⃣ 1080p\n\n➡️ Réponds par 1, 2 ou 3.`,
        attachment: animeImage
          ? await global.utils.getStreamFromURL(animeImage)
          : null
      });

      global.GoatBot.onReply.set(event.messageID, {
        commandName: this.config.name,
        step: "chooseQuality",
        animeTitle,
        searchName,
        author: event.senderID
      });

    } catch (err) {
      console.error(err);
      message.reply("⚠️ Erreur lors de la recherche du manga. Essaie un autre nom ou reformule.");
    }
  },

  onReply: async function ({ event, message, Reply }) {
    const { step, animeTitle, searchName, author } = Reply;
    if (event.senderID !== author)
      return message.reply("❌ Seul l'utilisateur ayant lancé la recherche peut répondre.");

    // Étape 1 : Choix de la qualité
    if (step === "chooseQuality") {
      const choice = event.body.trim();
      const qualityOptions = { "1": "480p", "2": "720p", "3": "1080p" };
      const chosenQuality = qualityOptions[choice];

      if (!chosenQuality)
        return message.reply("⚙️ Choisis une option valide : 1️⃣, 2️⃣ ou 3️⃣");

      message.reply(`🌐 Quelle version veux-tu regarder ?\n\n1️⃣ VF\n2️⃣ VOSTFR\n\n➡️ Réponds par 1 ou 2.`);

      global.GoatBot.onReply.set(event.messageID, {
        commandName: "manga",
        step: "chooseLang",
        animeTitle,
        searchName,
        quality: chosenQuality,
        author
      });
    }

    // Étape 2 : Choix de la langue
    else if (step === "chooseLang") {
      const langChoice = event.body.trim();
      const langOptions = { "1": "VF", "2": "VOSTFR" };
      const chosenLang = langOptions[langChoice];

      if (!chosenLang)
        return message.reply("🗣️ Choisis une option valide : 1️⃣ VF ou 2️⃣ VOSTFR.");

      // On construit un lien de visionnage fiable (Anime-sama ou VoirAnime)
      const formattedName = searchName
        .replace(/[^a-zA-Z0-9-]/g, "")
        .replace(/--+/g, "-");

      const siteUrl =
        chosenLang === "VF"
          ? `https://www.anime-sama.fr/catalogue/${formattedName}/vf/`
          : `https://www.anime-sama.fr/catalogue/${formattedName}/vostfr/`;

      message.reply(`📺 Voici ton anime :\n\n🎬 **${animeTitle}**\nLangue : ${chosenLang}\nQualité : ${Reply.quality}\n\n➡️ Regarde ici : ${siteUrl}\n\n💡 Si le lien ne s'ouvre pas, essaie sur https://www.voiranime.com en recherchant le même titre.`);
    }
  }
};
