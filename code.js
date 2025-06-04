const selection = figma.currentPage.selection;

if (selection.length > 0 && selection[0].type === "TEXT") {
  const originalText = selection[0].characters;

  const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: originalText,
      market: "Panama" // o "Puerto Rico"
    })
  });

  const data = await response.json();
  selection[0].characters = data.translatedText;
}
