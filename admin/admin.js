const loginCard = document.getElementById('loginCard');
const adminPanel = document.getElementById('adminPanel');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const passwordInput = document.getElementById('password');
const logoutBtn = document.getElementById('logoutBtn');
const rows = document.getElementById('adminRows');
const saveBtn = document.getElementById('saveBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const nrInput = document.getElementById('nr');
const abkInput = document.getElementById('abk');
const promptInput = document.getElementById('promptText');
const heroTitleInput = document.getElementById('heroTitleInput');
const heroBadgeInput = document.getElementById('heroBadgeInput');
const heroSubtitleInput = document.getElementById('heroSubtitleInput');
const highlightsInput = document.getElementById('highlightsInput');
const saveSiteBtn = document.getElementById('saveSiteBtn');
const importFileInput = document.getElementById('importFile');
const importBtn = document.getElementById('importBtn');
const statusEl = document.getElementById('adminStatus');

let editingId = null;
let prompts = [];

function setStatus(text) {
  statusEl.textContent = text || '';
}

function setAuthenticated(isAuth) {
  loginCard.classList.toggle('hidden', isAuth);
  adminPanel.classList.toggle('hidden', !isAuth);
}

async function checkStatus() {
  const res = await fetch(apiUrl('/api/admin/status'));
  const data = await res.json();
  setAuthenticated(data.authenticated);
  if (data.authenticated) {
    await Promise.all([loadAdminPrompts(), loadSiteContentAdmin()]);
  }
}

loginBtn.addEventListener('click', async () => {
  const res = await fetch(apiUrl('/api/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: passwordInput.value })
  });
  if (!res.ok) {
    loginError.textContent = 'Anmeldung fehlgeschlagen. Bitte Passwort prüfen.';
    return;
  }
  loginError.textContent = '';
  passwordInput.value = '';
  setAuthenticated(true);
  await Promise.all([loadAdminPrompts(), loadSiteContentAdmin()]);
});

logoutBtn.addEventListener('click', async () => {
  await fetch(apiUrl('/api/admin/logout'), { method: 'POST' });
  setAuthenticated(false);
  setStatus('Abgemeldet.');
});

importBtn.addEventListener('click', async () => {
  const file = importFileInput.files?.[0];
  if (!file) {
    alert('Bitte zuerst eine CSV- oder PHP-Datei auswählen.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(apiUrl('/api/admin/import'), {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Import fehlgeschlagen.');
    return;
  }

  importFileInput.value = '';
  setStatus(`${data.imported} Einträge importiert.`);
  await loadAdminPrompts();
});

saveSiteBtn.addEventListener('click', async () => {
  let highlights = [];
  try {
    highlights = JSON.parse(highlightsInput.value || '[]');
    if (!Array.isArray(highlights)) throw new Error('invalid');
  } catch {
    alert('Highlights müssen gültiges JSON-Array sein.');
    return;
  }

  const payload = {
    hero_title: heroTitleInput.value,
    hero_badge: heroBadgeInput.value,
    hero_subtitle: heroSubtitleInput.value,
    highlights,
  };

  const res = await fetch(apiUrl('/api/admin/site-content'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert('Seitentexte konnten nicht gespeichert werden.');
    return;
  }

  setStatus('Seitentexte gespeichert.');
});

async function loadSiteContentAdmin() {
  const res = await fetch(apiUrl('/api/admin/site-content'));
  if (!res.ok) return;
  const data = await res.json();

  heroTitleInput.value = data.hero_title || '';
  heroBadgeInput.value = data.hero_badge || '';
  heroSubtitleInput.value = data.hero_subtitle || '';
  highlightsInput.value = JSON.stringify(data.highlights || [], null, 2);
}

function clearForm() {
  editingId = null;
  nrInput.value = '';
  abkInput.value = '';
  promptInput.value = '';
  cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', clearForm);

saveBtn.addEventListener('click', async () => {
  const payload = {
    nr: Number(nrInput.value),
    abkuerzung: abkInput.value,
    prompt: promptInput.value,
  };

  if (!payload.nr || !payload.abkuerzung.trim() || !payload.prompt.trim()) {
    alert('Bitte Nr, Abkürzung und Prompt ausfüllen.');
    return;
  }

  const endpoint = editingId ? apiUrl(`/api/admin/prompts/${editingId}`) : apiUrl('/api/admin/prompts');
  const method = editingId ? 'PUT' : 'POST';

  const res = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert('Speichern fehlgeschlagen.');
    return;
  }

  clearForm();
  await loadAdminPrompts();
  setStatus('Prompt gespeichert und Liste aktualisiert.');
});

function renderAdminRows() {
  rows.innerHTML = prompts.map((p) => `
    <tr>
      <td>${p.nr}</td>
      <td>${escapeHtml(p.abkuerzung)}</td>
      <td class="prompt">${renderPrompt(p.prompt)}</td>
      <td>
        <div class="actions">
          <button class="ghost" data-edit="${p.id}">Bearbeiten</button>
          <button class="danger" data-delete="${p.id}">Löschen</button>
        </div>
      </td>
    </tr>
  `).join('');

  rows.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = prompts.find((x) => x.id === Number(btn.dataset.edit));
      if (!item) return;
      editingId = item.id;
      nrInput.value = item.nr;
      abkInput.value = item.abkuerzung;
      promptInput.value = item.prompt;
      cancelEditBtn.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  rows.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Eintrag wirklich löschen?')) return;
      const res = await fetch(apiUrl(`/api/admin/prompts/${btn.dataset.delete}`), { method: 'DELETE' });
      if (res.ok) {
        await loadAdminPrompts();
        setStatus('Prompt gelöscht.');
      }
    });
  });
}

async function loadAdminPrompts() {
  const res = await fetch(apiUrl('/api/admin/prompts'));
  if (!res.ok) {
    if (res.status === 401) {
      setAuthenticated(false);
      setStatus('Bitte zuerst anmelden.');
      return;
    }
    throw new Error('Prompts konnten nicht geladen werden.');
  }
  prompts = await res.json();
  renderAdminRows();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await checkStatus();
  } catch (err) {
    setStatus(err.message || 'Fehler beim Laden des Admin-Bereichs.');
  }
});
