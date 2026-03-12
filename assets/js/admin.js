const loginCard = document.getElementById('loginCard');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const promptForm = document.getElementById('promptForm');
const adminTableBody = document.getElementById('adminTableBody');
const resetButton = document.getElementById('resetButton');
const logoutButton = document.getElementById('logoutButton');
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

async function checkSession() {
  const res = await fetch('/api/admin_session.php');
  const data = await res.json();
  if (data.isAdmin) {
    loginCard.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    await loadPrompts();
  }
}

async function loadPrompts() {
  const res = await fetch('/api/admin_prompts.php');
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

  const res = await fetch('/api/admin_login.php', {
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
    nr: Number(formFields.nr.value),
    abbreviation: formFields.abbreviation.value.trim(),
    prompt: formFields.prompt.value.trim(),
  };

  const method = payload.id ? 'PUT' : 'POST';
  const res = await fetch('/api/admin_prompts.php', {
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

  const res = await fetch('/api/admin_prompts.php', {
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
  await fetch('/api/admin_logout.php', { method: 'POST' });
  location.reload();
});

checkSession();
