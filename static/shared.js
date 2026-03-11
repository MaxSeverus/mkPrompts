function highlightParameters(prompt) {
  return prompt.replace(/\[[^\]]+\]/g, (m) => `<span class="param">${m}</span>`);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPrompt(text) {
  return highlightParameters(escapeHtml(text));
}
