const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini / Replicate API
const GEMINI_API_KEY = 'AIzaSyBKKDpyaluhRCAh8ikvm-ZFJidtfKBCVNw';
const REPLICATE_API_KEY = 'r8_68TK5E4rBuWhno024hPqxuNVakAgywU38tQVj';
const GEMINI_MODEL = 'gemini-2.5-flash';

module.exports = {
  config: {
    name: "eq",
    aliases: ["elfaliaquest", "EQ"],
    version: "1.2",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: "Lance Elfalia Quest et crée ton personnage"
  },

  onCall: async ({ api, event }) => {
    const uid = event.senderID;
    const threadID = event.threadID;

    // Image de bienvenue
    const welcomeImageUrl = "https://i.imgur.com/Wyl3Pz1.jpeg";

    // Vérifie si le joueur existe déjà
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('uid', uid)
      .single();

    if (existingPlayer) {
      await api.sendMessage({
        body: `👋 Bienvenue de retour, **${existingPlayer.player_name}** !`,
        attachment: await api.getStreamFromURL(welcomeImageUrl)
      }, threadID);

      await api.sendMessage("Veux-tu recommencer ton personnage ? Réponds par oui/non.", threadID);
      return;
    }

    // Nouveau joueur : message de bienvenue
    await api.sendMessage({
      body: "🧙‍♂️ Bienvenue dans **Elfalia Quest** ! Commençons par créer ton personnage.",
      attachment: await api.getStreamFromURL(welcomeImageUrl)
    }, threadID);

    // Questions interactives
    const questions = [
      { key: 'player_name', text: "1️⃣ Quel est ton nom de chasseur ?" },
      { key: 'sex', text: "2️⃣ Sexe ? (Homme / Femme / Autre)" },
      { key: 'hair_type', text: "3️⃣ Type de cheveux ?" },
      { key: 'hair_color', text: "4️⃣ Couleur des cheveux ?" },
      { key: 'outfit', text: "5️⃣ Tenue préférée ?" },
      { key: 'weapon', text: "6️⃣ Arme principale ?" },
      { key: 'class', text: "7️⃣ Classe initiale ? (Guerrier, Mage, Assassin, Archer, Invocateur)" },
      { key: 'alignment', text: "8️⃣ Alignement ? (Lumière / Ombre)" }
    ];

    const playerData = { uid };
    let i = 0;

    const askQuestion = () => {
      if (i >= questions.length) {
        savePlayer();
        return;
      }

      api.sendMessage(questions[i].text, threadID);

      const handleAnswer = async (answerEvent) => {
        if (answerEvent.senderID !== uid) return;

        playerData[questions[i].key] = answerEvent.body;
        i++;
        api.removeListener('message', handleAnswer);
        askQuestion();
      };

      api.on('message', handleAnswer);
    };

    askQuestion();

    const savePlayer = async () => {
      // Enregistre le joueur dans Supabase
      await supabase.from('players').insert([playerData]);

      // Génération de l'image du personnage via Replicate
      const characterPrompt = `A ${playerData.sex} character, ${playerData.hair_color} ${playerData.hair_type} hair, wearing ${playerData.outfit}, wielding a ${playerData.weapon}, class ${playerData.class}, alignment ${playerData.alignment}, full body, fantasy style, detailed illustration`;

      let characterImageUrl = "";

      try {
        const response = await axios.post('https://api.replicate.com/v1/predictions', {
          version: "flux-pro",
          input: { prompt: characterPrompt }
        }, {
          headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }
        });

        characterImageUrl = response.data.output[0];
      } catch (err) {
        console.log("Erreur génération image :", err);
        characterImageUrl = ""; // fallback
      }

      await api.sendMessage({
        body: `🎉 Ton personnage **${playerData.player_name}** a été créé !`,
        attachment: characterImageUrl ? await api.getStreamFromURL(characterImageUrl) : undefined
      }, threadID);

      // Lancer le monde principal
      const eqWorld = require('./eq-world.js');
      eqWorld.enterWorld(uid, api);
    };
  }
};
