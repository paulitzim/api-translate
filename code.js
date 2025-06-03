/*
 * Figma Plugin: AI Translator (English → Spanish)
 * Now using Vercel backend proxy
 */

figma.showUI(__html__, { width: 320, height: 400 });

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === "translate-text") {
    const selection = figma.currentPage.selection;

    for (const node of selection) {
      if (node.type === "TEXT") {
        const original = node.characters;
        node.setPluginData("originalText", original);

        await figma.loadFontAsync(node.fontName);
        const translated = await fetchTranslationFromVercel(original);
        node.characters = translated;
      }
    }

    figma.notify("Translation applied");
  }

  if (msg.type === "revert-text") {
    const selection = figma.currentPage.selection;

    for (const node of selection) {
      if (node.type === "TEXT") {
        const originalText = node.getPluginData("originalText");
        if (originalText) {
          await figma.loadFontAsync(node.fontName);
          node.characters = originalText;
        }
      }
    }

    figma.notify("Reverted to original text");
  }
};

async function fetchTranslationFromVercel(text) {
  try {
    const res = await fetch("https://api-translate-livid.vercel.app/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    return data.translatedText || text;
  } catch (err) {
    console.error("Translation failed", err);
    return text;
  }
}
