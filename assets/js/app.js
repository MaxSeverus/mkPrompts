const API_BASE = '/mkprompts';

class App {
  constructor() {
    this.prompts = [];
    this.links = [];
    this.currentView = 'prompt';
    this.loadingState = false;
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
        // Links werden clientseitig gefiltert/sortiert, damit alle Optionen
        // in allen Bereichen identisch und verlässlich funktionieren.
        params.set('q', '');
        params.set('sort', 'created_at');
        params.set('dir', 'desc');
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

    this.updateTitleFilter();

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

    this.updateLinkCategoryFilter();
    const filteredLinks = this.filterLinks();

    if (filteredLinks.length === 0) {
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
    filteredLinks.forEach(link => {
      const card = document.createElement('div');
      card.className = 'prompt-card';

      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'prompt-link-open';
      a.textContent = `🔗 ${this.toClearUrl(link.url)}`;
      a.addEventListener('click', () => this.trackLinkAction(link.url));

      const h4 = document.createElement('h4');
      h4.innerHTML = this.formatText(link.description || '');
      const p = document.createElement('p');
      p.className = 'text-light';
      p.textContent = link.category || 'Allgemein';
      const dateMeta = document.createElement('div');
      dateMeta.className = 'link-meta';
      const createdAt = this.formatDateTime(link.created_at);
      const updatedAt = this.formatDateTime(link.updated_at);
      const views = Number(link.action_count || 0);
      dateMeta.textContent = `Erstellt: ${createdAt} · Geändert: ${updatedAt} · Aufrufe: ${views}`;

      card.appendChild(a);
      card.appendChild(h4);
      card.appendChild(p);
      card.appendChild(dateMeta);
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

    if (prompt.internalTag) {
      const codeBadge = document.createElement('div');
      codeBadge.className = 'internal-tag';
      codeBadge.textContent = `Kürzel: ${prompt.internalTag}`;
      titleDiv.appendChild(codeBadge);
    }

    const infoLine = document.createElement('div');
    infoLine.className = 'prompt-stats';
    const createdAt = this.formatDateTime(prompt.created_at);
    const updatedAt = this.formatDateTime(prompt.updated_at);
    const usages = Number(prompt.action_count || 0);
    infoLine.textContent = `Erstellt: ${createdAt} · Geändert: ${updatedAt} · Nutzungen: ${usages}`;
    titleDiv.appendChild(infoLine);

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

  updateTitleFilter() {
    const container = document.getElementById('titleFilterButtons');
    if (!container) return;

    const titles = new Set();
    this.prompts.forEach(p => {
      if (p.title) titles.add(p.title);
    });

    const sortedTitles = Array.from(titles).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

    container.textContent = '';
    const allBtn = document.createElement('button');
    allBtn.textContent = 'Alle';
    allBtn.className = 'is-active';
    allBtn.dataset.value = '';
    allBtn.addEventListener('click', () => this.setTitleFilter(''));
    container.appendChild(allBtn);

    sortedTitles.forEach(title => {
      const btn = document.createElement('button');
      btn.textContent = title;
      btn.dataset.value = title;
      btn.addEventListener('click', () => this.setTitleFilter(title));
      container.appendChild(btn);
    });

    this.updateTitleFilterButtons();
  }

  setTitleFilter(title) {
    router.pushState({ titleFilter: title });
  }

  updateTitleFilterButtons() {
    const titleFilter = router.state.titleFilter || '';
    document.querySelectorAll('#titleFilterButtons button').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.value === titleFilter);
    });
  }

  filterPrompts() {
    const search = (router.state.search || '').trim().toLowerCase();
    const titleFilter = router.state.titleFilter || '';

    const filtered = this.prompts.filter((prompt) => {
      if (titleFilter && prompt.title !== titleFilter) return false;
      if (!search) return true;

      const haystack = [
        prompt.title,
        prompt.internalTag,
        prompt.nr,
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
      this.renderLinks();
      this.lastState = { ...state };
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
    const titleField = document.getElementById('titleFilterField');
    const linkCategoryField = document.getElementById('linkCategoryFilterField');
    const searchField = document.getElementById('searchField');
    if (titleField) titleField.classList.toggle('hidden', isLinkView);
    if (linkCategoryField) linkCategoryField.classList.toggle('hidden', !isLinkView);
    if (searchField) searchField.classList.remove('hidden');
  }

  mapDirectionForApi(sort, direction) {
    if (sort === 'newest' && !direction) return 'desc';
    return direction === 'asc' ? 'asc' : 'desc';
  }

  mapLinkSortToApi(sort) {
    const sortMap = {
      newest: 'created_at',
      title: 'description',
      popular: 'action_count',
      content: 'description',
      action_count: 'action_count',
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

      if (selectedSort === 'content') {
        const aContent = String(a.prompt || '').toLowerCase();
        const bContent = String(b.prompt || '').toLowerCase();
        const contentDelta = aContent.localeCompare(bContent, 'de', { sensitivity: 'base' });
        if (contentDelta !== 0) return contentDelta * dirFactor;
        return a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }) * dirFactor;
      }

      if (selectedSort === 'popular' || selectedSort === 'action_count') {
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
    const theme = this.detectTheme(rawPrompt.project || '', title, promptText, internalTag);
    const goal = this.detectGoal(title, promptText);

    return {
      ...rawPrompt,
      internalTag,
      title: title || 'Ohne Titel',
      theme,
      goal,
    };
  }

  detectTheme(project, title, promptText, internalTag = '') {
    const cleanProject = (project || '').trim();
    if (cleanProject && cleanProject.toLowerCase() !== 'alle') {
      return this.humanizeLabel(cleanProject);
    }

    const text = `${internalTag} ${title} ${promptText}`.toLowerCase();
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

  updateLinkCategoryFilter() {
    const container = document.getElementById('linkCategoryFilterButtons');
    if (!container || this.currentView !== 'link') return;

    const categories = Array.from(new Set(
      this.links
        .map(link => String(link.category || '').trim())
        .filter(Boolean),
    )).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

    container.textContent = '';

    const allBtn = document.createElement('button');
    allBtn.textContent = 'Alle';
    allBtn.dataset.value = '';
    allBtn.className = 'is-active';
    allBtn.addEventListener('click', () => this.setLinkCategoryFilter(''));
    container.appendChild(allBtn);

    categories.forEach((category) => {
      const btn = document.createElement('button');
      btn.textContent = category;
      btn.dataset.value = category;
      btn.addEventListener('click', () => this.setLinkCategoryFilter(category));
      container.appendChild(btn);
    });

    this.updateLinkCategoryButtons();
  }

  setLinkCategoryFilter(category) {
    router.pushState({ linkCategoryFilter: category });
  }

  updateLinkCategoryButtons() {
    const categoryFilter = router.state.linkCategoryFilter || '';
    document.querySelectorAll('#linkCategoryFilterButtons button').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.value === categoryFilter);
    });
  }

  filterLinks() {
    const search = (router.state.search || '').trim().toLowerCase();
    const categoryFilter = router.state.linkCategoryFilter || '';
    const filtered = this.links.filter((link) => {
      if (categoryFilter && String(link.category || '').trim() !== categoryFilter) return false;
      if (!search) return true;
      const haystack = [
        link.description,
        this.toClearUrl(link.url),
        link.category,
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });

    return this.sortLinks(filtered, router.state.sort, router.state.direction);
  }

  sortLinks(links, sort, direction) {
    const dirFactor = direction === 'asc' ? 1 : -1;
    const selectedSort = sort || 'newest';

    return [...links].sort((a, b) => {
      if (selectedSort === 'title') {
        const aTitle = this.toClearUrl(a.url || '');
        const bTitle = this.toClearUrl(b.url || '');
        return aTitle.localeCompare(bTitle, 'de', { sensitivity: 'base' }) * dirFactor;
      }

      if (selectedSort === 'content') {
        const aDescription = String(a.description || '');
        const bDescription = String(b.description || '');
        const descriptionDelta = aDescription.localeCompare(bDescription, 'de', { sensitivity: 'base' });
        if (descriptionDelta !== 0) return descriptionDelta * dirFactor;
        const aTitle = this.toClearUrl(a.url || '');
        const bTitle = this.toClearUrl(b.url || '');
        return aTitle.localeCompare(bTitle, 'de', { sensitivity: 'base' }) * dirFactor;
      }

      if (selectedSort === 'popular' || selectedSort === 'action_count') {
        const popularityDelta = (a.action_count || 0) - (b.action_count || 0);
        if (popularityDelta !== 0) return popularityDelta * dirFactor;
        const aTitle = this.toClearUrl(a.url || '');
        const bTitle = this.toClearUrl(b.url || '');
        return aTitle.localeCompare(bTitle, 'de', { sensitivity: 'base' }) * dirFactor;
      }

      const aDate = Date.parse(a.created_at || '') || 0;
      const bDate = Date.parse(b.created_at || '') || 0;
      if (aDate !== bDate) return (aDate - bDate) * dirFactor;
      const aTitle = this.toClearUrl(a.url || '');
      const bTitle = this.toClearUrl(b.url || '');
      return aTitle.localeCompare(bTitle, 'de', { sensitivity: 'base' }) * dirFactor;
    });
  }

  formatDateTime(value) {
    if (!value) return '–';
    const normalized = String(value).replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
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

  trackLinkAction(url) {
    const endpoint = `${API_BASE}/api/track.php`;
    const payload = JSON.stringify({
      event: 'link_action',
      url: String(url || ''),
    });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
        return;
      }
    } catch (err) {
      console.error('sendBeacon fehlgeschlagen:', err);
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch((err) => {
      console.error('Link-Tracking fehlgeschlagen:', err);
    });
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
