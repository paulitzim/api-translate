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

    let successCount = 0;
    let errorCount = 0;

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

        if (!response.ok) {
          if (response.status === 429) {
            const data = await response.json();
            figma.ui.postMessage({ 
              type: 'rate-limit',
              retryAfter: data.retryAfter || 60
            });
            return;
          }
          errorCount++;
          continue;
        }

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

        if (!translated) {
          errorCount++;
          continue;
        }

        await node.setPluginData("originalText", originalText);
        node.characters = translated;
        successCount++;
      } catch (err) {
        console.warn("Error processing node:", err);
        errorCount++;
      }
    }

    figma.ui.postMessage({ 
      type: 'success',
      message: `Translation completed! Successfully translated ${successCount} layers${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
    });
  }
  else if (msg.type === "translate") {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ 
        type: 'error',
        message: 'Please select at least one text layer.'
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const node of selection) {
      if (node.type === "TEXT") {
        try {
          await figma.loadFontAsync(node.fontName);
          const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: node.characters, market: msg.market || "Panama" })
          });

          if (!response.ok) {
            if (response.status === 429) {
              const data = await response.json();
              figma.ui.postMessage({ 
                type: 'rate-limit',
                retryAfter: data.retryAfter || 60
              });
              return;
            }
            errorCount++;
            continue;
          }

          const data = await response.json();
          if (data?.translatedText) {
            node.characters = data.translatedText;
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.warn("Error:", err);
          errorCount++;
        }
      }
    }

    figma.ui.postMessage({ 
      type: 'success',
      message: `Translation completed! Successfully translated ${successCount} layers${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
    });
  }
};
