const loginCard = document.getElementById('loginCard');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const adminEntryForm = document.getElementById('adminEntryForm');
const adminTableBody = document.getElementById('adminTableBody');
const adminLinkTableBody = document.getElementById('adminLinkTableBody');
const promptTable = document.getElementById('promptTable');
const linkTable = document.getElementById('linkTable');
const resetButton = document.getElementById('resetButton');
const logoutButton = document.getElementById('logoutButton');
const csvDetails = document.getElementById('csvDetails');
const csvUploadForm = document.getElementById('csvUploadForm');
const csvFileInput = document.getElementById('csvFileInput');
const csvExportButton = document.getElementById('csvExportButton');
const viewSwitch = document.getElementById('viewSwitch');
const editorTitle = document.getElementById('editorTitle');
const editorDetails = document.getElementById('editorDetails');
const nrLabel = document.getElementById('nrLabel')
  || document.querySelector('#adminEntryForm label[data-form-group="text"] > span');
const contentLabel = document.getElementById('contentLabel');
const tableContentHeading = document.getElementById('tableContentHeading');
const csvTitle = document.getElementById('csvTitle');
const csvDescription = document.getElementById('csvDescription');
const csvHint = document.getElementById('csvHint');
const toast = document.getElementById('toast');
const adminTitleFilterSection = document.getElementById('adminTitleFilterSection');
const adminTitleFilterButtons = document.getElementById('adminTitleFilterButtons');
const adminCategoryFilterSection = document.getElementById('adminCategoryFilterSection');
const adminCategoryFilterButtons = document.getElementById('adminCategoryFilterButtons');
const adminSortSelect = document.getElementById('adminSortSelect');
const adminSearchInput = document.getElementById('adminSearchInput');
const adminDirButton = document.getElementById('adminDirButton');
const formattingHint = document.getElementById('formattingHint');
const pageViewForm = document.getElementById('pageViewForm');
const pageViewInput = document.getElementById('pageViewInput');
const pageViewResetButton = document.getElementById('pageViewResetButton');
const totalUsageCount = document.getElementById('totalUsageCount');

const formGroups = document.querySelectorAll('[data-form-group]');

const formFields = {
  id: document.getElementById('promptId'),
  nr: document.getElementById('nrInput'),
  abbreviation: document.getElementById('abbrInput'),
  project: document.getElementById('projectInput'),
  prompt: document.getElementById('promptInput'),
};

const linkFields = {
  originalUrl: document.getElementById('linkOriginalUrl'),
  description: document.getElementById('linkDescriptionInput'),
  url: document.getElementById('linkUrlInput'),
  category: document.getElementById('linkCategoryInput'),
};

let currentView = 'prompt';
let selectedTitle = '';
let selectedCategory = '';
let sortDir = 'asc';

function expandEditorPanel(scroll = false) {
  if (!editorDetails) return;
  editorDetails.open = true;
  if (scroll) {
    editorDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function getViewMeta() {
  if (currentView === 'exercise') {
    return { singular: 'Übung', plural: 'Übungen', filePrefix: 'uebungen' };
  }

  if (currentView === 'link') {
    return { singular: 'Link', plural: 'Links', filePrefix: 'links' };
  }

  return { singular: 'Prompt', plural: 'Prompts', filePrefix: 'prompts' };
}

function getSortOptions() {
  if (currentView === 'link') {
    return [
      { value: 'category', label: 'Kategorie' },
      { value: 'description', label: 'Beschreibung' },
      { value: 'action_count', label: 'Nutzungen' },
      { value: 'created_at', label: 'Erstellt am' },
      { value: 'updated_at', label: 'Geändert am' },
    ];
  }

  return [
    { value: 'abbreviation', label: 'Titel' },
    { value: 'prompt', label: 'Inhalt' },
    { value: 'project', label: 'Thema' },
    { value: 'action_count', label: 'Nutzungen' },
    { value: 'created_at', label: 'Erstellt am' },
    { value: 'updated_at', label: 'Geändert am' },
  ];
}

function updateSortControls() {
  const options = getSortOptions();
  const previousValue = adminSortSelect?.value || '';
  adminSortSelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join('');

  const allowed = options.map((option) => option.value);
  adminSortSelect.value = allowed.includes(previousValue) ? previousValue : options[0].value;
  adminDirButton.textContent = sortDir === 'asc' ? 'Aufsteigend' : 'Absteigend';
}

function setFieldState(field, required) {
  if (!field) return;
  field.required = required;
  field.disabled = !required;
}

function updateViewTexts() {
  const meta = getViewMeta();
  const isLinkView = currentView === 'link';

  editorTitle.textContent = `${meta.singular} speichern`;
  if (nrLabel) {
    nrLabel.textContent = 'Kürzel (intern)';
  }
  contentLabel.textContent = isLinkView ? 'Link' : 'Inhalt';
  tableContentHeading.textContent = isLinkView ? 'Link' : 'Inhalt';

  if (formattingHint) {
    formattingHint.textContent = isLinkView
      ? 'Formatierung in Beschreibung mit [B]...[/B], [I]...[/I] und [U]...[/U] möglich.'
      : 'Formatierung in Inhalt und Titel mit [B]...[/B], [I]...[/I] und [U]...[/U] möglich.';
  }

  formGroups.forEach((group) => {
    const shouldShow = group.dataset.formGroup === (isLinkView ? 'link' : 'text');
    group.classList.toggle('hidden', !shouldShow);
  });

  setFieldState(formFields.nr, !isLinkView);
  setFieldState(formFields.abbreviation, !isLinkView);
  setFieldState(formFields.project, !isLinkView);
  setFieldState(formFields.prompt, !isLinkView);
  setFieldState(linkFields.description, isLinkView);
  setFieldState(linkFields.url, isLinkView);
  setFieldState(linkFields.category, isLinkView);

  promptTable?.classList.toggle('hidden', isLinkView);
  linkTable?.classList.toggle('hidden', !isLinkView);
  csvDetails?.classList.toggle('hidden', isLinkView);

  adminTitleFilterSection?.classList.toggle('hidden', isLinkView);
  adminCategoryFilterSection?.classList.toggle('hidden', !isLinkView);

  if (!isLinkView) {
    if (csvTitle) csvTitle.textContent = `CSV-Upload (${meta.plural})`;
    if (csvDescription) {
      csvDescription.innerHTML = 'CSV-Datei mit den Spalten <strong>nr</strong> (Kürzel intern), <strong>abbreviation</strong> (Titel), <strong>project</strong> (Thema) und <strong>prompt</strong> hochladen.';
    }
    if (csvHint) csvHint.textContent = 'Der Import ersetzt bestehende Einträge mit gleichem Kürzel und Titel.';
  }

  const buttons = viewSwitch?.querySelectorAll('button[data-view]') || [];
  buttons.forEach((button) => {
    const isActive = button.dataset.view === currentView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  updateSortControls();
}

function resetTextForm() {
  formFields.id.value = '';
  formFields.nr.value = '';
  formFields.abbreviation.value = '';
  formFields.project.value = '';
  formFields.prompt.value = '';
}

function resetLinkForm() {
  linkFields.originalUrl.value = '';
  linkFields.description.value = '';
  linkFields.url.value = '';
  linkFields.category.value = '';
}

function resetActiveForm() {
  if (currentView === 'link') {
    resetLinkForm();
    return;
  }

  resetTextForm();
}

function resetAllForms() {
  resetTextForm();
  resetLinkForm();
}

function escapeCsvValue(value) {
  const normalized = String(value ?? '').replace(/"/g, '""');
  return `"${normalized}"`;
}

function getAdminActionIcon(action) {
  if (action === 'edit') {
    return `
      <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
      </svg>
    `;
  }

  return `
    <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 7h16"></path>
      <path d="M9 7V5h6v2"></path>
      <path d="M7 7l1 12h8l1-12"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
    </svg>
  `;
}

function toCsv(rows) {
  const header = ['nr', 'abbreviation', 'project', 'prompt'];
  const lines = [header.join(',')];

  rows.forEach((row) => {
    const values = [
      escapeCsvValue(row.nr),
      escapeCsvValue(row.abbreviation),
      escapeCsvValue(row.project),
      escapeCsvValue(row.prompt),
    ];

    lines.push(values.join(','));
  });

  return `${lines.join('\n')}\n`;
}

function downloadCsv(content) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const meta = getViewMeta();
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${meta.filePrefix}-export-${date}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function looksLikeInternalTag(value) {
  if (!value || value.includes(' ')) return false;
  return /^[a-z][a-z0-9_-]{1,}$/i.test(value);
}

function humanizeLabel(label) {
  const normalized = String(label ?? '').trim().replace(/[_-]+/g, ' ');
  if (!normalized) return 'Allgemein';

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function detectTheme(project, title, promptText, internalTag = '') {
  const cleanProject = String(project ?? '').trim();
  if (cleanProject && cleanProject.toLowerCase() !== 'alle') {
    return humanizeLabel(cleanProject);
  }

  const text = `${internalTag} ${title} ${promptText}`.toLowerCase();
  if (/(dsgvo|datenschutz|verarbeitungstätigkeit|personenbezug|vvt)/.test(text)) return 'Datenschutz';
  if (/(excel|xls|spreadsheet|arbeitsmappe)/.test(text)) return 'Excel';
  if (/(url|website|wordpress|webseite|domain|link)/.test(text)) return 'Web';
  if (/(m365|outlook|teams|copilot|sharepoint|onedrive)/.test(text)) return 'Microsoft 365';
  if (/(telefon|mail|e-mail|kommunikation|meeting|protokoll|agenda|portrait)/.test(text)) return 'Kommunikation';
  return 'Allgemein';
}

function detectGoal(title, promptText) {
  const text = `${title} ${promptText}`.toLowerCase();

  if (/(übersetz|translate|englisch)/.test(text)) return 'Übersetzen';
  if (/(korr|korrektur|fehlerfrei|rewrite|überarbeiten)/.test(text)) return 'Korrigieren';
  if (/(prüf|check|validier|audit)/.test(text)) return 'Prüfen';
  if (/(analys|kritik|review|bewert|klassifizier)/.test(text)) return 'Analysieren';
  if (/(eli5|einfach erklärt|erklär|explain)/.test(text)) return 'Erklären';
  if (/(zusammenfass|minuten|protokoll|verdicht|kurzfassung)/.test(text)) return 'Verdichten';
  return 'Erstellen';
}

function normalizePromptEntry(entry) {
  const first = String(entry.nr ?? '').trim();
  const second = String(entry.abbreviation ?? '').trim();
  const firstIsTag = looksLikeInternalTag(first);
  const secondIsTag = looksLikeInternalTag(second);

  let internalTag = '';
  let title = '';
  if (firstIsTag && !secondIsTag) {
    internalTag = first;
    title = second;
  } else if (!firstIsTag && secondIsTag) {
    internalTag = second;
    title = first;
  } else {
    internalTag = first;
    title = second || first;
  }

  return {
    ...entry,
    internalTag,
    title: title || 'Ohne Titel',
    theme: detectTheme(entry.project ?? '', title, entry.prompt ?? '', internalTag),
    goal: detectGoal(title, entry.prompt ?? ''),
  };
}

function sortByPreferredOrder(values, preferredOrder) {
  const orderMap = new Map(preferredOrder.map((value, index) => [value, index]));
  return values.sort((a, b) => {
    const aOrder = orderMap.has(a) ? orderMap.get(a) : Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.has(b) ? orderMap.get(b) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b, 'de', { sensitivity: 'base' });
  });
}

function renderTitleFilterButtons(entries) {
  if (!adminTitleFilterSection || !adminTitleFilterButtons || currentView === 'link') return;

  const titleValues = [...new Set(
    entries
      .map((entry) => String(entry.theme ?? '').trim())
      .filter((value) => value !== ''),
  )].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

  if (selectedTitle && !titleValues.includes(selectedTitle)) {
    selectedTitle = '';
  }

  adminTitleFilterButtons.innerHTML = '';
  if (!titleValues.length) {
    adminTitleFilterSection.classList.add('hidden');
    return;
  }

  adminTitleFilterSection.classList.remove('hidden');

  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = `secondary ${selectedTitle === '' ? 'is-active' : ''}`.trim();
  allButton.textContent = 'Alle';
  allButton.dataset.title = '';
  adminTitleFilterButtons.appendChild(allButton);

  titleValues.forEach((title) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `secondary ${selectedTitle === title ? 'is-active' : ''}`.trim();
    button.textContent = title;
    button.dataset.title = title;
    adminTitleFilterButtons.appendChild(button);
  });
}

function renderCategoryFilterButtons(entries) {
  if (!adminCategoryFilterSection || !adminCategoryFilterButtons || currentView !== 'link') return;

  const categories = [...new Set(entries
    .map((entry) => String(entry.category ?? '').trim())
    .filter((value) => value !== ''))]
    .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

  if (selectedCategory && !categories.includes(selectedCategory)) {
    selectedCategory = '';
  }

  adminCategoryFilterButtons.innerHTML = '';

  if (!categories.length) {
    adminCategoryFilterSection.classList.add('hidden');
    return;
  }

  adminCategoryFilterSection.classList.remove('hidden');

  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = `secondary ${selectedCategory === '' ? 'is-active' : ''}`.trim();
  allButton.textContent = 'Alle Kategorien';
  allButton.dataset.category = '';
  adminCategoryFilterButtons.appendChild(allButton);

  categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `secondary ${selectedCategory === category ? 'is-active' : ''}`.trim();
    button.textContent = category;
    button.dataset.category = category;
    adminCategoryFilterButtons.appendChild(button);
  });
}

function renderTable(entries) {
  adminTableBody.innerHTML = '';

  entries.forEach((entry) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="admin-actions-cell">
        <button class="icon-button edit-button" data-action="edit" data-id="${entry.id}" title="Bearbeiten" aria-label="Bearbeiten">${getAdminActionIcon('edit')}</button>
        <button class="icon-button delete-button" data-action="delete" data-id="${entry.id}" title="Löschen" aria-label="Löschen">${getAdminActionIcon('delete')}</button>
      </td>
      <td>${escapeHtml(entry.title)}</td>
      <td>${escapeHtml(entry.internalTag)}</td>
      <td>${escapeHtml(entry.theme)}</td>
      <td>${escapeHtml(entry.prompt)}</td>
      <td>${escapeHtml(entry.action_count ?? 0)}</td>
      <td>${formatDateTime(entry.created_at)}</td>
      <td>${formatDateTime(entry.updated_at)}</td>
    `;
    tr.dataset.entry = JSON.stringify(entry);
    adminTableBody.appendChild(tr);
  });
}

function renderLinkTable(entries) {
  adminLinkTableBody.innerHTML = '';

  entries.forEach((entry) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="admin-actions-cell">
        <button class="icon-button edit-button" data-action="edit" data-url="${encodeURIComponent(entry.url)}" title="Bearbeiten" aria-label="Bearbeiten">${getAdminActionIcon('edit')}</button>
        <button class="icon-button delete-button" data-action="delete" data-url="${encodeURIComponent(entry.url)}" title="Löschen" aria-label="Löschen">${getAdminActionIcon('delete')}</button>
      </td>
      <td>${escapeHtml(entry.description)}</td>
      <td><a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.url)}</a></td>
      <td>${escapeHtml(entry.category)}</td>
      <td>${escapeHtml(entry.action_count ?? 0)}</td>
      <td>${formatDateTime(entry.created_at)}</td>
      <td>${formatDateTime(entry.updated_at)}</td>
    `;
    tr.dataset.entry = JSON.stringify(entry);
    adminLinkTableBody.appendChild(tr);
  });
}

function updateStatsDisplay(payload) {
  pageViewInput.value = String(payload?.data?.page_views ?? 0);
  if (totalUsageCount) {
    totalUsageCount.textContent = String(payload?.data?.total_usage_count ?? 0);
  }
}

async function loadPageViewCounter() {
  const res = await fetch('../api/admin_stats.php');
  if (res.status === 401) return;

  const payload = await res.json();
  updateStatsDisplay(payload);
}

async function checkSession() {
  const res = await fetch('../api/admin_session.php');
  const data = await res.json();
  if (data.isAdmin) {
    loginCard.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    updateViewTexts();
    await loadPageViewCounter();
    await loadEntries();
  }
}

async function loadEntries() {
  const searchTerm = (adminSearchInput?.value || '').trim().toLowerCase();

  if (currentView === 'link') {
    const params = new URLSearchParams({
      sort: adminSortSelect.value,
      dir: sortDir,
    });
    const res = await fetch(`../api/admin_links.php?${params.toString()}`);
    if (res.status === 401) return;

    const payload = await res.json();
    const entries = Array.isArray(payload.data) ? payload.data : [];
    renderCategoryFilterButtons(entries);
    const filteredEntries = entries.filter((entry) => {
      if (selectedCategory && String(entry.category ?? '').trim() !== selectedCategory) return false;
      if (!searchTerm) return true;

      const haystack = [
        entry.description,
        entry.url,
        entry.category,
      ].join(' ').toLowerCase();

      return haystack.includes(searchTerm);
    });
    renderLinkTable(filteredEntries);
    return;
  }

  const params = new URLSearchParams({
    type: currentView,
    sort: adminSortSelect.value,
    dir: sortDir,
  });
  const res = await fetch(`../api/admin_prompts.php?${params.toString()}`);
  if (res.status === 401) return;

  const payload = await res.json();
  const entries = (Array.isArray(payload.data) ? payload.data : []).map(normalizePromptEntry);

  renderTitleFilterButtons(entries);
  const filteredEntries = entries.filter((entry) => {
    if (selectedTitle && entry.theme !== selectedTitle) return false;
    if (!searchTerm) return true;

    const haystack = [
      entry.prompt,
      entry.title,
      entry.internalTag,
      entry.project,
      entry.theme,
      entry.goal,
    ].join(' ').toLowerCase();

    return haystack.includes(searchTerm);

  });

  renderTable(filteredEntries);
}

adminSearchInput?.addEventListener('input', async () => {
  await loadEntries();
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('passwordInput').value;

  const res = await fetch('../api/admin_login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    showToast('Anmeldung fehlgeschlagen.');
    return;
  }

  loginCard.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  updateViewTexts();
  await loadPageViewCounter();
  showToast('Erfolgreich angemeldet.');
  await loadEntries();
});

pageViewForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = { page_views: Math.max(0, Number(pageViewInput.value || 0)) };

  const res = await fetch('../api/admin_stats.php', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    showToast('Seitenaufrufzähler konnte nicht gespeichert werden.');
    return;
  }

  const responsePayload = await res.json();
  updateStatsDisplay(responsePayload);
  showToast('Seitenaufrufzähler gespeichert.');
});

pageViewResetButton?.addEventListener('click', async () => {
  pageViewInput.value = '0';
  if (pageViewForm) {
    pageViewForm.requestSubmit();
  }
});

adminEntryForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (currentView === 'link') {
    const payload = {
      old_url: linkFields.originalUrl.value.trim(),
      description: linkFields.description.value.trim(),
      url: linkFields.url.value.trim(),
      category: linkFields.category.value.trim().slice(0, 80),
    };

    const method = payload.old_url ? 'PUT' : 'POST';
    const res = await fetch('../api/admin_links.php', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      showToast('Speichern fehlgeschlagen.');
      return;
    }

    showToast('Link gespeichert.');
    resetLinkForm();
    await loadEntries();
    return;
  }

  const payload = {
    id: Number(formFields.id.value || 0),
    nr: formFields.nr.value.trim().slice(0, 15),
    abbreviation: formFields.abbreviation.value.trim(),
    prompt: formFields.prompt.value.trim(),
    project: formFields.project.value.trim().slice(0, 80),
    module_id: parseInt(moduleSelectInput?.value) || null,
    type: currentView,
  };

  const method = payload.id ? 'PUT' : 'POST';
  const res = await fetch('../api/admin_prompts.php', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    showToast('Speichern fehlgeschlagen.');
    return;
  }

  showToast(`${getViewMeta().singular} gespeichert.`);
  resetTextForm();
  await loadEntries();
});

adminTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const row = button.closest('tr');
  const entry = JSON.parse(row.dataset.entry);

  if (button.dataset.action === 'edit') {
    formFields.id.value = entry.id;
    formFields.nr.value = entry.nr;
    formFields.abbreviation.value = entry.abbreviation;
    formFields.project.value = entry.project ?? '';
    formFields.prompt.value = entry.prompt;
    if (moduleSelectInput) {
      moduleSelectInput.value = entry.module_id || '';
    }
    expandEditorPanel(true);
    return;
  }

  const res = await fetch('../api/admin_prompts.php', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entry.id, type: currentView }),
  });

  if (res.ok) {
    showToast(`${getViewMeta().singular} gelöscht.`);
    await loadEntries();
  }
});

adminLinkTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const row = button.closest('tr');
  const entry = JSON.parse(row.dataset.entry);

  if (button.dataset.action === 'edit') {
    linkFields.originalUrl.value = entry.url;
    linkFields.description.value = entry.description;
    linkFields.url.value = entry.url;
    linkFields.category.value = entry.category;
    expandEditorPanel(true);
    return;
  }

  const res = await fetch('../api/admin_links.php', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: entry.url }),
  });

  if (res.ok) {
    showToast('Link gelöscht.');
    await loadEntries();
  }
});

adminTitleFilterButtons?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-title]');
  if (!button) return;
  selectedTitle = button.dataset.title || '';
  await loadEntries();
});

adminCategoryFilterButtons?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-category]');
  if (!button) return;
  selectedCategory = button.dataset.category || '';
  await loadEntries();
});

adminSortSelect?.addEventListener('change', loadEntries);
adminDirButton?.addEventListener('click', async () => {
  sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  updateSortControls();
  await loadEntries();
});

viewSwitch?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-view]');
  if (!button || button.dataset.view === currentView) {
    return;
  }

  currentView = button.dataset.view;
  selectedTitle = '';
  selectedCategory = '';

  const moduleSection = document.getElementById('moduleSection');
  const csvDetails = document.getElementById('csvDetails');
  const adminTitleFilterSection = document.getElementById('adminTitleFilterSection');
  const adminCategoryFilterSection = document.getElementById('adminCategoryFilterSection');
  const adminTableControls = document.querySelector('.card:has(#adminSortSelect)');
  const adminTablesCard = document.querySelector('.card:has(#promptTable)');

  const isModuleView = currentView === 'module';
  if (moduleSection) moduleSection.classList.toggle('hidden', !isModuleView);
  if (editorTitle) {
    editorTitle.textContent = isModuleView ? 'Module verwalten' : `${getViewMeta().singular} speichern`;
  }
  if (adminEntryForm) adminEntryForm.classList.toggle('hidden', isModuleView);
  if (csvDetails) csvDetails.classList.toggle('hidden', isModuleView);
  if (adminTableControls) adminTableControls.classList.toggle('hidden', isModuleView);
  if (adminTablesCard) adminTablesCard.classList.toggle('hidden', isModuleView);
  if (adminTitleFilterSection) adminTitleFilterSection.classList.toggle('hidden', isModuleView || currentView === 'link');
  if (adminCategoryFilterSection) adminCategoryFilterSection.classList.toggle('hidden', isModuleView || currentView !== 'link');

  const buttons = viewSwitch?.querySelectorAll('button[data-view]') || [];
  buttons.forEach((viewButton) => {
    const isActive = viewButton.dataset.view === currentView;
    viewButton.classList.toggle('is-active', isActive);
    viewButton.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  if (isModuleView) {
    renderModuleTable();
  } else {
    updateViewTexts();
    resetAllForms();
    await loadEntries();
  }
});

resetButton.addEventListener('click', resetActiveForm);
logoutButton.addEventListener('click', async () => {
  await fetch('../api/admin_logout.php', { method: 'POST' });
  location.reload();
});

if (csvUploadForm) {
  csvUploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!csvFileInput.files || !csvFileInput.files.length) {
      showToast('Bitte eine CSV-Datei auswählen.');
      return;
    }

    const selectedFile = csvFileInput.files[0];
    if (!selectedFile || selectedFile.size <= 0) {
      showToast('Die ausgewählte CSV-Datei ist leer.');
      return;
    }

    const formData = new FormData();
    formData.append('csv', selectedFile);
    formData.append('type', currentView);

    const res = await fetch('../api/admin_csv_upload.php', {
      method: 'POST',
      body: formData,
    });

    const payload = await res.json().catch(() => ({ ok: false, message: 'Import fehlgeschlagen.' }));

    if (!res.ok || !payload.ok) {
      showToast(payload.message || 'Import fehlgeschlagen.');
      return;
    }

    csvUploadForm.reset();
    showToast(payload.message || 'CSV importiert.');
    await loadEntries();
  });
}

if (csvExportButton) {
  csvExportButton.addEventListener('click', async () => {
    if (currentView === 'link') {
      showToast('CSV-Export ist nur für Prompts und Übungen verfügbar.');
      return;
    }

    const params = new URLSearchParams({
      type: currentView,
      sort: adminSortSelect.value,
      dir: sortDir,
    });
    const res = await fetch(`../api/admin_prompts.php?${params.toString()}`);
    if (!res.ok) {
      showToast('CSV-Export fehlgeschlagen.');
      return;
    }

    const payload = await res.json();
    const entries = Array.isArray(payload.data) ? payload.data : [];
    downloadCsv(toCsv(entries));
    showToast('CSV exportiert.');
  });
}

// Modul Management
const moduleForm = document.getElementById('moduleForm');
const moduleName = document.getElementById('moduleName');
const moduleSlug = document.getElementById('moduleSlug');
const moduleOrder = document.getElementById('moduleOrder');
const moduleTableBody = document.getElementById('moduleTableBody');
const moduleSelectInput = document.getElementById('moduleSelectInput');
let allModules = [];

async function loadModules() {
  try {
    const res = await fetch('../api/modules.php');
    const payload = await res.json();
    if (payload.ok) {
      allModules = Array.isArray(payload.data) ? payload.data : [];
      updateModuleSelectDropdown();
      if (currentView === 'module') {
        renderModuleTable();
      }
    }
  } catch (err) {
    console.error('Fehler beim Laden der Module:', err);
  }
}

function updateModuleSelectDropdown() {
  const currentValue = moduleSelectInput?.value || '';
  if (!moduleSelectInput) return;

  moduleSelectInput.innerHTML = '<option value="">-- Wählen --</option>';
  allModules.forEach(mod => {
    const option = document.createElement('option');
    option.value = mod.id;
    option.textContent = mod.name;
    moduleSelectInput.appendChild(option);
  });
  moduleSelectInput.value = currentValue;
}

function renderModuleTable() {
  if (!moduleTableBody) return;

  moduleTableBody.innerHTML = '';
  if (allModules.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'Keine Module vorhanden.';
    tr.appendChild(td);
    moduleTableBody.appendChild(tr);
    return;
  }

  allModules.forEach(mod => {
    const tr = document.createElement('tr');
    tr.dataset.entry = JSON.stringify(mod);
    const promptCount = mod.prompt_count || 0;

    const cells = [
      escapeHtml(mod.name),
      escapeHtml(mod.slug),
      mod.sort_order || '-',
      promptCount,
    ];

    cells.forEach(content => {
      const td = document.createElement('td');
      if (content === escapeHtml(mod.slug)) {
        const code = document.createElement('code');
        code.textContent = content;
        td.appendChild(code);
      } else {
        td.textContent = content;
      }
      tr.appendChild(td);
    });

    const actionsTd = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.dataset.action = 'edit-module';
    editBtn.dataset.id = mod.id;
    editBtn.textContent = 'Bearbeiten';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.dataset.action = 'delete-module';
    deleteBtn.dataset.id = mod.id;
    deleteBtn.textContent = 'Löschen';
    deleteBtn.style.color = 'var(--primary)';
    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(deleteBtn);
    tr.appendChild(actionsTd);

    moduleTableBody.appendChild(tr);
  });
}

if (moduleForm) {
  moduleForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      name: moduleName.value.trim(),
      slug: moduleSlug.value.trim(),
      sort_order: parseInt(moduleOrder.value) || 1,
    };

    const res = await fetch('../api/admin_modules.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      showToast('Modul konnte nicht erstellt werden.');
      return;
    }

    showToast('Modul erstellt.');
    moduleForm.reset();
    moduleOrder.value = (allModules.length + 1).toString();
    await loadModules();
  });
}

if (moduleTableBody) {
  moduleTableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const moduleId = button.dataset.id;
    const action = button.dataset.action;

    if (action === 'edit-module') {
      const mod = allModules.find(m => m.id == moduleId);
      if (mod) {
        moduleName.value = mod.name;
        moduleSlug.value = mod.slug;
        moduleOrder.value = mod.sort_order || 1;
        moduleForm.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (action === 'delete-module') {
      if (!confirm('Modul wirklich löschen?')) return;

      const res = await fetch('../api/admin_modules.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: moduleId }),
      });

      if (res.ok) {
        showToast('Modul gelöscht.');
        await loadModules();
      }
    }
  });
}

(async () => {
  await loadModules();
})();

checkSession();
