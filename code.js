figma.showUI(__html__, { width: 300, height: 300 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'translate') {

  if (selection.length === 0) {
    figma.notify("Please select at least one text layer.");
    return;
  }

  if (msg.type === "translate") {
    for (const node of selection) {
      if (node.type !== "TEXT") continue;

      const originalText = node.characters;

      try {
        await figma.loadFontAsync(node.fontName);

        // Save original text in pluginData for rollback
        await node.setPluginData("originalText", originalText);

        const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalText,
            market: msg.market || "Panama",
          }),
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const data = await response.json();
        if (!data || !data.translatedText) throw new Error("No translation returned from API.");

        node.characters = data.translatedText;
      } catch (error) {
        console.error("Translation error:", error);
        figma.notify("Error while translating one or more layers.");
      }
    }

    figma.notify("Translation complete.");
  }
}
}