const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini API pour générer descriptions et quêtes
const GEMINI_API_KEY = 'AIzaSyBKKDpyaluhRCAh8ikvm-ZFJidtfKBCVNw';
const GEMINI_MODEL = 'gemini-2.5-flash';

module.exports = {
  generateQuest: async (uid, api) => {
    // Récupérer le joueur
    const { data: player } = await supabase.from('players').select('*').eq('uid', uid).single();
    if (!player) {
      api.sendMessage("Impossible de trouver le joueur pour générer une quête.", uid);
      return;
    }

    // Crée un prompt pour Gemini
    const prompt = `Generate a fantasy RPG quest for a player:
Player name: ${player.player_name}
Player class: ${player.class}
Player alignment: ${player.alignment}
Include 3 choices: A, B, C
Describe the environment, objectives, and possible rewards in a short paragraph.`;

    let questText = "";
    try {
      const response = await axios.post(
        'https://gemini.googleapis.com/v1/models/' + GEMINI_MODEL + ':generateText',
        { prompt, maxOutputTokens: 300 },
        { headers: { "Authorization": `Bearer ${GEMINI_API_KEY}` } }
      );
      questText = response.data.output_text || "Une quête mystérieuse t'attend...";
    } catch (err) {
      console.log("Erreur Gemini :", err);
      questText = "Une quête mystérieuse t'attend...";
    }

    // Envoyer la quête au joueur
    api.sendMessage(`🗺️ Nouvelle Quête pour **${player.player_name}** :\n\n${questText}`, uid);

    // Stocker la quête dans Supabase
    await supabase.from('quests').insert([{
      uid,
      quest_text: questText,
      status: "active",
      created_at: new Date().toISOString()
    }]);
  },

  completeQuest: async (uid, questId, choice, api) => {
    // Récupérer la quête
    const { data: quest } = await supabase.from('quests').select('*').eq('id', questId).single();
    if (!quest) return;

    // Déterminer résultat selon le choix
    let resultText = "";
    switch (choice.toLowerCase()) {
      case 'a': resultText = "Tu as choisi le chemin courageux et gagné de l'expérience."; break;
      case 'b': resultText = "Tu as choisi la voie prudente et trouvé un objet rare."; break;
      case 'c': resultText = "Tu as choisi la voie risquée, attention aux conséquences !"; break;
      default: resultText = "Choix invalide, la quête reste en attente."; break;
    }

    api.sendMessage(`✅ Résultat de la quête : ${resultText}`, uid);

    // Marquer la quête comme complétée
    await supabase.from('quests').update({ status: 'completed', choice }).eq('id', questId);
  }
};
