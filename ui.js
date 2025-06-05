document.getElementById('translate').onclick = () => {
  const market = document.getElementById('market').value;
  parent.postMessage({ pluginMessage: { type: 'translate-selected', market } }, '*');
};

document.getElementById('rollback').onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'rollback' } }, '*');
};

onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (msg.status) {
    document.getElementById('status').innerText = msg.status;
  }
};
