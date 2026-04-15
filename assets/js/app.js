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
const backLink = document.getElementById('backLink');
const pageViewCount = document.getElementById('pageViewCount');

const projectBackLinks = {
  Welle4: 'https://ki-stammtisch.at/ki-stammtisch/ki-stammtisch-pro-4-welle/',
  GdeOstermiething: 'https://ki-stammtisch.at/ki-stammtisch/ki-stammtisch-pro-5-welle/',
};

let dir = 'asc';
let currentView = 'prompt';
let selectedNr = '';
let selectedProject = '';
let selectedCategory = '';

function normalizeView(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'links') return 'link';
  if (normalized === 'prompts') return 'prompt';
  if (normalized === 'übungen' || normalized === 'uebungen') return 'exercise';

  return ['prompt', 'exercise', 'link'].includes(normalized) ? normalized : 'prompt';
}

function normalizeProjectParam(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function formatDateTime(value) {
  if (!value) return '–';
  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyInlineFormatting(text) {
  return text
    .replace(/\[B\](.*?)\[\/B\]/gis, '<strong>$1</strong>')
    .replace(/\[I\](.*?)\[\/I\]/gis, '<em>$1</em>')
    .replace(/\[U\](.*?)\[\/U\]/gis, '<u>$1</u>');
}

function highlightPlaceholders(text) {
  return text.replace(/\[(?!\/?(?:B|I|U)\])([^\]]+)\]/g, '<span class="placeholder">[$1]</span>');
}

function normalizeUrlForHref(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function linkifyUrls(text) {
  return text.replace(/(^|[\s>(])((?:https?:\/\/|www\.)[^\s<]+)/gi, (match, prefix, rawUrl) => {
    const trimmedUrl = rawUrl.replace(/[),.!?:;]+$/g, '');
    const trailing = rawUrl.slice(trimmedUrl.length);

    if (!trimmedUrl) {
      return match;
    }

    const href = escapeHtml(normalizeUrlForHref(trimmedUrl));
    const label = escapeHtml(trimmedUrl);

    return `${prefix}<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>${trailing}`;
  });
}

function formatRichText(value, { highlight = false, linkify = false } = {}) {
  const escaped = escapeHtml(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const withFormatting = applyInlineFormatting(escaped);
  const withHighlights = highlight ? highlightPlaceholders(withFormatting) : withFormatting;
  const withLinks = linkify ? linkifyUrls(withHighlights) : withHighlights;
  return withLinks.replace(/\n/g, '<br>');
}

function updatePageViewDisplay(value) {
  if (!pageViewCount) return;
  pageViewCount.textContent = String(Math.max(0, Number(value) || 0));
}

async function loadPageViewCount() {
  try {
    const res = await fetch('./api/stats.php');
    const payload = await res.json();
    updatePageViewDisplay(payload?.data?.page_views ?? 0);
  } catch (error) {
    updatePageViewDisplay(0);
  }
}

async function trackPageView() {
  try {
    const res = await fetch('./api/track.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'page_view' }),
    });
    const payload = await res.json();
    updatePageViewDisplay(payload?.data?.page_views ?? 0);
  } catch (error) {
    await loadPageViewCount();
  }
}

async function trackPromptAction(id, type) {
  const res = await fetch('./api/track.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'prompt_action', id, type }),
  });

  if (!res.ok) {
    throw new Error('Action tracking failed');
  }

  const payload = await res.json();
  return payload?.data?.action_count ?? null;
}

async function trackLinkAction(url) {
  const res = await fetch('./api/track.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'link_action', url }),
  });

  if (!res.ok) {
    throw new Error('Link tracking failed');
  }

  const payload = await res.json();
  return payload?.data?.action_count ?? null;
}

function updateCardActionCount(button, count) {
  if (count === null || count === undefined) return;
  const card = button.closest('.prompt-card');
  const counter = card?.querySelector('[data-action-count]');
  if (counter) {
    counter.textContent = String(count);
  }
}

const projectParam = new URLSearchParams(window.location.search).get('project') || '';
const forcedProject = normalizeProjectParam(projectParam);

function getFallbackBackUrl() {
  if (forcedProject && projectBackLinks[forcedProject]) {
    return projectBackLinks[forcedProject];
  }

  return 'https://ki-stammtisch.at/ki-stammtisch/';
}

function getBackUrl() {
  const referrer = document.referrer || '';

  if (referrer) {
    try {
      const referrerUrl = new URL(referrer);
      if (referrerUrl.origin !== window.location.origin || referrerUrl.pathname !== window.location.pathname || referrerUrl.search !== window.location.search) {
        return referrerUrl.toString();
      }
    } catch (error) {
      return referrer;
    }
  }

  return getFallbackBackUrl();
}

function initializeBackLink() {
  if (!backLink) return;

  backLink.href = getBackUrl();
  backLink.classList.remove('hidden');
}

initializeBackLink();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function getPublicSortOptions() {
  if (currentView === 'link') {
    return [
      { value: 'description', label: 'Beschreibung' },
      { value: 'category', label: 'Kategorie' },
      { value: 'action_count', label: 'Nutzungen' },
      { value: 'created_at', label: 'Erstellt am' },
      { value: 'updated_at', label: 'Geändert am' },
    ];
  }

  const promptLabel = currentView === 'exercise' ? 'Übung' : 'Prompt';
  return [
    { value: 'nr', label: 'Nr' },
    { value: 'abbreviation', label: 'Abkürzung' },
    { value: 'prompt', label: promptLabel },
    { value: 'action_count', label: 'Nutzungen' },
    { value: 'created_at', label: 'Erstellt am' },
    { value: 'updated_at', label: 'Geändert am' },
  ];
}

function updateSortOptions() {
  searchInput.placeholder = currentView === 'link'
    ? 'Beschreibung, URL oder Kategorie durchsuchen'
    : 'Nr, Abkürzung oder Inhalt durchsuchen';

  const options = getPublicSortOptions();
  const previousValue = sortSelect.value;
  sortSelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join('');

  const availableValues = options.map((option) => option.value);
  sortSelect.value = availableValues.includes(previousValue) ? previousValue : options[0].value;
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

function isGlobalExerciseProject(value) {
  return String(value || '').trim().toLocaleLowerCase('de-DE') === 'alle';
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
    .filter((value) => value !== '' && !isGlobalExerciseProject(value)))]
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

function renderEntryMeta(entry) {
  const items = [];

  if (currentView === 'exercise' && String(entry.project ?? '').trim() !== '') {
    items.push(`<span><strong>Projekt:</strong> ${escapeHtml(entry.project)}</span>`);
  }

  if (currentView === 'link') {
    items.push(`<span><strong>Kategorie:</strong> ${formatRichText(entry.category)}</span>`);
  } else {
    items.push(`<span><strong>Nr:</strong> ${escapeHtml(entry.nr)}</span>`);
    items.push(`<span><strong>Abkürzung:</strong> ${formatRichText(entry.abbreviation)}</span>`);
  }

  items.push(`<span><strong>Nutzungen:</strong> <span data-action-count>${escapeHtml(entry.action_count ?? 0)}</span></span>`);
  items.push(`<span><strong>Erstellt:</strong> ${formatDateTime(entry.created_at)}</span>`);
  items.push(`<span><strong>Geändert:</strong> ${formatDateTime(entry.updated_at)}</span>`);

  return `<div class="prompt-meta">${items.join('')}</div>`;
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
      const safeUrl = normalizeUrlForHref(entry.url);
      const card = document.createElement('article');
      card.className = 'prompt-card';
      card.innerHTML = `
        <div class="prompt-row">
          <div class="prompt-content">
            <div class="prompt-text prompt-link-text">${formatRichText(entry.description, { linkify: true })}</div>
            <a class="prompt-link-url" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.url)}</a>
            ${renderEntryMeta(entry)}
          </div>
          <button class="copy-button" data-open="${encodeURIComponent(safeUrl)}" data-track-url="${encodeURIComponent(entry.url)}">öffnen</button>
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
    const title = currentView === 'exercise' && String(entry.abbreviation ?? '').trim() !== ''
      ? `<div class="prompt-title"><strong>${formatRichText(entry.abbreviation)}</strong></div>`
      : '';
    const card = document.createElement('article');
    card.className = 'prompt-card';
    card.innerHTML = `
      <div class="prompt-row">
        <div class="prompt-content">
          ${title}
          <div class="prompt-text">${formatRichText(entry.prompt, { highlight: true, linkify: true })}</div>
          ${renderEntryMeta(entry)}
        </div>
        <button class="copy-button" data-copy="${encodeURIComponent(entry.prompt)}" data-id="${entry.id}" data-type="${currentView}">kopieren</button>
      </div>
    `;
    promptList.appendChild(card);
  });
}

promptList.addEventListener('click', async (event) => {
  const openButton = event.target.closest('button[data-open]');
  if (openButton) {
    const url = decodeURIComponent(openButton.dataset.open);
    const trackUrl = decodeURIComponent(openButton.dataset.trackUrl || openButton.dataset.open);
    window.open(url, '_blank', 'noopener,noreferrer');

    try {
      const count = await trackLinkAction(trackUrl);
      updateCardActionCount(openButton, count);
    } catch (error) {
      // noop
    }

    showToast('Link geöffnet.');
    return;
  }

  const button = event.target.closest('button[data-copy]');
  if (!button) return;
  const value = decodeURIComponent(button.dataset.copy);
  await navigator.clipboard.writeText(value);

  try {
    const count = await trackPromptAction(Number(button.dataset.id || 0), button.dataset.type || 'prompt');
    updateCardActionCount(button, count);
  } catch (error) {
    // noop
  }

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
  const nextView = normalizeView(button?.dataset.view);

  if (!button || nextView === currentView) {
    return;
  }

  currentView = nextView;
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

currentView = normalizeView(new URLSearchParams(window.location.search).get('view'));
updateSwitchButtons();
updateSortOptions();
trackPageView();
loadEntries();
