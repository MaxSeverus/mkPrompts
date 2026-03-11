function highlightParameters(prompt) {
  return prompt.replace(/\[[^\]]+\]/g, (m) => `<span class="param">${m}</span>`);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPrompt(text) {
  return highlightParameters(escapeHtml(String(text || '')));
}

function getAppBasePath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const baseRouteMarkers = ['static', 'admin', 'prompt-admin'];
  const markerPositions = baseRouteMarkers
    .map((marker) => parts.indexOf(marker))
    .filter((idx) => idx >= 0);
  const staticIdx = parts.indexOf('static');
  const adminIdx = parts.indexOf('admin');
  const markerIdx = markerPositions.length > 0 ? Math.min(...markerPositions) : (staticIdx >= 0 ? staticIdx : adminIdx);
  if (markerIdx >= 0) {
    return '/' + parts.slice(0, markerIdx).join('/');
  }
  if (parts.length > 0 && baseRouteMarkers.includes(parts[parts.length - 1])) {
    return '/' + parts.slice(0, -1).join('/');
  }
  if (parts.length > 0 && (parts[parts.length - 1].includes('.') || parts[parts.length - 1] === '')) {
    return '/' + parts.slice(0, -1).join('/');
  }
  return '/' + parts.join('/');
}

function apiUrl(path) {
  const base = getAppBasePath().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function appUrl(path) {
  const base = getAppBasePath().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
