figma.showUI(__html__, { width: 400, height: 300 });

const selectedText = figma.currentPage.selection.find(
  node => node.type === 'TEXT'
);

if (selectedText && selectedText.type === 'TEXT') {
  figma.ui.postMessage({
    type: 'TEXT_SELECTED',
    text: selectedText.characters
  });
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'TRANSLATED_TEXT') {
    if (selectedText && selectedText.type === 'TEXT') {
      await figma.loadFontAsync(selectedText.fontName);
      selectedText.characters = msg.text;
      figma.closePlugin("Texto traducido");
    }
  }
};
