const promptList = document.getElementById('promptList');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const dirButton = document.getElementById('dirButton');
const viewSwitch = document.getElementById('viewSwitch');
const toast = document.getElementById('toast');
const nrFilterSection = document.getElementById('nrFilterSection');
const nrFilterButtons = document.getElementById('nrFilterButtons');

let dir = 'asc';
let currentView = 'prompt';
let selectedNr = '';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function highlightPlaceholders(text) {
  return text.replace(/\[([^\]]+)\]/g, '<span class="placeholder">[$1]</span>');
}

function updateSwitchButtons() {
  const buttons = viewSwitch?.querySelectorAll('button[data-view]') || [];
  buttons.forEach((button) => {
    const isActive = button.dataset.view === currentView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function renderNrFilterButtons(entries) {
  if (!nrFilterSection || !nrFilterButtons) return;

  const nrValues = [...new Set(entries
    .map((entry) => String(entry.nr ?? '').trim())
    .filter((value) => value !== ''))]
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' }));

  if (selectedNr && !nrValues.includes(selectedNr)) {
    selectedNr = '';
  }

  nrFilterButtons.innerHTML = '';

  if (!nrValues.length) {
    nrFilterSection.classList.add('hidden');
    return;
  }

  nrFilterSection.classList.remove('hidden');

  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = `secondary ${selectedNr === '' ? 'is-active' : ''}`.trim();
  allButton.textContent = 'Alle';
  allButton.dataset.nr = '';
  nrFilterButtons.appendChild(allButton);

  nrValues.forEach((nr) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `secondary ${selectedNr === nr ? 'is-active' : ''}`.trim();
    button.textContent = nr;
    button.dataset.nr = nr;
    nrFilterButtons.appendChild(button);
  });
}

async function loadPrompts() {
  const params = new URLSearchParams({
    q: searchInput.value,
    sort: sortSelect.value,
    dir,
    type: currentView,
  });

  const API_BASE = './api';
  const res = await fetch(`${API_BASE}/prompts.php?${params.toString()}`);
  const payload = await res.json();
  const entries = Array.isArray(payload.data) ? payload.data : [];

  renderNrFilterButtons(entries);

  const filteredEntries = selectedNr
    ? entries.filter((entry) => String(entry.nr ?? '').trim() === selectedNr)
    : entries;

  promptList.innerHTML = '';

  filteredEntries.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'prompt-card';
    card.innerHTML = `
      <div class="prompt-meta">
        <span><strong>Nr:</strong> ${entry.nr}</span>
        <span><strong>Abkürzung:</strong> ${entry.abbreviation}</span>
      </div>
      <div class="prompt-row">
        <p class="prompt-text">${highlightPlaceholders(entry.prompt)}</p>
        <button class="copy-button" data-prompt="${encodeURIComponent(entry.prompt)}">kopieren</button>
      </div>
    `;
    promptList.appendChild(card);
  });
}

promptList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-prompt]');
  if (!button) return;
  const prompt = decodeURIComponent(button.dataset.prompt);
  await navigator.clipboard.writeText(prompt);
  showToast(currentView === 'exercise' ? 'Übung kopiert.' : 'Prompt kopiert.');
});

nrFilterButtons?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-nr]');
  if (!button) return;
  selectedNr = button.dataset.nr || '';
  await loadPrompts();
});

viewSwitch?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-view]');
  if (!button || button.dataset.view === currentView) {
    return;
  }

  currentView = button.dataset.view;
  selectedNr = '';
  updateSwitchButtons();
  await loadPrompts();
});

searchInput.addEventListener('input', loadPrompts);
sortSelect.addEventListener('change', loadPrompts);
dirButton.addEventListener('click', () => {
  dir = dir === 'asc' ? 'desc' : 'asc';
  dirButton.textContent = dir === 'asc' ? 'Aufsteigend' : 'Absteigend';
  loadPrompts();
});

updateSwitchButtons();
loadPrompts();
