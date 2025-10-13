/cmd install pokepedia.js const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GOOGLE_API_KEY = 'AIzaSyB-5xupIP8854HfB6AHPfLx7bEDCqoUSKE';
const GOOGLE_SEARCH_ENGINE_ID = '36bfdad9ce0e148a0';
const GEMINI_API_KEY = 'AIzaSyBbI6BZ1oEP-6XUYWD7V-kRQK6euVCg8F0';

// --- Helper Gemini AI ---
async function analyzeWithGemini(prompt) {
    try {
        const genai = require('genai');
        const client = new genai.Client({ api_key: GEMINI_API_KEY });
        const response = await client.models.generate_content({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
            config: { temperature: 0.2, top_p: 0.9, max_output_tokens: 1024 }
        });
        return response.text || "Aucune réponse générée par l'IA.";
    } catch (e) {
        console.error('❌ Erreur Gemini AI:', e);
        return "Erreur lors de l'analyse IA.";
    }
}

// --- Helper Google Search ---
async function googleSearch(query, numResults = 5) {
    try {
        const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                q: query,
                key: GOOGLE_API_KEY,
                cx: GOOGLE_SEARCH_ENGINE_ID,
                num: Math.min(numResults, 10),
                siteSearch: 'pokepedia.fr',
                siteSearchFilter: 'i'
            },
            timeout: 10000
        });
        return res.data.items || [];
    } catch (e) {
        console.error('❌ Erreur Google Search:', e);
        return [];
    }
}

// --- Helper récupération texte page ---
async function fetchPageContent(url) {
    try {
        const { default: BeautifulSoup } = await import('beautifulsoup4');
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
        const soup = new BeautifulSoup(res.data, 'html.parser');
        for (const s of soup.find_all(['script', 'style', 'nav', 'footer', 'header'])) s.extract();
        return soup.get_text(separator=' ', strip=true).replace(/\s+/g, ' ');
    } catch (e) {
        console.error('⚠️ Erreur fetchPageContent:', e);
        return null;
    }
}

module.exports = {
    config: {
        name: 'pokepedia',
        aliases: ['pokemon', 'pokeinfo', 'pokémon'],
        version: '2.0',
        author: 'Merdi Madimba',
        countDown: 5,
        role: 0,
        shortDescription: { fr: 'Infos détaillées sur tous les Pokémon connus avec IA' },
        longDescription: { fr: 'Affiche image, description enrichie, types, capacités, stats, évolutions, habitat, génération, taux de capture et mouvements principaux.' },
        category: 'Fun',
        guide: { fr: 'Usage: {p}pokepedia <nom_du_pokemon> (ex: {p}pokepedia bulbizarre)' }
    },

    onStart: async function ({ api, event, args }) {
        try {
            if (!args[0])
                return api.sendMessage('❌ | Utilise : pokepedia <nom_du_pokemon>', event.threadID, event.messageID);

            let query = args.join('-').toLowerCase().trim();
            query = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            // Récupération liste Pokémon
            let allPokemon = [];
            try {
                const listRes = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=2000');
                allPokemon = listRes.data.results.map(p => p.name);
            } catch {
                return api.sendMessage('⚠️ Impossible de récupérer la liste des Pokémon.', event.threadID, event.messageID);
            }

            const found = allPokemon.find(name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === query);
            if (!found)
                return api.sendMessage(`❌ Aucun Pokémon trouvé pour "${args.join(' ')}"`, event.threadID, event.messageID);

            const pokeUrl = `https://pokeapi.co/api/v2/pokemon/${found}`;
            const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${found}`;
            const [pokeRes, speciesRes] = await Promise.all([axios.get(pokeUrl), axios.get(speciesUrl).catch(() => null)]);
            const poke = pokeRes.data;
            const species = speciesRes ? speciesRes.data : null;

            const artwork = poke.sprites?.other?.['official-artwork']?.front_default || poke.sprites?.front_default || null;

            let description = 'Aucune description disponible.';
            if (species?.flavor_text_entries) {
                const fr = species.flavor_text_entries.find(e => e.language.name === 'fr');
                const en = species.flavor_text_entries.find(e => e.language.name === 'en');
                description = fr ? fr.flavor_text.replace(/\n|\f/g, ' ') : en ? en.flavor_text.replace(/\n|\f/g, ' ') : description;
            }

            const types = poke.types.map(t => t.type.name).join(', ');
            const abilities = poke.abilities.map(a => `${a.is_hidden ? '(Cachée) ' : ''}${a.ability.name.replace('-', ' ')}`).join(', ');
            const stats = poke.stats.map(s => `${s.stat.name.replace('-', ' ')}: ${s.base_stat}`).join('\n');
            const height_m = poke.height ? (poke.height / 10).toFixed(2) + ' m' : 'N/A';
            const weight_kg = poke.weight ? (poke.weight / 10).toFixed(2) + ' kg' : 'N/A';
            const generation = species?.generation?.name || 'N/A';
            const habitat = species?.habitat?.name || 'Inconnu';
            const captureRate = species?.capture_rate ?? 'N/A';

            let evolutionText = 'Aucune chaîne d’évolution trouvée.';
            if (species?.evolution_chain?.url) {
                try {
                    const evoRes = await axios.get(species.evolution_chain.url);
                    const chain = evoRes.data.chain;
                    const evoNames = [];
                    (function walk(node) {
                        if (!node) return;
                        if (node.species?.name) evoNames.push(node.species.name);
                        if (node.evolves_to?.length > 0) node.evolves_to.forEach(child => walk(child));
                    })(chain);
                    if (evoNames.length) evolutionText = evoNames.join(' → ');
                } catch { evolutionText = 'Impossible de récupérer la chaîne d’évolution.'; }
            }

            const movesDetails = await Promise.all(
                poke.moves.slice(0, 10).map(async m => {
                    try {
                        const moveRes = await axios.get(m.move.url);
                        const move = moveRes.data;
                        const moveNameFR = move.names.find(n => n.language.name === 'fr')?.name || move.name.replace('-', ' ');
                        return `| ${moveNameFR} | ${move.type.name} |`;
                    } catch {
                        return `| ${m.move.name} | N/A |`;
                    }
                })
            );

            // Recherche Google Poképedia + analyse Gemini
            const searchResults = await googleSearch(`${found} site:pokepedia.fr`, 5);
            let contentList = [];
            for (const res of searchResults) {
                const content = await fetchPageContent(res.link);
                if (content) contentList.push({ title: res.title, content });
            }

            let aiDescription = description;
            if (contentList.length) {
                let context = "DONNÉES POKEPEDIA.FR:\n\n";
                contentList.forEach((r, i) => context += `--- SOURCE ${i+1} ---\n${r.title}\n${r.content.slice(0, 4000)}\n\n`);
                const prompt = `${context}\nQUESTION: "${found}"\nINSTRUCTIONS: Résume les infos essentielles, types, stats, évolutions, mouvements, génération.\nRéponse concise et directe :`;
                aiDescription = await analyzeWithGemini(prompt);
            }

            const name = poke.name.charAt(0).toUpperCase() + poke.name.slice(1);
            const dex = poke.id;

            const message =
`🌐 𝙋𝙊𝙆𝙀𝙋𝙀𝘿𝙄𝘼 🌐 — ${name} (N°${dex})

📝 𝘿𝙚𝙨𝙘𝙧𝙞𝙥𝙩𝙞𝙤𝙣 𝙚𝙣𝙧𝙞𝙘𝙝𝙞𝙨 :
${aiDescription}

🔷 𝙏𝙮𝙥𝙚𝙨 : ${types}
⚔️ 𝘾𝙖𝙥𝙖𝙘𝙞𝙩é𝙨 : ${abilities}
📊 𝙎𝙩𝙖𝙩𝙨 :
${stats}

📏 𝙏𝙖𝙞𝙡𝙡𝙚 : ${height_m} • ⚖️ 𝘗𝘰𝘪𝘥𝘴 : ${weight_kg}
🌱 𝙃𝙖𝙗𝙞𝙩𝙖𝙩 : ${habitat} • 𝘎é𝘯é𝘳𝘢𝘵𝘪𝘰𝘯 : ${generation} • 𝘛𝘢𝘶𝘹 𝘥𝘦 𝘤𝘢𝘱𝘵𝘶𝘳𝘦 : ${captureRate}

🔁 𝘾𝙝𝙖î𝙣𝙚 𝙙’é𝙫𝙤𝙡𝙪𝙩𝙞𝙤𝙣 : ${evolutionText}

💥 𝙈𝙤𝙪𝙫𝙚𝙢𝙚𝙣𝙩𝙨 𝙥𝙧𝙞𝙣𝙘𝙞𝙥𝙖𝙪𝙭 (Nom / Type) :
| Nom | Type |
${movesDetails.join('\n')}`;

            if (artwork) {
                const tmpDir = path.join(__dirname, 'tmp');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

                const filePath = path.join(tmpDir, `${poke.name}-${Date.now()}.png`);
                const writer = (await axios({ url: artwork, responseType: 'stream' })).data.pipe(fs.createWriteStream(filePath));
                await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

                api.sendMessage({ body: message, attachment: fs.createReadStream(filePath) }, event.threadID, () => fs.unlink(filePath, () => { }), event.messageID);
            } else {
                api.sendMessage(message, event.threadID, event.messageID);
            }

        } catch (error) {
            console.error(error);
            api.sendMessage('⚠️ Une erreur est survenue lors de la récupération des données Poképedia.', event.threadID, event.messageID);
        }
    }
};
