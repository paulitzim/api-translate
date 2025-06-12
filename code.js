// code.js
figma.showUI(__html__, { width: 320, height: 220 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "translate-text") {
    const market = msg.market || "Puerto Rico"; // Default fallback
    const selection = figma.currentPage.selection;

    if (!selection.length) {
      figma.notify("Please select at least one text node.");
      return;
    }

    for (const node of selection) {
      if (node.type !== "TEXT") {
        figma.notify("All selected nodes must be text layers.");
        continue;
      }

      const original = node.characters;
      const fontName = node.fontName;

      try {
        const translated = await fetchTranslationFromVercel(original, market);
        await figma.loadFontAsync(fontName);
        await node.setPluginData("originalText", original); // rollback support
        node.characters = translated;
      } catch (error) {
        console.error("Translation failed:", error);
        figma.notify("Error during translation.");
      }
    }

    figma.notify("Translation complete.");
  }
};

async function fetchTranslationFromVercel(text, market) {
  try {
    const res = await fetch("https://api-translate-livid.vercel.app/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, market })
    });

    const data = await res.json();
    return data.translatedText || text;
  } catch (err) {
    console.error("Translation failed", err);
    return text;
  }
}
