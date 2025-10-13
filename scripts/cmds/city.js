// ----------------- scripts/cmds/city.js  (v5.2) -----------------
//  • Limite : max 19 villes créées
//  • TOP affiche toujours l’or (0 $ si champ manquant)

const fs   = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, 'city-data.js');

let db = { cities: {}, market: { prices: {}, lastUpdate: 0 } };
if (fs.existsSync(dbFile)) db = require(dbFile);
const save = () =>
  fs.writeFileSync(dbFile, 'module.exports = ' + JSON.stringify(db, null, 2));

/* ---------- CONFIG ---------- */
const BUILD_COST   = { house:500,farm:700,mine:900,factory:1500,bank:2000,
                       school:1200,transport:1000,barracks:2500 };
const BUILD_INCOME = { farm:15,mine:25,factory:100,bank:150,school:30,transport:20 };
const RES   = ['wood','stone','iron','copper','coal','goldOre'];
const RANGE = { wood:[4,9],stone:[6,11],iron:[15,30],copper:[12,25],coal:[10,20],goldOre:[35,55] };
const EVENTS = [
  {txt:'🚨 𝗖𝗮𝗺𝗯𝗿𝗶𝗼𝗹𝗮𝗴𝗲 : -2000$',              gold:-2000},
  {txt:'🔥 𝗜𝗻𝗰𝗲𝗻𝗱𝗶𝗲 : -5 wood',                   res:{wood:-5}},
  {txt:'💥 𝗦𝗲́𝗶𝘀𝗺𝗲 : -1000$',                      gold:-1000},
  {txt:'🦠 𝗖𝗢𝗩𝗜𝗗-19 : -40 pop',                   pop:-40},
  {txt:'🎁 Nouveau filon : +20 iron',             res:{iron:20}},
  {txt:"💎 𝗚𝗶𝘀𝗲𝗺𝗲𝗻𝘁 𝗱'or : +1000$",              gold:+1000}
];
const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;

/* ---------- HELPERS ---------- */
function refreshMarket () {
  if (Date.now() - db.market.lastUpdate < 86_400_000) return;
  db.market.prices = {};
  for (const r of RES) db.market.prices[r] = rand(...RANGE[r]);
  db.market.lastUpdate = Date.now();
  save();
}
function canUpgrade (c) {
  return c.pop >= c.lvl*100 &&
         c.gold >= c.lvl*10000 &&
         Object.values(c.b).reduce((s,v)=>s+v,0) >= c.lvl*10;
}
function status (c) {
  return `🏙️ ${c.name} (𝗟𝘃𝗹 ${c.lvl})
💰 ${c.gold}$ • 👥 ${c.pop} • 🪖 ${c.army}
𝗕𝗮̂𝘁𝗶𝗺𝗲𝗻𝘁𝘀: ${Object.entries(c.b).map(([k,v])=>k+':'+v).join(' | ')}
𝗥𝗲𝘀𝘀:      ${Object.entries(c.res).map(([k,v])=>k+':'+v).join(' | ')}`;
}
const chooseCityByName = n =>
  Object.values(db.cities).find(v=>v.name.toLowerCase()===n.toLowerCase());

/* ---------- MAIN COMMAND ---------- */
module.exports = {
  config:{
    name:'city',
    version:'5.2',
    author:'𝗠𝗲𝗿𝗱𝗶 𝗠𝗮𝗱𝗶𝗺𝗯𝗮',
    category:'game',
    shortDescription:'City-Builder JvJ'
  },

  onStart({args,event,message}){
    const uid = event.senderID;
    const sub = (args[0]||'').toLowerCase();
    const city = db.cities[uid];

    /* CREATE */
    if(sub==='create'){
      if(city) return message.reply('Ville déjà créée');
      if(Object.keys(db.cities).length>=19)
        return message.reply('❌ Limite atteinte : 19 villes maximum.');
      const name=args.slice(1).join(' ');
      if(!name) return message.reply('𝗡𝗼𝗺 ?');

      db.cities[uid]={
        name, mayor:event.senderName, gold:5000, pop:50, lvl:1, army:0,
        b:{house:1,farm:1,mine:0,factory:0,bank:0,school:0,transport:0,barracks:0},
        res:Object.fromEntries(RES.map(r=>[r,rand(20,40)])),
        produce:[], notif:[], lastCollect:0, lastAttack:0
      };
      const picks=[...RES];
      for(let i=0;i<3;i++)
        db.cities[uid].produce.push(picks.splice(rand(0,picks.length-1),1)[0]);

      save();
      return message.reply(`🏙️ ${name} 𝗙𝗼𝗻𝗱𝗲́𝗲. 𝗥𝗲𝘀𝘀𝗼𝘂𝗿𝗰𝗲𝘀 : ${db.cities[uid].produce.join(', ')}`);
    }
    if(!city) return message.reply('⭕𝗖𝗿𝗲́𝗲 𝘁𝗮 𝘃𝗶𝗹𝗹𝗲: @city create <nom>');

    /* STATUS */
    if(sub==='status') return message.reply(status(city));

    /* BUILD */
    if(sub==='build'){
      const type=args[1];
      if(!BUILD_COST[type])
        return message.reply('𝗧𝘆𝗽𝗲𝘀 : '+Object.keys(BUILD_COST).join(','));
      if(city.gold<BUILD_COST[type]) return message.reply('💸𝗙𝗼𝗻𝘁 𝗶𝗻𝘀𝘂𝗳𝗳𝗶𝘀𝗮𝗻𝘁');
      city.gold-=BUILD_COST[type];
      city.b[type]=(city.b[type]||0)+1;
      if(type==='house') city.pop+=5;
      if(type==='barracks') city.army+=1;
      save();
      return message.reply('𝗖𝗼𝗻𝘀𝘁𝗿𝘂𝗶𝘁 ✅');
    }

    /* COLLECT */
    if(sub==='collect'){
      if(Date.now()-city.lastCollect<60_000)
        return message.reply('Cooldown 1 min');
      city.lastCollect=Date.now();

      let income=city.pop*2;
      for(const [k,n] of Object.entries(city.b))
        income+=(BUILD_INCOME[k]||0)*n;
      city.gold+=income;
      for(const r of city.produce) city.res[r]+=rand(1,5);

      if(Math.random()<0.10){
        const e=EVENTS[rand(0,EVENTS.length-1)];
        if(e.gold) city.gold=Math.max(0,city.gold+e.gold);
        if(e.pop)  city.pop =Math.max(0,city.pop +e.pop);
        if(e.res)  for(const [k,v] of Object.entries(e.res))
                     city.res[k]=Math.max(0,(city.res[k]||0)+v);
        message.reply(e.txt);
      }
      save();
      return message.reply(`✅𝗖𝗼𝗹𝗹𝗲𝗰𝘁 : +${income}$`);
    }

    /* UPGRADE */
    if(sub==='upgrade')
      return message.reply(
        canUpgrade(city)?(city.lvl++,save(),`Lvl ${city.lvl} !`):
        '𝗖𝗢𝗡𝗗𝗜𝗧𝗜𝗢𝗡 𝗡𝗢𝗡 𝗥𝗘𝗠𝗣𝗟𝗜𝗘 🚫⛔');

    /* MARKET */
    if(sub==='market'){
      refreshMarket();
      const g=db.market.prices;
      return message.reply('🌐 𝗚𝗥𝗔𝗡𝗗 𝗠𝗔𝗥𝗖𝗛𝗘́ 𝗕𝗨𝗜𝗟𝗗 𝗖𝗜𝗧𝗬🏢\n'+
        RES.map(r=>`${r}: ${g[r]}$`).join('\n'));
    }

    /* BUY / SELL */
    if(sub==='buy'||sub==='sell'){
      refreshMarket();
      const res=args[1];
      const qty=parseInt(args[2]);
      if(!RES.includes(res)||!qty)
        return message.reply('𝗙𝗼𝗿𝗺𝗮𝘁 : buy/sell <ress> <qte>');
      const price=db.market.prices[res]*qty;
      if(sub==='buy'){
        if(city.gold<price) return message.reply('💸𝗙𝗼𝗻𝘁 𝗜𝗻𝘀𝘂𝗳𝗳𝗶𝘀𝗮𝗻𝘁');
        city.gold-=price;
        city.res[res]+=qty;
      }else{
        if(city.res[res]<qty) return message.reply('𝗣𝗮𝘀 𝗮𝘀𝘀𝗲𝘇 𝗱𝗲 𝗿𝗲𝘀𝘀𝗼𝘂𝗿𝗰𝗲𝘀');
        city.res[res]-=qty;
        city.gold+=price;
      }
      save();
      return message.reply(sub==='buy'?'Achat effectué':'Vente effectuée');
    }

    /* ATTACK */
    if(sub==='attack'){
      const targetName=args.slice(1).join(' ');
      const target=chooseCityByName(targetName);
      if(!target) return message.reply('𝗘𝗰𝗿𝗶𝘃𝗲𝘇 𝗹𝗲 𝗻𝗼𝗺 𝗱𝗲 𝗹𝗮 𝘃𝗶𝗹𝗹𝗲 𝗰𝗶𝗯𝗹𝗲́𝗲😈 ?');
      if(target===city) return message.reply('𝗣𝗮𝘀 𝘁𝗼𝗶-𝗺𝗲̂𝗺𝗲');
      if(city.army<1)   return message.reply('𝗣𝗮𝘀 d\'𝗮𝗿𝗺𝗲́𝗲🤒');
      if(Date.now()-city.lastAttack<60_000)
        return message.reply('𝗪𝗮𝗶𝘁 1𝗺𝗶𝗻⏰');

      city.lastAttack=Date.now();
      const win=Math.random()+city.army*0.2>Math.random()+target.army*0.2;
      if(win){
        const loot=Math.floor(target.gold*0.15);
        city.gold+=loot; target.gold-=loot;
        target.army=Math.max(0,target.army-1);
        city.army+=1;
        if(!Array.isArray(target.notif)) target.notif=[];
        target.notif.push(`⚔️ ${city.name} 𝗮 𝘃𝗼𝗹𝗲́ ${loot}$.`);
        save();
        return message.reply(`🎌🥳𝗩𝗶𝗰𝘁𝗼𝗶𝗿𝗲 ! 𝗕𝘂𝘁𝗶𝗻 : +${loot}$`);
      }else{
        city.army=Math.max(0,city.army-1); save();
        return message.reply('☠️𝗗𝗲́𝗳𝗮𝗶𝘁𝗲 • -1 𝗔𝗿𝗺𝗲́𝗲');
      }
    }

    /* NOTIF */
    if(sub==='notif'){
      const notes=city.notif.splice(0); save();
      return message.reply(notes.length?'🔔\n'+notes.join('\n'):'𝗔𝘂𝗰𝘂𝗻𝗲 𝗡𝗼𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻');
    }

    /* ARMY */
    if(sub==='army') return message.reply(`𝗔𝗥𝗠𝗘́𝗘🪖 : ${city.army}`);

    /* TOP */
    if(sub==='top'){
      const top=Object.values(db.cities)
        .sort((a,b)=>(b.gold??0)-(a.gold??0))
        .slice(0,5);
      return message.reply(
        '🏆 𝗧𝗢𝗣 5 𝗕𝗘𝗦𝗧 𝗖𝗜𝗧𝗬\n'+
        top.map((c,i)=>`${i+1}. ${c.name} ${(c.gold??0)}$`).join('\n'));
    }

    /* HELP */
    return message.reply(`📜 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗘𝗦
@𝘊𝘪𝘵𝘺 𝘊𝘳𝘦𝘢𝘵𝘦 <nom>
@𝘊𝘪𝘵𝘺 𝘚𝘁𝘢𝘵𝘶𝘴
@𝘊𝘪𝘵𝘺 𝘊𝘰𝘭𝘭𝘦𝘤𝘵
@𝘊𝘪𝘵𝘺 𝘉𝘶𝘪𝘭𝘥 <house|farm|mine|factory|bank|school|transport|barracks>
@𝘊𝘪𝘵𝘺 𝘜𝘱𝘨𝘳𝘢𝘥𝘦
@𝘊𝘪𝘵𝘺 𝘈𝘳𝘮𝘺
@𝘊𝘪𝘵𝘺 𝘢𝘵𝘵𝘢𝘤𝘬 <NomVille>
@𝘊𝘪𝘵𝘺 𝘕𝘰𝘵𝘪𝘧
@𝘊𝘪𝘵𝘺 𝘔𝘢𝘳𝘬𝘦𝘵
@𝘊𝘪𝘵𝘺 𝘉𝘶𝘺 <ress> <qte>
@𝘊𝘪𝘵𝘺 𝘚𝘦𝘭𝘭 <ress> <qte>
@𝘊𝘪𝘵𝘺 𝘛𝘰𝘱`);
  }
};
