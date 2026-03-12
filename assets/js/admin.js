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
const toast = document.getElementById('toast');

const formFields = {
  id: document.getElementById('promptId'),
  nr: document.getElementById('nrInput'),
  abbreviation: document.getElementById('abbrInput'),
  prompt: document.getElementById('promptInput'),
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
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
  const header = ['nr', 'abbreviation', 'prompt'];
  const lines = [header.join(',')];

  rows.forEach((row) => {
    lines.push([
      escapeCsvValue(row.nr),
      escapeCsvValue(row.abbreviation),
      escapeCsvValue(row.prompt),
    ].join(','));
  });

  return `${lines.join('\n')}\n`;
}

function downloadCsv(content) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `prompts-export-${date}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function checkSession() {
  const res = await fetch('../api/admin_session.php');
  const data = await res.json();
  if (data.isAdmin) {
    loginCard.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    await loadPrompts();
  }
}

async function loadPrompts() {
  const res = await fetch('../api/admin_prompts.php');
  if (res.status === 401) return;

  const payload = await res.json();
  adminTableBody.innerHTML = '';

  payload.data.forEach((entry) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.nr}</td>
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

  showToast('Prompt gespeichert.');
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
    return;
  }

  const res = await fetch('../api/admin_prompts.php', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entry.id }),
  });

  if (res.ok) {
    showToast('Prompt gelöscht.');
    await loadPrompts();
  }
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
    const res = await fetch('../api/admin_prompts.php');
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

checkSession();
