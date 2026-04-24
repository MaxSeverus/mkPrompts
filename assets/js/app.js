const API_BASE = '/mkprompts';

class App {
  constructor() {
    this.modules = [];
    this.prompts = [];
    this.links = [];
    this.projects = new Set();
    this.currentView = 'prompt';
    this.loadingState = false;
  }

  async init() {
    router.init();
    this.setupEventListeners();
    this.loadTheme();
    await this.loadModules();
    await this.loadData();
    this.recordPageView();
  }

  setupEventListeners() {
    // Modules
    router.on('state-change', (state) => {
      this.currentView = state.view;
      this.renderModules();
      this.updateViewSwitch();
      this.loadData();
    });

    // View Switch
    document.querySelectorAll('.view-switch button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        router.pushState({ view: e.target.dataset.view });
      });
    });

    // Project Filter
    document.getElementById('projectFilter')?.addEventListener('change', (e) => {
      router.pushState({ project: e.target.value });
    });

    // Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      router.pushState({ search: e.target.value });
    });

    // Sort
    document.getElementById('sortSelect')?.addEventListener('change', (e) => {
      router.pushState({ sort: e.target.value });
    });

    // Direction
    document.getElementById('dirButton')?.addEventListener('click', () => {
      const newDir = router.state.direction === 'asc' ? 'desc' : 'asc';
      router.pushState({ direction: newDir });
      this.updateDirButton();
    });

    // Theme Toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });
  }

  async loadModules() {
    try {
      const response = await fetch(`${API_BASE}/api/modules.php`);
      const data = await response.json();
      if (data.ok) {
        this.modules = data.data || [];
        this.renderModules();
      }
    } catch (err) {
      console.error('Fehler beim Laden der Module:', err);
    }
  }

  async loadData() {
    const state = router.state;
    const view = state.view;

    this.loadingState = true;
    const container = document.getElementById('promptList');
    if (container) container.textContent = 'Lädt…';

    try {
      const params = new URLSearchParams({
        type: view,
        module: state.module,
        q: state.search,
        sort: state.sort,
        dir: state.direction,
      });

      if (state.project && view === 'exercise') {
        params.set('project', state.project);
      }

      const response = await fetch(`${API_BASE}/api/prompts.php?${params}`);
      const data = await response.json();

      if (data.ok) {
        if (view === 'link') {
          this.links = data.data || [];
          this.renderLinks();
        } else {
          this.prompts = data.data || [];
          this.updateProjectFilter();
          this.renderPrompts();
        }
      }
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
      const container = document.getElementById('promptList');
      if (container) {
        container.textContent = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        const h3 = document.createElement('h3');
        h3.textContent = 'Fehler beim Laden';
        const p = document.createElement('p');
        p.textContent = 'Bitte versuche es später erneut.';
        emptyDiv.appendChild(h3);
        emptyDiv.appendChild(p);
        container.appendChild(emptyDiv);
      }
    }

    this.loadingState = false;
  }

  renderModules() {
    const container = document.getElementById('modulesNav');
    if (!container) return;

    const currentModule = router.state.module;
    container.textContent = '';

    this.modules.forEach(mod => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'secondary ' + (mod.slug === currentModule ? 'active' : '');
      btn.dataset.module = mod.slug;
      btn.setAttribute('aria-pressed', mod.slug === currentModule);
      btn.textContent = mod.name;
      btn.addEventListener('click', () => {
        router.pushState({ module: btn.dataset.module });
      });
      container.appendChild(btn);
    });
  }

  renderPrompts() {
    const container = document.getElementById('promptList');
    if (!container) return;

    this.updateNrFilter();

    const filtered = this.filterPrompts();

    if (filtered.length === 0) {
      container.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      const h3 = document.createElement('h3');
      h3.textContent = 'Keine Inhalte gefunden';
      const p = document.createElement('p');
      p.textContent = 'Versuche die Suche oder Filter zu ändern.';
      emptyDiv.appendChild(h3);
      emptyDiv.appendChild(p);
      container.appendChild(emptyDiv);
      return;
    }

    container.textContent = '';
    filtered.forEach(prompt => {
      const card = this.createPromptCard(prompt);
      container.appendChild(card);
    });

    container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const text = btn.dataset.text;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = '✓ Kopiert';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = '📋 Kopieren';
            btn.classList.remove('copied');
          }, 2000);
          this.showToast('In die Zwischenablage kopiert!');
        }).catch(err => {
          console.error('Kopieren fehlgeschlagen:', err);
          this.showToast('Fehler beim Kopieren');
        });
      });
    });
  }

  renderLinks() {
    const container = document.getElementById('promptList');
    if (!container) return;

    if (this.links.length === 0) {
      container.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      const h3 = document.createElement('h3');
      h3.textContent = 'Keine Links gefunden';
      const p = document.createElement('p');
      p.textContent = 'Versuche die Suche zu ändern.';
      emptyDiv.appendChild(h3);
      emptyDiv.appendChild(p);
      container.appendChild(emptyDiv);
      return;
    }

    container.textContent = '';
    this.links.forEach(link => {
      const card = document.createElement('div');
      card.className = 'prompt-card';
      const h4 = document.createElement('h4');
      h4.textContent = link.description;
      const p = document.createElement('p');
      p.className = 'text-light';
      p.textContent = link.category || 'Allgemein';
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'prompt-link-url';
      a.textContent = '🔗 Link öffnen';
      card.appendChild(h4);
      card.appendChild(p);
      card.appendChild(a);
      container.appendChild(card);
    });
  }

  createPromptCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';

    const text = prompt.prompt || '';
    const abbrev = prompt.abbreviation || '';
    const nr = prompt.nr || '';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'row between align-center';
    const titleDiv = document.createElement('div');
    const h4 = document.createElement('h4');
    h4.textContent = nr + ' – ' + abbrev;
    titleDiv.appendChild(h4);
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = '📋 Kopieren';
    btn.dataset.text = text;
    headerDiv.appendChild(titleDiv);
    headerDiv.appendChild(btn);

    const textDiv = document.createElement('div');
    textDiv.className = 'prompt-text';
    textDiv.innerHTML = this.formatText(text);

    card.appendChild(headerDiv);
    card.appendChild(textDiv);

    return card;
  }

  formatText(text) {
    let formatted = this.escapeHtml(text);
    formatted = formatted.replace(/\[B\](.*?)\[\/B\]/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\[I\](.*?)\[\/I\]/g, '<em>$1</em>');
    formatted = formatted.replace(/\[U\](.*?)\[\/U\]/g, '<u>$1</u>');
    formatted = formatted.replace(/\[(.*?)\]/g, '<span class="placeholder">[$1]</span>');
    formatted = formatted.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return formatted;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateNrFilter() {
    const container = document.getElementById('nrFilterButtons');
    if (!container) return;

    const nrs = new Set();
    this.prompts.forEach(p => {
      if (p.nr) nrs.add(p.nr);
    });

    const sortedNrs = Array.from(nrs).sort((a, b) => {
      const aNum = parseInt(a) || 0;
      const bNum = parseInt(b) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });

    container.textContent = '';
    const allBtn = document.createElement('button');
    allBtn.textContent = 'Alle';
    allBtn.className = 'is-active';
    allBtn.dataset.nr = '';
    allBtn.addEventListener('click', () => this.setNrFilter(''));
    container.appendChild(allBtn);

    sortedNrs.forEach(nr => {
      const btn = document.createElement('button');
      btn.textContent = nr;
      btn.dataset.nr = nr;
      btn.addEventListener('click', () => this.setNrFilter(nr));
      container.appendChild(btn);
    });

    this.updateNrFilterButtons();
  }

  setNrFilter(nr) {
    router.pushState({ nrFilter: nr });
  }

  updateNrFilterButtons() {
    const nrFilter = router.state.nrFilter || '';
    document.querySelectorAll('#nrFilterButtons button').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.nr === nrFilter);
    });
  }

  filterPrompts() {
    let filtered = this.prompts;
    const nrFilter = router.state.nrFilter || '';

    if (nrFilter) {
      filtered = filtered.filter(p => p.nr === nrFilter);
    }

    return filtered;
  }

  updateProjectFilter() {
    const select = document.getElementById('projectFilter');
    if (!select) return;

    const projects = new Set();
    this.prompts.forEach(p => {
      if (p.project && p.project.toLowerCase() !== 'alle') {
        projects.add(p.project);
      }
    });

    const currentValue = select.value;
    select.innerHTML = '<option value="">Alle</option>';
    Array.from(projects).sort().forEach(proj => {
      const option = document.createElement('option');
      option.value = proj;
      option.textContent = proj;
      select.appendChild(option);
    });
    select.value = currentValue;
  }

  updateDirButton() {
    const btn = document.getElementById('dirButton');
    if (btn) {
      const dir = router.state.direction;
      btn.textContent = dir === 'asc' ? 'Aufsteigend' : 'Absteigend';
    }
  }

  updateViewSwitch() {
    document.querySelectorAll('.view-switch button').forEach(btn => {
      const isActive = btn.dataset.view === router.state.view;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible', 'show');
    setTimeout(() => {
      toast.classList.remove('visible', 'show');
    }, 2000);
  }

  toggleTheme() {
    const currentScheme = localStorage.getItem('theme') || 'light';
    const newScheme = currentScheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newScheme);
    this.applyTheme(newScheme);
  }

  loadTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.style.colorScheme = 'dark';
      const toggle = document.getElementById('themeToggle');
      if (toggle) toggle.textContent = '☀️';
    } else {
      html.style.colorScheme = 'light';
      const toggle = document.getElementById('themeToggle');
      if (toggle) toggle.textContent = '🌙';
    }
  }

  async recordPageView() {
    try {
      const visitorHash = this.getOrCreateVisitorHash();
      await fetch(`${API_BASE}/api/track.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_hash: visitorHash }),
      });
      this.loadPageViewCount();
    } catch (err) {
      console.error('Fehler beim Tracking:', err);
    }
  }

  getOrCreateVisitorHash() {
    let hash = localStorage.getItem('visitor_hash');
    if (!hash) {
      hash = this.generateHash();
      localStorage.setItem('visitor_hash', hash);
    }
    return hash;
  }

  generateHash() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async loadPageViewCount() {
    try {
      const response = await fetch(`${API_BASE}/api/stats.php`);
      const data = await response.json();
      if (data.ok) {
        const count = document.getElementById('pageViewCount');
        if (count) {
          count.textContent = data.data?.page_views || '0';
        }
      }
    } catch (err) {
      console.error('Fehler beim Laden der Stats:', err);
    }
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
