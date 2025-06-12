figma.showUI(__html__);

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'translate') {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify("Please select at least one text layer.");
      return;
    }

    for (const node of selection) {
      if (node.type !== "TEXT") continue;

      const originalText = node.characters;

      try {
        const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalText,
            market: msg.market
          })
        });

        const data = await response.json();

        if (!data?.translatedText) throw new Error("No translation returned from API.");

        await figma.loadFontAsync(node.fontName);
        node.characters = data.translatedText;
      } catch (error) {
        console.error("Translation error:", error);
        figma.notify("Error translating one or more texts.");
      }
    }

    figma.notify("Translation completed.");
  }
};
