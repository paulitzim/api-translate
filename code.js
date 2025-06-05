// code.js

console.log("Llamando a la API con texto seleccionado:", originalText);

async function translateSelectedText() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0 || selection[0].type !== "TEXT") {
    figma.notify("Selecciona una capa de texto para traducir.");
    figma.closePlugin();
    return;
  }

  const originalText = selection[0].characters;

  try {
    const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: originalText,
        market: "Panama" // o "Puerto Rico" si lo necesitas
      })
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.translatedText) {
      selection[0].characters = data.translatedText;
      figma.notify("Texto traducido correctamente.");
    } else {
      throw new Error("Respuesta inesperada del servidor.");
    }
  } catch (error) {
    console.error("Error al traducir:", error);
    figma.notify("Hubo un problema al traducir el texto.");
  }

  figma.closePlugin();
}

translateSelectedText();
