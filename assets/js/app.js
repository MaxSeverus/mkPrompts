const API_BASE = '/mkprompts';

class App {
  constructor() {
    this.prompts = [];
    this.links = [];
    this.currentView = 'prompt';
    this.loadingState = false;
    this.goalOrder = [
      'Erstellen',
      'Analysieren',
      'Korrigieren',
      'Übersetzen',
      'Prüfen',
      'Erklären',
      'Verdichten',
      'Ohne Zuordnung',
    ];
    this.themeOrder = [
      'Allgemein',
      'Datenschutz',
      'Microsoft 365',
      'Excel',
      'Kommunikation',
      'Web',
    ];
    this.lastState = null;
  }

  async init() {
    router.init();
    this.setupEventListeners();
    this.loadTheme();
    await this.loadData();
    this.updateViewSwitch();
    this.updateFilterVisibility();
    this.updateDirButton();
    this.syncControls();
    this.lastState = { ...router.state };
    this.recordPageView();
  }

  setupEventListeners() {
    // View change
    router.on('state-change', (state) => this.handleStateChange(state));

    // View Switch
    document.querySelectorAll('.view-switch button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        router.pushState({ view: e.target.dataset.view });
      });
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


  async loadData() {
    const state = router.state;
    const view = state.view;

    this.loadingState = true;
    const container = document.getElementById('promptList');
    if (container) container.textContent = 'Lädt…';

    try {
      const endpoint = `${API_BASE}/api.php`;
      const params = new URLSearchParams({
        type: this.currentView,
      });

      if (this.currentView === 'link') {
        params.set('q', state.search || '');
        params.set('sort', this.mapLinkSortToApi(state.sort));
        params.set('dir', this.mapDirectionForApi(state.sort, state.direction));
      } else {
        // Prompt-Suche und Sortierung erfolgen clientseitig, damit interne Kürzel
        // niemals als Filter-/Sortierbasis verwendet werden.
        params.set('q', '');
        params.set('sort', 'updated_at');
        params.set('dir', 'desc');
      }

      const response = await fetch(`${endpoint}?${params}`);
      const data = await response.json();

      if (data.ok) {
        if (view === 'link') {
          this.links = data.data || [];
          this.renderLinks();
        } else {
          this.prompts = (data.data || []).map((prompt) => this.normalizePrompt(prompt));
          this.renderPrompts();
        }
        this.lastState = { ...router.state };
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


  renderPrompts() {
    const container = document.getElementById('promptList');
    if (!container) return;

    this.updateThemeFilter();
    this.updateGoalFilter();

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

      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'prompt-link-open';
      a.textContent = `🔗 ${this.toClearUrl(link.url)}`;

      const h4 = document.createElement('h4');
      h4.textContent = link.description;
      const p = document.createElement('p');
      p.className = 'text-light';
      p.textContent = link.category || 'Allgemein';

      card.appendChild(a);
      card.appendChild(h4);
      card.appendChild(p);
      container.appendChild(card);
    });
  }

  toClearUrl(urlValue) {
    const raw = String(urlValue || '').trim();
    if (!raw) return '';

    try {
      const parsed = new URL(raw);
      return `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`.replace(/\/$/, '');
    } catch {
      return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    }
  }

  createPromptCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';

    const text = prompt.prompt || '';
    const title = prompt.title || 'Ohne Titel';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'row between align-center';
    const titleDiv = document.createElement('div');
    const h4 = document.createElement('h4');
    h4.textContent = title;
    titleDiv.appendChild(h4);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'prompt-meta';
    metaDiv.textContent = `${prompt.theme} · ${prompt.goal}`;
    titleDiv.appendChild(metaDiv);

    if (prompt.internalTag) {
      const codeBadge = document.createElement('div');
      codeBadge.className = 'internal-tag';
      codeBadge.textContent = `Kürzel: ${prompt.internalTag}`;
      titleDiv.appendChild(codeBadge);
    }

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

  updateThemeFilter() {
    const container = document.getElementById('themeFilterButtons');
    if (!container) return;

    const themes = new Set();
    this.prompts.forEach(p => {
      if (p.theme) themes.add(p.theme);
    });

    const sortedThemes = this.sortByPreferredOrder(Array.from(themes), this.themeOrder);

    container.textContent = '';
    const allBtn = document.createElement('button');
    allBtn.textContent = 'Alle';
    allBtn.className = 'is-active';
    allBtn.dataset.value = '';
    allBtn.addEventListener('click', () => this.setThemeFilter(''));
    container.appendChild(allBtn);

    sortedThemes.forEach(theme => {
      const btn = document.createElement('button');
      btn.textContent = theme;
      btn.dataset.value = theme;
      btn.addEventListener('click', () => this.setThemeFilter(theme));
      container.appendChild(btn);
    });

    this.updateThemeFilterButtons();
  }

  updateGoalFilter() {
    const container = document.getElementById('goalFilterButtons');
    if (!container) return;

    const goals = new Set();
    this.prompts.forEach(p => {
      if (p.goal) goals.add(p.goal);
    });

    const sortedGoals = this.sortByPreferredOrder(Array.from(goals), this.goalOrder);

    container.textContent = '';
    const allBtn = document.createElement('button');
    allBtn.textContent = 'Alle';
    allBtn.className = 'is-active';
    allBtn.dataset.value = '';
    allBtn.addEventListener('click', () => this.setGoalFilter(''));
    container.appendChild(allBtn);

    sortedGoals.forEach(goal => {
      const btn = document.createElement('button');
      btn.textContent = goal;
      btn.dataset.value = goal;
      btn.addEventListener('click', () => this.setGoalFilter(goal));
      container.appendChild(btn);
    });

    this.updateGoalFilterButtons();
  }

  setThemeFilter(theme) {
    router.pushState({ themeFilter: theme });
  }

  setGoalFilter(goal) {
    router.pushState({ goalFilter: goal });
  }

  updateThemeFilterButtons() {
    const themeFilter = router.state.themeFilter || '';
    document.querySelectorAll('#themeFilterButtons button').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.value === themeFilter);
    });
  }

  updateGoalFilterButtons() {
    const goalFilter = router.state.goalFilter || '';
    document.querySelectorAll('#goalFilterButtons button').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.value === goalFilter);
    });
  }

  filterPrompts() {
    const search = (router.state.search || '').trim().toLowerCase();
    const themeFilter = router.state.themeFilter || '';
    const goalFilter = router.state.goalFilter || '';

    const filtered = this.prompts.filter((prompt) => {
      if (themeFilter && prompt.theme !== themeFilter) return false;
      if (goalFilter && prompt.goal !== goalFilter) return false;
      if (!search) return true;

      const haystack = [
        prompt.title,
        prompt.theme,
        prompt.goal,
        prompt.prompt,
      ].join(' ').toLowerCase();

      return haystack.includes(search);
    });

    return this.sortPrompts(filtered, router.state.sort, router.state.direction);
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

  handleStateChange(state) {
    this.currentView = state.view;
    this.updateViewSwitch();
    this.updateFilterVisibility();
    this.updateDirButton();
    this.syncControls();

    const hadPreviousState = this.lastState !== null;
    const viewChanged = !hadPreviousState || this.lastState.view !== state.view;
    const linkView = state.view === 'link';

    if (viewChanged) {
      this.loadData();
      return;
    }

    if (linkView) {
      this.loadData();
      return;
    }

    this.renderPrompts();
    this.lastState = { ...state };
  }

  syncControls() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value !== (router.state.search || '')) {
      searchInput.value = router.state.search || '';
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect && sortSelect.value !== (router.state.sort || 'newest')) {
      sortSelect.value = router.state.sort || 'newest';
    }
  }

  updateFilterVisibility() {
    const isLinkView = this.currentView === 'link';
    const themeField = document.getElementById('themeFilterField');
    const goalField = document.getElementById('goalFilterField');
    if (themeField) themeField.classList.toggle('hidden', isLinkView);
    if (goalField) goalField.classList.toggle('hidden', isLinkView);
  }

  mapDirectionForApi(sort, direction) {
    if (sort === 'newest' && !direction) return 'desc';
    return direction === 'asc' ? 'asc' : 'desc';
  }

  mapLinkSortToApi(sort) {
    const sortMap = {
      newest: 'created_at',
      relevance: 'action_count',
      title: 'description',
      popular: 'action_count',
    };
    return sortMap[sort] || 'created_at';
  }

  sortByPreferredOrder(values, preferredOrder) {
    const orderMap = new Map(preferredOrder.map((value, index) => [value, index]));
    return values.sort((a, b) => {
      const aOrder = orderMap.has(a) ? orderMap.get(a) : Number.MAX_SAFE_INTEGER;
      const bOrder = orderMap.has(b) ? orderMap.get(b) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.localeCompare(b, 'de', { sensitivity: 'base' });
    });
  }

  sortPrompts(prompts, sort, direction) {
    const dirFactor = direction === 'asc' ? 1 : -1;
    const selectedSort = sort || 'newest';

    const sorted = [...prompts].sort((a, b) => {
      if (selectedSort === 'title') {
        return a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }) * dirFactor;
      }

      if (selectedSort === 'popular' || selectedSort === 'relevance') {
        const popularityDelta = (a.action_count || 0) - (b.action_count || 0);
        if (popularityDelta !== 0) return popularityDelta * dirFactor;
        return a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }) * dirFactor;
      }

      const aDate = Date.parse(a.created_at || '') || 0;
      const bDate = Date.parse(b.created_at || '') || 0;
      if (aDate !== bDate) return (aDate - bDate) * dirFactor;
      return a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }) * dirFactor;
    });

    return sorted;
  }

  looksLikeInternalTag(value) {
    if (!value) return false;
    if (value.includes(' ')) return false;
    return /^[a-z][a-z0-9_-]{1,}$/i.test(value);
  }

  normalizePrompt(rawPrompt) {
    const first = (rawPrompt.nr || '').trim();
    const second = (rawPrompt.abbreviation || '').trim();
    const firstIsTag = this.looksLikeInternalTag(first);
    const secondIsTag = this.looksLikeInternalTag(second);

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

    const promptText = rawPrompt.prompt || '';
    const theme = this.detectTheme(rawPrompt.project || '', title, promptText);
    const goal = this.detectGoal(title, promptText);

    return {
      ...rawPrompt,
      internalTag,
      title: title || 'Ohne Titel',
      theme,
      goal,
    };
  }

  detectTheme(project, title, promptText) {
    const cleanProject = (project || '').trim();
    if (cleanProject && cleanProject.toLowerCase() !== 'alle') {
      return this.humanizeLabel(cleanProject);
    }

    const text = `${title} ${promptText}`.toLowerCase();
    if (/(dsgvo|datenschutz|verarbeitungstätigkeit|personenbezug|vvt)/.test(text)) return 'Datenschutz';
    if (/(excel|xls|spreadsheet|arbeitsmappe)/.test(text)) return 'Excel';
    if (/(url|website|wordpress|webseite|domain|link)/.test(text)) return 'Web';
    if (/(m365|outlook|teams|copilot|sharepoint|onedrive)/.test(text)) return 'Microsoft 365';
    if (/(telefon|mail|e-mail|kommunikation|meeting|protokoll|agenda|portrait)/.test(text)) return 'Kommunikation';
    return 'Allgemein';
  }

  detectGoal(title, promptText) {
    const text = `${title} ${promptText}`.toLowerCase();

    if (/(übersetz|translate|englisch)/.test(text)) return 'Übersetzen';
    if (/(korr|korrektur|fehlerfrei|rewrite|überarbeiten)/.test(text)) return 'Korrigieren';
    if (/(prüf|check|validier|audit)/.test(text)) return 'Prüfen';
    if (/(analys|kritik|review|bewert|klassifizier)/.test(text)) return 'Analysieren';
    if (/(eli5|einfach erklärt|erklär|explain)/.test(text)) return 'Erklären';
    if (/(zusammenfass|minuten|protokoll|verdicht|kurzfassung)/.test(text)) return 'Verdichten';
    return 'Erstellen';
  }

  humanizeLabel(label) {
    const normalized = label.trim().replace(/[_-]+/g, ' ');
    if (!normalized) return 'Allgemein';
    return normalized
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
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
