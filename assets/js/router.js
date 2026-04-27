class Router {
  constructor() {
    this.state = {
      project: '',
      view: 'prompt',
      search: '',
      sort: 'newest',
      direction: 'desc',
      titleFilter: '',
      linkCategoryFilter: '',
    };
    this.listeners = [];
  }

  parseQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const legacySort = params.get('sort') || this.state.sort;
    const sortMap = {
      nr: 'title',
      abbreviation: 'title',
      prompt: 'relevance',
      created_at: 'newest',
      updated_at: 'newest',
      action_count: 'popular',
    };
    const normalizedSort = sortMap[legacySort] || legacySort || this.state.sort;

    return {
      module: params.get('module') || this.state.module,
      project: params.get('project') || this.state.project,
      view: params.get('view') || this.state.view,
      search: params.get('search') || this.state.search,
      sort: normalizedSort,
      direction: params.get('direction') || this.state.direction,
      titleFilter: params.get('titleFilter') || params.get('themeFilter') || this.state.titleFilter,
      linkCategoryFilter: params.get('linkCategoryFilter') || this.state.linkCategoryFilter,
    };
  }

  pushState(newState) {
    this.state = { ...this.state, ...newState };
    const params = new URLSearchParams();
    Object.entries(this.state).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : window.location.pathname;
    window.history.pushState(this.state, '', url);
    this.emit('state-change', this.state);
  }

  replaceState(newState) {
    this.state = { ...this.state, ...newState };
    const params = new URLSearchParams();
    Object.entries(this.state).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : window.location.pathname;
    window.history.replaceState(this.state, '', url);
    this.emit('state-change', this.state);
  }

  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  emit(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        listener.callback(data);
      }
    });
  }

  init() {
    const params = this.parseQueryParams();
    this.state = { ...this.state, ...params };
    this.emit('state-change', this.state);
    window.addEventListener('popstate', () => {
      const params = this.parseQueryParams();
      this.state = { ...this.state, ...params };
      this.emit('state-change', this.state);
    });
  }
}

window.router = new Router();
