const loginCard = document.getElementById('loginCard');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const promptForm = document.getElementById('promptForm');
const adminTableBody = document.getElementById('adminTableBody');
const resetButton = document.getElementById('resetButton');
const logoutButton = document.getElementById('logoutButton');
const csvUploadForm = document.getElementById('csvUploadForm');
const csvFileInput = document.getElementById('csvFileInput');
const csvExportButton = document.getElementById('csvExportButton');
const viewSwitch = document.getElementById('viewSwitch');
const editorTitle = document.getElementById('editorTitle');
const contentLabel = document.getElementById('contentLabel');
const tableContentHeading = document.getElementById('tableContentHeading');
const tableProjectHeading = document.getElementById('tableProjectHeading');
const projectField = document.getElementById('projectField');
const csvTitle = document.getElementById('csvTitle');
const csvDescription = document.getElementById('csvDescription');
const csvHint = document.getElementById('csvHint');
const toast = document.getElementById('toast');
const adminNrFilterSection = document.getElementById('adminNrFilterSection');
const adminNrFilterButtons = document.getElementById('adminNrFilterButtons');

const formFields = {
  id: document.getElementById('promptId'),
  nr: document.getElementById('nrInput'),
  abbreviation: document.getElementById('abbrInput'),
  prompt: document.getElementById('promptInput'),
  project: document.getElementById('projectInput'),
};

let currentView = 'prompt';
let selectedNr = '';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function getViewMeta() {
  return currentView === 'exercise'
    ? {
      singular: 'Übung',
      plural: 'Übungen',
      filePrefix: 'uebungen',
    }
    : {
      singular: 'Prompt',
      plural: 'Prompts',
      filePrefix: 'prompts',
    };
}

function updateViewTexts() {
  const meta = getViewMeta();
  const isExerciseView = currentView === 'exercise';
  editorTitle.textContent = `${meta.singular} speichern`;
  contentLabel.textContent = meta.singular;
  tableContentHeading.textContent = meta.singular;
  csvTitle.textContent = `CSV-Upload (${meta.plural})`;
  if (csvDescription) {
    csvDescription.innerHTML = isExerciseView
      ? 'CSV-Datei mit den Spalten <strong>nr</strong>, <strong>abbreviation</strong>, <strong>prompt</strong> und optional <strong>project</strong> hochladen.'
      : 'CSV-Datei mit den Spalten <strong>nr</strong>, <strong>abbreviation</strong> und <strong>prompt</strong> hochladen.';
  }
  csvHint.textContent = isExerciseView
    ? 'Optional kann die Spalte project angegeben werden. Der Import ersetzt Einträge mit gleicher Kombination aus Projekt, Nr und Abkürzung.'
    : 'Der Import ersetzt bestehende Einträge mit gleicher Nr oder Abkürzung.';

  projectField?.classList.toggle('hidden', !isExerciseView);
  tableProjectHeading?.classList.toggle('hidden', !isExerciseView);

  const buttons = viewSwitch?.querySelectorAll('button[data-view]') || [];
  buttons.forEach((button) => {
    const isActive = button.dataset.view === currentView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function resetForm() {
  formFields.id.value = '';
  promptForm.reset();
}

function escapeCsvValue(value) {
  const normalized = String(value ?? '').replace(/"/g, '""');
  return `"${normalized}"`;
}

function toCsv(rows) {
  const includeProject = currentView === 'exercise';
  const header = includeProject
    ? ['nr', 'project', 'abbreviation', 'prompt']
    : ['nr', 'abbreviation', 'prompt'];
  const lines = [header.join(',')];

  rows.forEach((row) => {
    const values = [
      escapeCsvValue(row.nr),
    ];

    if (includeProject) {
      values.push(escapeCsvValue(row.project));
    }

    values.push(
      escapeCsvValue(row.abbreviation),
      escapeCsvValue(row.prompt),
    );

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

function renderNrFilterButtons(entries) {
  if (!adminNrFilterSection || !adminNrFilterButtons) return;

  const nrValues = [...new Set(entries
    .map((entry) => String(entry.nr ?? '').trim())
    .filter((value) => value !== ''))]
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' }));

  if (selectedNr && !nrValues.includes(selectedNr)) {
    selectedNr = '';
  }

  adminNrFilterButtons.innerHTML = '';

  if (!nrValues.length) {
    adminNrFilterSection.classList.add('hidden');
    return;
  }

  adminNrFilterSection.classList.remove('hidden');

  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = `secondary ${selectedNr === '' ? 'is-active' : ''}`.trim();
  allButton.textContent = 'Alle';
  allButton.dataset.nr = '';
  adminNrFilterButtons.appendChild(allButton);

  nrValues.forEach((nr) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `secondary ${selectedNr === nr ? 'is-active' : ''}`.trim();
    button.textContent = nr;
    button.dataset.nr = nr;
    adminNrFilterButtons.appendChild(button);
  });
}

function renderTable(entries) {
  adminTableBody.innerHTML = '';
  const isExerciseView = currentView === 'exercise';

  entries.forEach((entry) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.nr}</td>
      <td class="${isExerciseView ? '' : 'hidden'}">${entry.project ?? ''}</td>
      <td>${entry.abbreviation}</td>
      <td>${entry.prompt}</td>
      <td>
        <button class="secondary" data-action="edit" data-id="${entry.id}">Bearbeiten</button>
        <button data-action="delete" data-id="${entry.id}">Löschen</button>
      </td>
    `;
    tr.dataset.entry = JSON.stringify(entry);
    adminTableBody.appendChild(tr);
  });
}

async function checkSession() {
  const res = await fetch('../api/admin_session.php');
  const data = await res.json();
  if (data.isAdmin) {
    loginCard.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    updateViewTexts();
    await loadPrompts();
  }
}

async function loadPrompts() {
  const params = new URLSearchParams({ type: currentView });
  const res = await fetch(`../api/admin_prompts.php?${params.toString()}`);
  if (res.status === 401) return;

  const payload = await res.json();
  const entries = Array.isArray(payload.data) ? payload.data : [];

  renderNrFilterButtons(entries);

  const filteredEntries = selectedNr
    ? entries.filter((entry) => String(entry.nr ?? '').trim() === selectedNr)
    : entries;

  renderTable(filteredEntries);
}

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
  showToast('Erfolgreich angemeldet.');
  await loadPrompts();
});

promptForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    id: Number(formFields.id.value || 0),
    nr: formFields.nr.value.trim().slice(0, 15),
    abbreviation: formFields.abbreviation.value.trim(),
    prompt: formFields.prompt.value.trim(),
    project: currentView === 'exercise' ? formFields.project.value.trim().slice(0, 80) : '',
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
  resetForm();
  await loadPrompts();
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
    formFields.prompt.value = entry.prompt;
    formFields.project.value = entry.project ?? '';
    return;
  }

  const res = await fetch('../api/admin_prompts.php', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entry.id, type: currentView }),
  });

  if (res.ok) {
    showToast(`${getViewMeta().singular} gelöscht.`);
    await loadPrompts();
  }
});

adminNrFilterButtons?.addEventListener('click', async (event) => {
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
  updateViewTexts();
  resetForm();
  await loadPrompts();
});

resetButton.addEventListener('click', resetForm);
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

    const formData = new FormData();
    formData.append('csv', csvFileInput.files[0]);
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

    showToast(`CSV importiert (${payload.inserted} neu, ${payload.updated} aktualisiert).`);
    csvUploadForm.reset();
    await loadPrompts();
  });
}

if (csvExportButton) {
  csvExportButton.addEventListener('click', async () => {
    const params = new URLSearchParams({ type: currentView });
    const res = await fetch(`../api/admin_prompts.php?${params.toString()}`);
    if (!res.ok) {
      showToast('Export fehlgeschlagen.');
      return;
    }

    const payload = await res.json().catch(() => ({ ok: false, data: [] }));
    if (!payload.ok || !Array.isArray(payload.data)) {
      showToast('Export fehlgeschlagen.');
      return;
    }

    const csv = toCsv(payload.data);
    downloadCsv(csv);
    showToast(`CSV exportiert (${payload.data.length} Einträge).`);
  });
}

updateViewTexts();
checkSession();
