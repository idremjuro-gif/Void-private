const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const REPLICATE_API_KEY = 'r8_68TK5E4rBuWhno024hPqxuNVakAgywU38tQVj';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pendingPlayers = {};

module.exports = {
  config: {
    name: "eq",
    aliases: ["elfaliaquest", "EQ"],
    version: "2.9",
    author: "Merdi Madimba",
    countDown: 5,
    role: 0,
    shortDescription: "Lance Elfalia Quest et crée ton personnage",
    longDescription: "Un jeu RPG où tu crées ton personnage et explores le monde d'Elfalia",
    usage: "!eq",
    category: "🎮 Jeu",
    cooldown: 5
  },

  onStart: async ({ api, event }) => {
    const uid = event.senderID;
    const threadID = event.threadID;

    const welcomeMessage = `
✨🧙‍♂️ Bienvenue dans Elfalia Quest ! ✨

Bienvenue, valeureux aventurier ! 🗡️🏹
Pour répondre aux questions, **commence chaque réponse par !**
Exemple : !Merdi, !Homme, !Guerrier
`;

    await api.sendMessage(welcomeMessage, threadID);

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('uid', uid)
      .single();

    if (existingPlayer) {
      await api.sendMessage(
        `👋 Bienvenue de retour, **${existingPlayer.player_name}** ! Veux-tu recommencer ton personnage ? Réponds par !oui / !non`,
        threadID
      );
      return;
    }

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

    pendingPlayers[threadID] = {
      uid,
      data: { uid },
      questions,
      currentIndex: 0,
      threadID,
      timeoutId: null
    };

    const askNextQuestion = async () => {
      const session = pendingPlayers[threadID];
      if (!session) return;

      if (session.currentIndex >= session.questions.length) {
        await finalizePlayer(threadID, api);
        return;
      }

      const question = session.questions[session.currentIndex];
      await api.sendMessage(question.text, threadID);

      if (session.timeoutId) clearTimeout(session.timeoutId);
      session.timeoutId = setTimeout(() => {
        session.currentIndex++;
        askNextQuestion();
      }, 60000);
    };

    askNextQuestion();
  },

  onMessage: async ({ api, event }) => {
    const threadID = event.threadID;
    const session = pendingPlayers[threadID];
    if (!session) return;

    // On ne prend que le joueur qui a lancé la commande
    if (event.senderID !== session.uid) return;

    let msg = (event.body || "").trim();
    if (!msg.startsWith("!")) return; // seulement les messages qui commencent par !

    msg = msg.slice(1).trim(); // supprime le !

    if (!msg) return;

    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
      session.timeoutId = null;
    }

    const currentQ = session.questions[session.currentIndex];
    session.data[currentQ.key] = msg;
    session.currentIndex++;

    if (session.currentIndex >= session.questions.length) {
      await finalizePlayer(threadID, api);
    } else {
      const nextQ = session.questions[session.currentIndex];
      await api.sendMessage(nextQ.text, threadID);

      // restart timer
      session.timeoutId = setTimeout(() => {
        session.currentIndex++;
        if (session.currentIndex >= session.questions.length) {
          finalizePlayer(threadID, api);
        } else {
          const followingQ = session.questions[session.currentIndex];
          api.sendMessage(`⏰ Temps écoulé. Prochaine :\n${followingQ.text}`, threadID);
        }
      }, 60000);
    }
  }
};

async function finalizePlayer(threadID, api) {
  const session = pendingPlayers[threadID];
  if (!session) return;

  try {
    if (session.timeoutId) clearTimeout(session.timeoutId);

    await supabase.from('players').insert([session.data]);

    let characterImageBuffer = null;
    if (REPLICATE_API_KEY) {
      const prompt = `A ${session.data.sex} character, ${session.data.hair_color} ${session.data.hair_type} hair, wearing ${session.data.outfit}, wielding a ${session.data.weapon}, class ${session.data.class}, alignment ${session.data.alignment}, full body, fantasy style, detailed illustration`;
      try {
        const response = await axios.post('https://api.replicate.com/v1/predictions', {
          version: "flux-pro",
          input: { prompt }
        }, {
          headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }
        });

        const imageUrl = response.data?.output?.[0];
        if (imageUrl) {
          const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          characterImageBuffer = Buffer.from(res.data, 'binary');
        }
      } catch (err) {
        console.error("Error generating image:", err?.response?.data || err.message || err);
      }
    }

    await api.sendMessage({
      body: `🎉 Ton personnage **${session.data.player_name || 'Inconnu'}** a été créé !`,
      attachment: characterImageBuffer || undefined
    }, threadID);

    try {
      const eqWorld = require('eq-world.js');
      if (eqWorld && typeof eqWorld.enterWorld === 'function') {
        eqWorld.enterWorld(session.uid, api);
      }
    } catch (e) {}

  } catch (err) {
    console.error("Finalize player error:", err);
    await api.sendMessage("❌ Une erreur est survenue lors de la création de ton personnage.", threadID);
  } finally {
    delete pendingPlayers[threadID];
  }
                          }
