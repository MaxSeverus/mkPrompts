const rowsEl = document.getElementById('promptRows');
const searchEl = document.getElementById('search');
const sortEl = document.getElementById('sort');
let allPrompts = [];

async function loadPrompts() {
  const sort = sortEl.value;
  const res = await fetch(`/api/prompts?sort=${sort}`);
  allPrompts = await res.json();
  renderRows();
}

function renderRows() {
  const q = searchEl.value.trim().toLowerCase();
  const filtered = allPrompts.filter((p) =>
    `${p.nr} ${p.abkuerzung} ${p.prompt}`.toLowerCase().includes(q)
  );

  rowsEl.innerHTML = filtered.map((p) => `
    <tr>
      <td>${p.nr}</td>
      <td>${escapeHtml(p.abkuerzung)}</td>
      <td class="prompt">${renderPrompt(p.prompt)}</td>
      <td><button class="ghost" data-copy="${p.id}">Kopieren</button></td>
    </tr>
  `).join('');

  rowsEl.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = filtered.find((x) => x.id === Number(btn.dataset.copy));
      if (!item) return;
      await navigator.clipboard.writeText(item.prompt);
      btn.textContent = 'Kopiert';
      setTimeout(() => (btn.textContent = 'Kopieren'), 1000);
    });
  });
}

searchEl.addEventListener('input', renderRows);
sortEl.addEventListener('change', loadPrompts);
loadPrompts();
