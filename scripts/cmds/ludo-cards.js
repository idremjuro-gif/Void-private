// ------------------ ludo-cards.js ------------------
module.exports = {
  cards: [
    // --- Cartes Chance / Bonus ---
    { type: "gain", text: "💰 Tu trouves un trésor enfoui dans le sable. +300 💰", effect: (player)=>{ player.money+=300; } },
    { type: "gain", text: "🎁 Un bienfaiteur anonyme te fait don de 200 💰", effect: (player)=>{ player.money+=200; } },
    { type: "gain", text: "🏦 La banque t’accorde un bonus de fidélité. +150 💰", effect: (player)=>{ player.money+=150; } },
    { type: "bonus", text: "🚀 Avance de 4 cases supplémentaires", effect: (player, game)=>{ player.position = (player.position+4)%game.boardLength; } },
    { type: "bonus", text: "🌀 Téléportation : choisis une case où aller", effect: (player, game, api, threadID, callback)=>{
        api.sendMessage("🌀 Choisis une case entre 1 et "+game.boardLength, threadID, async (err, info)=>{
            const onReply = async(e)=>{
                const num = parseInt(e.body);
                if(num>=1 && num<=game.boardLength){
                  player.position=num-1;
                  api.sendMessage(`✅ ${player.name} se téléporte à la case ${num}`, threadID);
                  callback();
                } else {
                  api.sendMessage("🚫 Case invalide. Renvoyez un numéro valide.", threadID);
                }
            };
            api.listenReply(e=>onReply(e));
        });
    }},
    { type: "gain", text: "👑 Le roi t’offre un joyau. +500 💰", effect: (player)=>{ player.money+=500; } },
    { type: "bonus", text: "🧙 Un mage te bénit : ton prochain loyer est gratuit", effect: (player)=>{ player.freeRent=true; } },
    { type: "bonus", text: "🕊️ Tu évites tous les pièges pendant 2 tours", effect: (player)=>{ player.safeTurns=2; } },
    { type: "bonus", text: "🧩 Échange ta position avec le joueur le plus riche", effect: (player, game)=>{
        const richest = game.players.reduce((a,b)=>a.money>b.money?a:b);
        const temp = player.position;
        player.position = richest.position;
        richest.position = temp;
    }},
    { type: "gain", text: "🏠 Une vieille maison te revient en héritage : tu gagnes une propriété aléatoire", effect: (player, game)=>{ 
        // Propriété fictive pour l’instant
        player.money+=200;
    }},
    { type: "bonus", text: "🎯 Double ton prochain gain d’argent", effect: (player)=>{ player.doubleNextGain=true; } },
    { type: "gain", text: "🪙 La banque t’a remboursé un impôt trop perçu : +250 💰", effect: (player)=>{ player.money+=250; } },
    { type: "gain", text: "⚙️ Tu répares une route pour le roi : +100 💰", effect: (player)=>{ player.money+=100; } },
    { type: "bonus", text: "🎲 Relance les dés immédiatement", effect: (player, game, api, threadID, callback)=>{ callback(true); } },
    { type: "bonus", text: "🔮 Pioche une autre carte Chance immédiatement", effect: (player, game, api, threadID, callback)=>{ callback("piocheAgain"); } },
    { type: "bonus", text: "🪄 Tu gagnes un bouclier magique contre les malus pour 2 tours", effect: (player)=>{ player.shield=2; } },
    { type: "bonus", text: "🧠 Ton génie t’évite la taxe à venir", effect: (player)=>{ player.avoidTax=true; } },
    { type: "bonus", text: "🦋 Avance jusqu’à la case Banque la plus proche et gagne 300 💰", effect: (player, game)=>{ 
        let pos = player.position;
        while(game.board[pos%game.boardLength] !== "bank") pos++;
        player.position = pos%game.boardLength;
        player.money+=300;
    }},
    { type: "bonus", text: "🕵️ Espionne un joueur : vois son argent et ses propriétés", effect: (player, game, api, threadID)=>{
        const info = game.players.map(p=>`${p.name}: ${p.money} 💰`).join("\n");
        api.sendMessage("🕵️ Informations des joueurs :\n"+info, threadID);
    }},
    { type: "gain", text: "💞 Tous les joueurs te donnent 50 💰 (solidarité royale)", effect: (player, game)=>{
        game.players.forEach(p=>{ if(p!==player) { p.money-=50; player.money+=50; }});
    }},

    // --- Cartes Malchance ---
    { type: "lose", text: "⚡ Foudre du roi : perds 200 💰", effect: (player)=>{ player.money-=200; } },
    { type: "malus", text: "🚔 Tu es pris en fraude ! Direction la prison pendant 1 tour", effect: (player)=>{ player.prison=1; } },
    { type: "malus", text: "🕳️ Tu tombes dans un piège magique : recule de 3 cases", effect: (player, game)=>{ player.position = (player.position+game.boardLength-3)%game.boardLength; } },
    { type: "lose", text: "🧨 Explosion : tu perds 100 💰 et ton prochain tour", effect: (player)=>{ player.money-=100; player.skipNext=true; } },
    { type: "lose", text: "💸 Vol de ton portefeuille ! -250 💰", effect: (player)=>{ player.money-=250; } },
    { type: "lose", text: "🧱 Tu payes la réparation d’un mur : -100 💰", effect: (player)=>{ player.money-=100; } },
    { type: "lose", text: "🧾 Impôt royal : verse 20% de ton argent actuel", effect: (player)=>{ player.money = Math.floor(player.money*0.8); } },
    { type: "malus", text: "⛔ Un garde bloque ta route : tu passes ton tour", effect: (player)=>{ player.skipNext=true; } },
    { type: "malus", text: "🧌 Tu subis une attaque : recule de 5 cases", effect: (player, game)=>{ player.position = (player.position+game.boardLength-5)%game.boardLength; } },
    { type: "malus", text: "💀 Malédiction ! Tous tes gains du prochain tour sont annulés", effect: (player)=>{ player.cancelNextGain=true; } },
    { type: "malus", text: "🌪️ Tempête : tu es téléporté 6 cases en arrière", effect: (player, game)=>{ player.position = (player.position+game.boardLength-6)%game.boardLength; } },
    { type: "lose", text: "🪓 Une taxe spéciale t’enlève 300 💰", effect: (player)=>{ player.money-=300; } },
    { type: "malus", text: "🦴 Tu perds une propriété aléatoire", effect: (player)=>{ /* à implémenter si propriétés */ } },
    { type: "malus", text: "💫 Tu es désorienté : échange ta place avec le dernier joueur", effect: (player, game)=>{
        const last = game.players[game.players.length-1];
        const temp = player.position;
        player.position=last.position;
        last.position=temp;
    }},
    { type: "malus", text: "🐍 Tu glisses sur une case piégée : retour au départ !", effect: (player)=>{ player.position=0; } },

    // --- Cartes Action contre d’autres joueurs ---
    { type: "action", text: "🎯 Choisis un joueur à faire reculer de 5 cases", effect: (player, game, api, threadID, callback)=>{
        const others = game.players.filter(p=>p.id!==player.id);
        const list = others.map((p,i)=>`${i+1}. ${p.name}`).join("\n");
        api.sendMessage(`🎯 Choisis un joueur à reculer de 5 cases :\n${list}`, threadID, (err, info)=>{
            api.listenReply(e=>{
                const index=parseInt(e.body)-1;
                if(index>=0 && index<others.length){
                    others[index].position = (others[index].position+game.boardLength-5)%game.boardLength;
                    api.sendMessage(`✅ ${player.name} a fait reculer ${others[index].name} de 5 cases !`, threadID);
                    callback();
                }
            });
        });
    }},
    { type: "action", text: "💸 Choisis un joueur et vole-lui 200 💰", effect: (player, game, api, threadID, callback)=>{
        const others = game.players.filter(p=>p.id!==player.id);
        const list = others.map((p,i)=>`${i+1}. ${p.name} — ${p.money} 💰`).join("\n");
        api.sendMessage(`💸 Choisis un joueur à voler 200 💰 :\n${list}`, threadID, (err, info)=>{
            api.listenReply(e=>{
                const index=parseInt(e.body)-1;
                if(index>=0 && index<others.length){
                    const steal = Math.min(200, others[index].money);
                    others[index].money -= steal;
                    player.money += steal;
                    api.sendMessage(`✅ ${player.name} a volé ${steal} 💰 à ${others[index].name}`, threadID);
                    callback();
                }
            });
        });
    }},
    { type: "action", text: "🏦 Choisis un joueur : il doit te donner 10% de sa fortune", effect: (player, game, api, threadID, callback)=>{
        const others = game.players.filter(p=>p.id!==player.id);
        const list = others.map((p,i)=>`${i+1}. ${p.name} — ${p.money} 💰`).join("\n");
        api.sendMessage(`🏦 Choisis un joueur pour lui prendre 10% :\n${list}`, threadID, (err, info)=>{
            api.listenReply(e=>{
                const index=parseInt(e.body)-1;
                if(index>=0 && index<others.length){
                    const take = Math.floor(others[index].money*0.1);
                    others[index].money -= take;
                    player.money += take;
                    api.sendMessage(`✅ ${player.name} a pris ${take} 💰 à ${others[index].name}`, threadID);
                    callback();
                }
            });
        });
    }},
    { type: "action", text: "🪙 Échangez ton solde avec un autre joueur", effect: (player, game, api, threadID, callback)=>{
        const others = game.players.filter(p=>p.id!==player.id);
        const list = others.map((p,i)=>`${i+1}. ${p.name} — ${p.money} 💰`).join("\n");
        api.sendMessage(`🪙 Choisis un joueur pour échanger vos soldes :\n${list}`, threadID, (err, info)=>{
            api.listenReply(e=>{
                const index=parseInt(e.body)-1;
                if(index>=0 && index<others.length){
                    const temp=player.money;
                    player.money = others[index].money;
                    others[index].money = temp;
                    api.sendMessage(`✅ ${player.name} a échangé son argent avec ${others[index].name}`, threadID);
                    callback();
                }
            });
        });
    }}
  ],

  drawCard: function(game, player, api, threadID, callback){
    const card = this.cards[Math.floor(Math.random()*this.cards.length)];
    api.sendMessage(`🃏 ${player.name} pioche une carte :\n${card.text}`, threadID, ()=>{
      // appliquer effet
      if(card.effect.length===5){
        card.effect(player, game, api, threadID, callback);
      } else {
        card.effect(player, game);
        callback();
      }
    });
  }
};
