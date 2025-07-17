// code.js
figma.showUI(__html__, { width: 360, height: 480 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'translate') {
    const { market } = msg;
    const user = figma.currentUser;
    const userName = user ? (user.name || user.email) : 'Unknown';
    const nodes = figma.currentPage.selection;
    const count = nodes.length;

    // Inicio de progreso
    figma.ui.postMessage({
      type: 'progress',
      message: `Starting translation of ${count} layer${count !== 1 ? 's' : ''}...`
    });

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      if (node.type === 'TEXT') {
        try {
          // 1) Llamada a la API con validación de error
          const res = await fetch('https://api-translate-livid.vercel.app/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: node.characters, market })
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API error ${res.status}: ${errText}`);
          }
          const { translatedText } = await res.json();

          // 2) Carga de todas las fuentes usadas en el nodo
          const fontNames = [];
          for (let j = 0; j < node.characters.length; j++) {
            const font = node.getRangeFontName(j, j + 1);
            if (typeof font !== 'symbol') {
              const { family, style } = font;
              if (!fontNames.some(f => f.family === family && f.style === style)) {
                fontNames.push(font);
              }
            }
          }
          await Promise.all(fontNames.map(f => figma.loadFontAsync(f)));

          // 3) Asignación del texto traducido
          node.setPluginData('originalText', node.characters);
          node.characters = translatedText || node.characters;

          figma.ui.postMessage({
            type: 'progress',
            message: `Processed ${i + 1}/${count}`
          });
        } catch (error) {
          figma.ui.postMessage({
            type: 'error',
            message: `Failed ${i + 1}/${count}: ${error.message}`
          });
        }
      }
    }

    // Finalización
    figma.ui.postMessage({ type: 'complete' });
    figma.ui.postMessage({
      type: 'success',
      message: `${count} layer${count !== 1 ? 's' : ''} translated`
    });

    // Log de uso
    figma.ui.postMessage({
      type: 'request-country-log',
      payload: {
        market,
        pluginVersion: `${figma.pluginId}@${figma.command}`,
        userName,
        nodeCount: count
      }
    });
  }
};
