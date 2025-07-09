figma.showUI(__html__, { width: 320, height: 400 });

// Helper function to process a single text node
async function processTextNode(node, market, action = "translate", nodeCount = 1){
  if (node.type !== "TEXT") {
    return { processed: true, success: false, error: null };
  }

  try {
    // Load font before accessing text
    await figma.loadFontAsync(node.fontName);
    
    const originalText = node.characters;
    if (!originalText || originalText.trim() === "") {
      return { processed: true, success: false, error: null };
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
        market: market || "Panama" 
      })
    });

    // Handle rate limiting
    if (response.status === 429) {
      const data = await response.json();
      return { 
        processed: false, 
        success: false, 
        error: { 
          type: 'rate-limit',
          retryAfter: data.retryAfter || 60
        }
      };
    }
    await fetch("https://api-translate-livid.vercel.app/api/proxy-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        market,
        action,
        nodeCount,
      }),
    });


    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        processed: true, 
        success: false, 
        error: { 
          type: 'error',
          message: `API Error: ${errorData.message || response.statusText || 'Unknown error'}`
        }
      };
    }

    // Parse response
    const data = await response.json();
    
    // Validate response
    if (!data || typeof data !== 'object' || !data.translatedText || typeof data.translatedText !== 'string') {
      return { 
        processed: true, 
        success: false, 
        error: { 
          type: 'error',
          message: 'Invalid response from translation service'
        }
      };
    }

    // Store original text and update with translation
    await node.setPluginData("originalText", originalText);
    node.characters = data.translatedText;
    
    return { processed: true, success: true, error: null };

  } catch (err) {
    console.error("Translation error:", err);
    return { 
      processed: true, 
      success: false, 
      error: { 
        type: 'error',
        message: `Error: ${err.message || 'Unknown error occurred'}`
      }
    };
  }
}

// Message handler
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
    let processedCount = 0;
    const totalNodes = selection.length;

    try {
      for (const node of selection) {
        const result = await processTextNode(node, msg.market, msg.type, totalNodes);
        
        if (!result.processed) {
          if (result.error && result.error.type === 'rate-limit') {
            figma.ui.postMessage({ 
              type: 'rate-limit',
              retryAfter: result.error.retryAfter
            });
            return;
          }
          continue;
        }

        processedCount++;
        
        if (result.success) {
          successCount++;
        } else if (result.error) {
          errorCount++;
          figma.ui.postMessage({ 
            type: 'error',
            message: result.error.message
          });
        }

        // Send progress update
        figma.ui.postMessage({ 
          type: 'progress',
          message: `Processed ${processedCount} of ${totalNodes} layers`
        });
      }

      // Send completion message
      figma.ui.postMessage({ type: 'complete' });

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
      } else {
        figma.ui.postMessage({ 
          type: 'error',
          message: 'No text layers were found to translate.'
        });
      }
    } catch (err) {
      console.error("Translation error:", err);
      figma.ui.postMessage({ type: 'complete' });
      figma.ui.postMessage({ 
        type: 'error',
        message: `Error: ${err.message || 'Unknown error occurred'}`
      });
    }
  }
};
