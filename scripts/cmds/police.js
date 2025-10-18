module.exports = {
  config: {
    name: "police",
    aliases: ["font", "textstyle"],
    version: "3.0",
    author: "Merdi Madimba",
    countDown: 3,
    role: 0,
    shortDescription: { fr: "Transforme ton texte avec différentes polices" },
    longDescription: {
      fr: "Transforme ton texte dans 30 styles de polices différents (bold, italic, cursive, old, gothic, etc.)."
    },
    category: "fun",
    guide: {
      fr: "/police list — pour voir la liste des polices disponibles\n/police [nom] [texte] — pour transformer ton texte"
    }
  },

  onStart: async function ({ api, event, args }) {
    const fonts = {
      bold: (t) => t.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 119743 - (c < 'a' ? 65 : 97))),
      italic: (t) => t.replace(/[A-Za-z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c >= 'a' ? 119795 - 97 : 119795 - 65))),
      bolditalic: (t) => t.replace(/[A-Za-z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c >= 'a' ? 119847 - 97 : 119843 - 65))),
      monospace: (t) => t.replace(/[A-Za-z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c >= 'a' ? 120367 - 97 : 120367 - 65))),
      fraktur: (t) => t.replace(/[A-Za-z]/g, c => {
        const base = c >= 'a' ? 120146 - 97 : 120068 - 65;
        return String.fromCharCode(c.charCodeAt(0) + base);
      }),
      script: (t) => t.replace(/[A-Za-z]/g, c => {
        const base = c >= 'a' ? 119997 - 97 : 119973 - 65;
        return String.fromCharCode(c.charCodeAt(0) + base);
      }),
      typewriter: (t) => t.replace(/[A-Za-z]/g, c => {
        const base = c >= 'a' ? 120439 - 97 : 120413 - 65;
        return String.fromCharCode(c.charCodeAt(0) + base);
      }),
      smallcaps: (t) => t.replace(/[a-z]/g, c => String.fromCharCode(c.charCodeAt(0) - 32)),
      spaced: (t) => t.split("").join(" "),
      reversed: (t) => [...t].reverse().join(""),
      bubble: (t) => t.replace(/[A-Za-z0-9]/g, c => {
        const bubble = {
          A: "Ⓐ", B: "Ⓑ", C: "Ⓒ", D: "Ⓓ", E: "Ⓔ", F: "Ⓕ", G: "Ⓖ", H: "Ⓗ", I: "Ⓘ", J: "Ⓙ", K: "Ⓚ", L: "Ⓛ", M: "Ⓜ",
          N: "Ⓝ", O: "Ⓞ", P: "Ⓟ", Q: "Ⓠ", R: "Ⓡ", S: "Ⓢ", T: "Ⓣ", U: "Ⓤ", V: "Ⓥ", W: "Ⓦ", X: "Ⓧ", Y: "Ⓨ", Z: "Ⓩ",
          a: "ⓐ", b: "ⓑ", c: "ⓒ", d: "ⓓ", e: "ⓔ", f: "ⓕ", g: "ⓖ", h: "ⓗ", i: "ⓘ", j: "ⓙ", k: "ⓚ", l: "ⓛ", m: "ⓜ",
          n: "ⓝ", o: "ⓞ", p: "ⓟ", q: "ⓠ", r: "ⓡ", s: "ⓢ", t: "ⓣ", u: "ⓤ", v: "ⓥ", w: "ⓦ", x: "ⓧ", y: "ⓨ", z: "ⓩ",
          0: "⓪", 1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤", 6: "⑥", 7: "⑦", 8: "⑧", 9: "⑨"
        };
        return bubble[c] || c;
      }),
      square: (t) => t.replace(/[A-Za-z]/g, c => {
        const squares = {
          A: "🅰️", B: "🅱️", C: "🅲", D: "🅳", E: "🅴", F: "🅵", G: "🅶", H: "🅷", I: "🅸", J: "🅹", K: "🅺", L: "🅻", M: "🅼",
          N: "🅽", O: "🅾️", P: "🅿️", Q: "🆀", R: "🆁", S: "🆂", T: "🆃", U: "🆄", V: "🆅", W: "🆆", X: "🆇", Y: "🆈", Z: "🆉"
        };
        return squares[c.toUpperCase()] || c;
      }),
      underline: (t) => t.split("").join("̲"),
      doubleline: (t) => t.split("").join("̳"),
      strike: (t) => t.split("").join("̶"),
      fancy1: (t) => t.replace(/[a-z]/g, c => "ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻ"[c.charCodeAt(0) - 97] || c),
      fancy2: (t) => t.replace(/[a-z]/g, c => "αв¢∂єƒgнιנкℓмησρqяѕтυνωχуz"[c.charCodeAt(0) - 97] || c),
      fancy3: (t) => t.replace(/[a-z]/g, c => "ค๒ς๔єŦﻮђเןкl๓ภ๏թợгรtยשฬאץչ"[c.charCodeAt(0) - 97] || c),
      fantasy: (t) => t.replace(/[a-z]/g, c => "𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃"[c.charCodeAt(0) - 97] || c),
      oldstyle: (t) => t.replace(/[a-z]/g, c => "𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷"[c.charCodeAt(0) - 97] || c),
      greek: (t) => t.replace(/[A-Za-z]/g, c => "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"[Math.floor(Math.random() * 24)] || c),
      vaporwave: (t) => t.replace(/[A-Za-z]/g, c => String.fromCharCode(c.charCodeAt(0) + 65248)),
      dots: (t) => t.split("").join("·"),
      hearts: (t) => "💖 " + t.split("").join(" 💖 ") + " 💖",
      crazy: (t) => [...t].map(c => c + "͛͗͐̑͒").join(""),
      wave: (t) => t.split("").map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join(""),
      updown: (t) => t.split("").reverse().join("").split("").join("͜"),
      mini: (t) => t.replace(/[a-z]/g, c => "ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻ"[c.charCodeAt(0) - 97] || c)
    };

    const subCmd = args[0]?.toLowerCase();

    // 📜 Afficher la liste
    if (subCmd === "list" || !args[0]) {
      const list = Object.keys(fonts)
        .map((f, i) => `${i + 1}. ${f}`)
        .join("\n");
      return api.sendMessage(`📌🅵🅾🅽🆃🆂 𝙳𝙸𝚂𝙿𝙾𝙽𝙸𝙱𝙻𝙴𝚂 📌\n\n${list}\n\n📘 Utilise : /police [nom] [texte]`, event.threadID, event.messageID);
    }

    // 🔠 Transformation
    const font = fonts[subCmd];
    if (!font) {
      return api.sendMessage("❌ | Police inconnue. Utilise `/police list` pour voir les noms.", event.threadID, event.messageID);
    }

    const text = args.slice(1).join(" ");
    if (!text) return api.sendMessage("✏️ | Indique le texte à transformer.", event.threadID, event.messageID);

    const styled = font(text);
    api.sendMessage(styled, event.threadID, event.messageID);
  }
};
