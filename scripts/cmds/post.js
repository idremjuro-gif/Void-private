const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "post",
    version: "1.5",
    author: "Aesther",
    countDown: 5,
    role: 2,
    shortDescription: "Créer un post avec texte + image ou vidéo",
    longDescription: "Publie un post Facebook depuis un message avec ou sans pièce jointe (image/vidéo).",
    category: "utils",
    guide: "{pn} <texte> ou répondre à un média (image/vidéo)"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply, attachments } = event;
    let postMessage = args.join(" ");
    let files = [];

    try {
      // Récupère les pièces jointes depuis le message ou la réponse
      const allAttachments = messageReply?.attachments?.length
        ? messageReply.attachments
        : attachments || [];

      // Téléchargement de chaque fichier joint
      for (const attachment of allAttachments) {
        const fileExt = attachment.type === "video" ? ".mp4" : ".jpg";
        const filePath = path.join(__dirname, "cache", `post_${Date.now()}${fileExt}`);

        const response = await axios({
          url: attachment.url,
          method: "GET",
          responseType: "stream"
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        files.push(fs.createReadStream(filePath));
      }

      // Données à poster
      const postData = { body: postMessage };
      if (files.length > 0) postData.attachment = files;

      // Crée le post
      api.createPost(postData)
        .then((url) => {
          api.sendMessage(
            `✅ Publication réussie !\n🔗 ${url || "Lien non retourné"}`,
            threadID,
            messageID
          );
        })
        .catch((error) => {
          const fallback = error?.data?.story_create?.story?.url;
          const errMsg = error?.message || "Erreur inconnue.";
          if (fallback) {
            return api.sendMessage(
              `✅ Publication réussie (avec avertissement)\n🔗 ${fallback}`,
              threadID,
              messageID
            );
          }
          api.sendMessage(`❌ Échec de la publication :\n${errMsg}`, threadID, messageID);
        })
        .finally(() => {
          // Nettoyage des fichiers temporaires
          for (const stream of files) {
            if (stream.path) {
              fs.unlink(stream.path, err => {
                if (err) console.error("Erreur suppression cache:", err);
              });
            }
          }
        });

    } catch (error) {
      console.error("Erreur:", error);
      api.sendMessage("❌ Une erreur est survenue durant la publication.", threadID, messageID);
      // Nettoyage même en cas d'erreur
      for (const stream of files) {
        if (stream.path) {
          fs.unlink(stream.path, err => {
            if (err) console.error("Erreur suppression cache:", err);
          });
        }
      }
    }
  }
};
