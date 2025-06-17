figma.showUI(__html__, { width: 320, height: 400 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "translate") {
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
          // Load font before accessing text
          await figma.loadFontAsync(node.fontName);
          
          const originalText = node.characters;
          if (!originalText || originalText.trim() === "") {
            continue;
          }

          // Make API request
          const response = await fetch("https://api-translate-livid.vercel.app/api/translate", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ 
              text: originalText, 
              market: msg.market || "Panama" 
            })
          });

          // Handle rate limiting
          if (response.status === 429) {
            const data = await response.json();
            figma.ui.postMessage({ 
              type: 'rate-limit',
              retryAfter: data.retryAfter || 60
            });
            return;
          }

          // Handle other errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            figma.ui.postMessage({ 
              type: 'error',
              message: `API Error: ${errorData.message || response.statusText || 'Unknown error'}`
            });
            errorCount++;
            continue;
          }

          // Parse response
          const data = await response.json();
          
          // Validate response
          if (!data || typeof data !== 'object' || !data.translatedText || typeof data.translatedText !== 'string') {
            figma.ui.postMessage({ 
              type: 'error',
              message: 'Invalid response from translation service'
            });
            errorCount++;
            continue;
          }

          // Store original text and update with translation
          await node.setPluginData("originalText", originalText);
          node.characters = data.translatedText;
          successCount++;

        } catch (err) {
          console.error("Translation error:", err);
          figma.ui.postMessage({ 
            type: 'error',
            message: `Error: ${err.message || 'Unknown error occurred'}`
          });
          errorCount++;
        }
      }
    }

    // Send final status
    if (successCount > 0) {
      figma.ui.postMessage({ 
        type: 'success',
        message: `Successfully translated ${successCount} layer${successCount > 1 ? 's' : ''}`
      });
    } else if (errorCount > 0) {
      figma.ui.postMessage({ 
        type: 'error',
        message: `Failed to translate ${errorCount} layer${errorCount > 1 ? 's' : ''}`
      });
    }
  }
};
