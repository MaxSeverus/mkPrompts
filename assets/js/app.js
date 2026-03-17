const promptList = document.getElementById('promptList');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const dirButton = document.getElementById('dirButton');
const viewSwitch = document.getElementById('viewSwitch');
const toast = document.getElementById('toast');
const nrFilterSection = document.getElementById('nrFilterSection');
const nrFilterButtons = document.getElementById('nrFilterButtons');
const projectFilterSection = document.getElementById('projectFilterSection');
const projectFilterButtons = document.getElementById('projectFilterButtons');
const categoryFilterSection = document.getElementById('categoryFilterSection');
const categoryFilterButtons = document.getElementById('categoryFilterButtons');

let dir = 'asc';
let currentView = 'prompt';
let selectedNr = '';
let selectedProject = '';
let selectedCategory = '';

function normalizeProjectParam(value) {
  return value.trim().replace(/^['\"]|['\"]$/g, '');
}

const projectParam = new URLSearchParams(window.location.search).get('project') || '';
const forcedProject = normalizeProjectParam(projectParam);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function highlightPlaceholders(text) {
  return text.replace(/\[([^\]]+)\]/g, '<span class="placeholder">[$1]</span>');
}

function updateSortOptions() {
  if (currentView === 'link') {
    searchInput.placeholder = 'Beschreibung, URL oder Kategorie durchsuchen';
    sortSelect.innerHTML = '<option value="description">Beschreibung</option><option value="category">Kategorie</option>';
    return;
  }

  searchInput.placeholder = 'Nr, Abkürzung oder Inhalt durchsuchen';
  sortSelect.innerHTML = '<option value="nr">Nr</option><option value="abbreviation">Abkürzung</option>';
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
  if (currentView === 'link') {
    nrFilterSection.classList.add('hidden');
    nrFilterButtons.innerHTML = '';
    return;
  }

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

function renderCategoryFilterButtons(entries) {
  if (!categoryFilterSection || !categoryFilterButtons) return;

  if (currentView !== 'link') {
    selectedCategory = '';
    categoryFilterSection.classList.add('hidden');
    categoryFilterButtons.innerHTML = '';
    return;
  }

  const categoryValues = [...new Set(entries
    .map((entry) => String(entry.category ?? '').trim())
    .filter((value) => value !== ''))]
    .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

  if (selectedCategory && !categoryValues.includes(selectedCategory)) {
    selectedCategory = '';
  }

  categoryFilterButtons.innerHTML = '';

  if (!categoryValues.length) {
    categoryFilterSection.classList.add('hidden');
    return;
  }

  categoryFilterSection.classList.remove('hidden');

  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = `secondary ${selectedCategory === '' ? 'is-active' : ''}`.trim();
  allButton.textContent = 'Alle Kategorien';
  allButton.dataset.category = '';
  categoryFilterButtons.appendChild(allButton);

  categoryValues.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `secondary ${selectedCategory === category ? 'is-active' : ''}`.trim();
    button.textContent = category;
    button.dataset.category = category;
    categoryFilterButtons.appendChild(button);
  });
}

async function loadEntries() {
  if (currentView === 'link') {
    const params = new URLSearchParams({
      q: searchInput.value,
      sort: sortSelect.value,
      dir,
    });

    const res = await fetch(`./api/links.php?${params.toString()}`);
    const payload = await res.json();
    const entries = Array.isArray(payload.data) ? payload.data : [];

    renderProjectFilterButtons([]);
    renderNrFilterButtons([]);
    renderCategoryFilterButtons(entries);

    const filteredEntries = selectedCategory
      ? entries.filter((entry) => String(entry.category ?? '').trim() === selectedCategory)
      : entries;

    promptList.innerHTML = '';
    filteredEntries.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'prompt-card';
      card.innerHTML = `
        <div class="prompt-meta">
          <span><strong>Kategorie:</strong> ${entry.category}</span>
        </div>
        <div class="prompt-row">
          <p class="prompt-text"><strong>${entry.description}</strong><br><a href="${entry.url}" target="_blank" rel="noopener noreferrer">${entry.url}</a></p>
          <button class="copy-button" data-copy="${encodeURIComponent(entry.url)}">kopieren</button>
        </div>
      `;
      promptList.appendChild(card);
    });
    return;
  }

  const params = new URLSearchParams({
    q: searchInput.value,
    sort: sortSelect.value,
    dir,
    type: currentView,
  });

  const effectiveProject = forcedProject || selectedProject;
  if (currentView === 'exercise' && effectiveProject !== '') {
    params.set('project', effectiveProject);
  }

  const res = await fetch(`./api/prompts.php?${params.toString()}`);
  const payload = await res.json();
  const entries = Array.isArray(payload.data) ? payload.data : [];

  renderProjectFilterButtons(entries);
  renderNrFilterButtons(entries);
  renderCategoryFilterButtons([]);

  const filteredEntries = selectedNr
    ? entries.filter((entry) => String(entry.nr ?? '').trim() === selectedNr)
    : entries;

  promptList.innerHTML = '';

  filteredEntries.forEach((entry) => {
    const projectBadge = currentView === 'exercise' && String(entry.project ?? '').trim() !== ''
      ? `<span><strong>Projekt:</strong> ${entry.project}</span>`
      : '';
    const card = document.createElement('article');
    card.className = 'prompt-card';
    card.innerHTML = `
      <div class="prompt-meta">
        ${projectBadge}
        <span><strong>Nr:</strong> ${entry.nr}</span>
        <span><strong>Abkürzung:</strong> ${entry.abbreviation}</span>
      </div>
      <div class="prompt-row">
        <p class="prompt-text">${highlightPlaceholders(entry.prompt)}</p>
        <button class="copy-button" data-copy="${encodeURIComponent(entry.prompt)}">kopieren</button>
      </div>
    `;
    promptList.appendChild(card);
  });
}

function renderProjectFilterButtons(entries) {
  if (!projectFilterSection || !projectFilterButtons) return;

  if (currentView !== 'exercise') {
    selectedProject = '';
    projectFilterSection.classList.add('hidden');
    projectFilterButtons.innerHTML = '';
    return;
  }

  if (forcedProject !== '') {
    selectedProject = forcedProject;
    projectFilterSection.classList.remove('hidden');
    projectFilterButtons.innerHTML = '';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary is-active';
    button.textContent = forcedProject;
    button.dataset.project = forcedProject;
    button.disabled = true;
    projectFilterButtons.appendChild(button);
    return;
  }

  const projectValues = [...new Set(entries
    .map((entry) => String(entry.project ?? '').trim())
    .filter((value) => value !== ''))]
    .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

  if (selectedProject && !projectValues.includes(selectedProject)) {
    selectedProject = '';
  }

  projectFilterButtons.innerHTML = '';

  if (!projectValues.length) {
    projectFilterSection.classList.add('hidden');
    return;
  }

  projectFilterSection.classList.remove('hidden');

  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = `secondary ${selectedProject === '' ? 'is-active' : ''}`.trim();
  allButton.textContent = 'Alle Projekte';
  allButton.dataset.project = '';
  projectFilterButtons.appendChild(allButton);

  projectValues.forEach((project) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `secondary ${selectedProject === project ? 'is-active' : ''}`.trim();
    button.textContent = project;
    button.dataset.project = project;
    projectFilterButtons.appendChild(button);
  });
}

promptList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-copy]');
  if (!button) return;
  const value = decodeURIComponent(button.dataset.copy);
  await navigator.clipboard.writeText(value);
  if (currentView === 'exercise') {
    showToast('Übung kopiert.');
  } else if (currentView === 'link') {
    showToast('Link kopiert.');
  } else {
    showToast('Prompt kopiert.');
  }
});

nrFilterButtons?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-nr]');
  if (!button) return;
  selectedNr = button.dataset.nr || '';
  await loadEntries();
});

projectFilterButtons?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-project]');
  if (!button) return;
  selectedProject = button.dataset.project || '';
  selectedNr = '';
  await loadEntries();
});

categoryFilterButtons?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-category]');
  if (!button) return;
  selectedCategory = button.dataset.category || '';
  await loadEntries();
});

viewSwitch?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-view]');
  if (!button || button.dataset.view === currentView) {
    return;
  }

  currentView = button.dataset.view;
  selectedNr = '';
  selectedCategory = '';
  selectedProject = forcedProject || '';
  updateSwitchButtons();
  updateSortOptions();
  await loadEntries();
});

searchInput.addEventListener('input', loadEntries);
sortSelect.addEventListener('change', loadEntries);
dirButton.addEventListener('click', () => {
  dir = dir === 'asc' ? 'desc' : 'asc';
  dirButton.textContent = dir === 'asc' ? 'Aufsteigend' : 'Absteigend';
  loadEntries();
});

updateSwitchButtons();
updateSortOptions();
loadEntries();
