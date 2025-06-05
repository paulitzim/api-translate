async function translateSelectedText() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify("Please select at least one text layer.");
    figma.closePlugin();
    return;
  }

  const node = selection[0];

  if (node.type !== "TEXT") {
    figma.notify("Selected node is not a text layer.");
    figma.closePlugin();
    return;
  }

  const originalText = node.characters;

  try {
    console.log("Sending to API:", originalText);
    const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: originalText,
        market: "Panama" // change to "Puerto Rico" if needed
      })
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();

    if (!data?.translatedText) throw new Error("No translation returned from API.");

    // Load font before applying new text
    await figma.loadFontAsync(node.fontName);
    node.characters = data.translatedText;
    figma.notify("Text translated successfully.");
  } catch (error) {
    console.error("Translation error:", error);
    figma.notify("There was an error during translation.");
  }

  figma.closePlugin();
}

translateSelectedText();
