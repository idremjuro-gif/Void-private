const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vflmcbbkksuiwxquommy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG1jYmJra3N1aXd4cXVvbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU2OTMsImV4cCI6MjA3NjAzMTY5M30.Td1TEHFtycaUwwB5_-pgqmwn1xaVxQPxVF511-IWLIU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  createGuild: async (uid, guildName, api) => {
    // Vérifie si le joueur possède déjà une guilde
    const { data: existingGuild } = await supabase
      .from('guilds')
      .select('*')
      .eq('leader_uid', uid)
      .single();

    if (existingGuild) {
      api.sendMessage("❌ Tu as déjà créé une guilde.", uid);
      return;
    }

    // Créer la guilde
    const guildData = {
      guild_name: guildName,
      leader_uid: uid,
      members: JSON.stringify([uid])
    };

    await supabase.from('guilds').insert([guildData]);
    api.sendMessage(`🎉 Guilde **${guildName}** créée avec succès ! Tu en es le leader.`, uid);
  },

  joinGuild: async (uid, guildName, api) => {
    const { data: guild } = await supabase
      .from('guilds')
      .select('*')
      .eq('guild_name', guildName)
      .single();

    if (!guild) {
      api.sendMessage("❌ Cette guilde n'existe pas.", uid);
      return;
    }

    let members = JSON.parse(guild.members);
    if (members.includes(uid)) {
      api.sendMessage("✅ Tu fais déjà partie de cette guilde.", uid);
      return;
    }

    members.push(uid);
    await supabase.from('guilds').update({ members: JSON.stringify(members) }).eq('guild_name', guildName);

    api.sendMessage(`🎉 Tu as rejoint la guilde **${guildName}** !`, uid);
  },

  leaveGuild: async (uid, api) => {
    const { data: guild } = await supabase
      .from('guilds')
      .select('*')
      .or(`members.cs.{${uid}}`)
      .single();

    if (!guild) {
      api.sendMessage("❌ Tu n'appartiens à aucune guilde.", uid);
      return;
    }

    let members = JSON.parse(guild.members).filter(member => member !== uid);
    await supabase.from('guilds').update({ members: JSON.stringify(members) }).eq('guild_name', guild.guild_name);

    api.sendMessage(`⚠️ Tu as quitté la guilde **${guild.guild_name}**.`, uid);
  },

  viewGuild: async (guildName, api) => {
    const { data: guild } = await supabase
      .from('guilds')
      .select('*')
      .eq('guild_name', guildName)
      .single();

    if (!guild) {
      api.sendMessage("❌ Cette guilde n'existe pas.", uid);
      return;
    }

    let membersList = JSON.parse(guild.members).join(', ');
    let msg = `🏰 **Guilde : ${guild.guild_name}**\nLeader: ${guild.leader_uid}\nMembres: ${membersList}`;
    api.sendMessage(msg, uid);
  }
};
