const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GEMINI_API_KEY = 'AIzaSyBKKDpyaluhRCAh8ikvm-ZFJidtfKBCVNw';
const GEMINI_MODEL = 'gemini-2.5-flash';

module.exports = {
  generateQuest: async (uid, api, context = {}) => {
    // Récupère le joueur
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('uid', uid)
      .single();

    if (!player) {
      api.sendMessage("❌ Joueur introuvable.", uid);
      return;
    }

    // Prépare le prompt pour Gemini
    let prompt = `You are a fantasy game quest generator. 
Create an engaging quest for a player in a medieval fantasy world named Elfalia Quest.
Player info: Name: ${player.player_name}, Class: ${player.class}, Alignment: ${player.alignment}.
Include a scenario with 3 choices labeled A, B, C and possible outcomes. Keep it concise but immersive.
`;

    if (context.location) prompt += `The player is currently at ${context.location}.\n`;

    try {
      const response = await axios.post(`https://gemini.googleapis.com/v1/models/${GEMINI_MODEL}:generateText`, {
        prompt: prompt,
        maxOutputTokens: 500
      }, {
        headers: {
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      const questText = response.data.output_text || "Le générateur n'a pas pu créer la quête.";

      // Envoie la quête au joueur
      api.sendMessage(`🗡 Nouvelle quête pour **${player.player_name}** :\n${questText}`, uid);

      // Sauvegarde la quête pour le joueur
      await supabase.from('quests').insert([{
        uid,
        quest_text: questText,
        status: 'active',
        created_at: new Date()
      }]);
    } catch (err) {
      console.log("Erreur Gemini :", err);
      api.sendMessage("⚠️ Impossible de générer la quête pour le moment.", uid);
    }
  }
};
