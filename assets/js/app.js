const promptList = document.getElementById('promptList');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const dirButton = document.getElementById('dirButton');
const toast = document.getElementById('toast');

let dir = 'asc';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function highlightPlaceholders(text) {
  return text.replace(/\[([^\]]+)\]/g, '<span class="placeholder">[$1]</span>');
}

async function loadPrompts() {
  const params = new URLSearchParams({
    q: searchInput.value,
    sort: sortSelect.value,
    dir,
  });

  const res = await fetch(`/api/prompts.php?${params.toString()}`);
  const payload = await res.json();
  promptList.innerHTML = '';

  payload.data.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'prompt-card';
    card.innerHTML = `
      <div class="prompt-meta">
        <span><strong>Nr:</strong> ${entry.nr}</span>
        <span><strong>Abkürzung:</strong> ${entry.abbreviation}</span>
      </div>
      <p class="prompt-text">${highlightPlaceholders(entry.prompt)}</p>
      <button data-prompt="${encodeURIComponent(entry.prompt)}">Prompt kopieren</button>
    `;
    promptList.appendChild(card);
  });
}

promptList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-prompt]');
  if (!button) return;
  const prompt = decodeURIComponent(button.dataset.prompt);
  await navigator.clipboard.writeText(prompt);
  showToast('Prompt kopiert.');
});

searchInput.addEventListener('input', loadPrompts);
sortSelect.addEventListener('change', loadPrompts);
dirButton.addEventListener('click', () => {
  dir = dir === 'asc' ? 'desc' : 'asc';
  dirButton.textContent = dir === 'asc' ? 'Aufsteigend' : 'Absteigend';
  loadPrompts();
});

loadPrompts();
