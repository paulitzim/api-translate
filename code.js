figma.showUI(__html__, { width: 280, height: 300 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "translate") {
    const { text, market } = msg;

    try {
      const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text, market })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error en la traducción");
      }

      const translatedText = data.translatedText;

      const nodes = figma.currentPage.selection;
      for (const node of nodes) {
        if ("characters" in node) {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          node.characters = translatedText;
        }
      }

      figma.closePlugin("Traducción aplicada correctamente.");
    } catch (error) {
      console.error("Error en el plugin:", error);
      figma.closePlugin("Hubo un error: " + error.message);
    }
  }
};
