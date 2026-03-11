const rowsEl = document.getElementById('promptRows');
const searchEl = document.getElementById('search');
const sortEl = document.getElementById('sort');
const heroTitleEl = document.getElementById('heroTitle');
const heroSubtitleEl = document.getElementById('heroSubtitle');
const heroBadgeEl = document.getElementById('heroBadge');
const highlightsEl = document.getElementById('highlights');
const statusEl = document.getElementById('status');

let allPrompts = [];

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

async function loadSiteContent() {
  const res = await fetch(apiUrl('/api/site-content'));
  if (!res.ok) throw new Error('Seitentexte konnten nicht geladen werden.');
  const data = await res.json();

  heroTitleEl.textContent = data.hero_title || 'Prompt-Bibliothek';
  heroSubtitleEl.textContent = data.hero_subtitle || '';
  heroBadgeEl.textContent = data.hero_badge || '';

  const highlights = Array.isArray(data.highlights) ? data.highlights : [];
  highlightsEl.innerHTML = highlights.map((item) => `
    <article class="highlight-card">
      <h3>${escapeHtml(item.title || '')}</h3>
      <p>${escapeHtml(item.text || '')}</p>
    </article>
  `).join('');
}

async function loadPrompts() {
  setStatus('Lade Prompts ...');
  const sort = sortEl.value;
  const res = await fetch(apiUrl(`/api/prompts?sort=${encodeURIComponent(sort)}`));
  if (!res.ok) throw new Error('Prompts konnten nicht geladen werden.');
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

  setStatus(`${filtered.length} von ${allPrompts.length} Prompts angezeigt.`);
}

searchEl.addEventListener('input', renderRows);
sortEl.addEventListener('change', loadPrompts);

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([loadSiteContent(), loadPrompts()]);
  } catch (err) {
    setStatus(err.message || 'Fehler beim Laden.');
  }
});
