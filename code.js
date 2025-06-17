figma.showUI(__html__, { width: 300, height: 500 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "translate-all") {
    const market = msg.market || "Panama";

    
    const allTextNodes = [];

    function findTextNodes(node) {
      if (node.type === "TEXT") {
        allTextNodes.push(node);
      } else if ("children" in node) {
        for (const child of node.children) {
          findTextNodes(child);
        }
      }
    }

    for (const page of figma.root.children) {
      for (const node of page.children) {
        findTextNodes(node);
      }
    }

    for (const node of allTextNodes) {
      try {
        await figma.loadFontAsync(node.fontName);
        const originalText = node.characters;
        if (!originalText || originalText.trim() === "") continue;


        const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: originalText, market })
        });

        if (!response.ok) continue;

        const data = await response.json();

        let translated = null;
        if (
          data &&
          typeof data === "object" &&
          "translatedText" in data &&
          typeof data.translatedText === "string"
        ) {
          translated = data.translatedText;
        }

        if (!translated) continue;

        await node.setPluginData("originalText", originalText);
        node.characters = translated;
      } catch (err) {
        console.warn("Error processing node:", err);
      }
    }

    figma.notify("All visible text layers translated");
    figma.closePlugin();
  },
  if (msg.type === "translate") {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify("Please select at least one text layer.");
      return;
    }

    for (const node of selection) {
      if (node.type === "TEXT") {
        try {
          await figma.loadFontAsync(node.fontName);
          const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: node.characters, market: msg.market || "Panama" })
          });

          const data = await response.json();
          if (data?.translatedText) {
            node.characters = data.translatedText;
          }
        } catch (err) {
          console.warn("Error:", err);
        }
      }
    }

    figma.notify("Selected text layers translated.");
  }

    // Mantén aquí tu bloque de translate-all si lo tienes también
  };
  
};
