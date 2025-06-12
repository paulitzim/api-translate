figma.showUI(__html__, { width: 320, height: 280 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'translate') {
    const market = msg.market;
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify("Please select at least one text layer.");
      return;
    }

    for (const node of selection) {
      if (node.type !== "TEXT") {
        figma.notify("One or more selected nodes are not text layers.");
        continue;
      }

      const originalText = node.characters;

      try {
        const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalText,
            market: market
          })
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();

        if (!data?.translatedText) throw new Error("No translation returned from API.");

        await figma.loadFontAsync(node.fontName);
        node.characters = data.translatedText;

      } catch (error) {
        console.error("Translation error:", error);
        figma.notify("Error during translation.");
      }
    }

    figma.notify("Translation complete.");
  }
};
