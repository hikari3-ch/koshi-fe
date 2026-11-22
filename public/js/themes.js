const themes = {
  list: [
    { label: 'Yotsuba', id: 'yotsuba' },
    { label: 'Yotsuba B', id: 'yotsuba-b' }
  ],
  defaultId: 'yotsuba-b',

  ids() {
    return this.list.map((t) => t.id);
  },

  boardDefaultId() {
    const id = window.boardDefaultTheme;
    return this.ids().indexOf(id) !== -1 ? id : '';
  },

  href(id) {
    const theme = this.byId(id) || this.byId(this.defaultId);
    return theme ? `/css/${theme.id}.css` : '';
  },

  byId(id) {
    return this.list.find((theme) => theme.id === id);
  },

  saved() {
    const raw = String(localStorage.selectedTheme || '');
    const id = raw.replace(/^vichan\//, '');
    if (id && id !== raw) localStorage.selectedTheme = id;
    return this.ids().indexOf(id) !== -1 ? id : '';
  },

  apply(id) {
    const link = document.getElementById('theme-css');
    if (link) link.href = this.href(id);
  },

  init() {
    const tools = document.querySelector('.footer-nav-tools');
    if (!tools || document.getElementById('themeSelector')) return;

    const sel = document.createElement('select');
    sel.id = 'themeSelector';

    const boardDefaultId = this.boardDefaultId();
    const boardDefault = this.byId(boardDefaultId);
    const defaultLabel = (this.byId(this.defaultId) || { label: 'Yotsuba B' }).label;
    const def = document.createElement('option');
    def.value = 'default';
    def.textContent = boardDefault ? `Board default (${boardDefault.label})` : `Default (${defaultLabel})`;
    sel.appendChild(def);

    this.list.forEach((theme) => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.label;
      sel.appendChild(option);
    });

    const saved = this.saved();
    sel.value = saved || 'default';
    if (!saved && localStorage.selectedTheme) {
      delete localStorage.selectedTheme;
      this.apply(boardDefaultId);
    }

    sel.addEventListener('change', () => {
      const id = sel.value;
      if (id === 'default') {
        delete localStorage.selectedTheme;
        this.apply(boardDefaultId);
        return;
      }
      localStorage.selectedTheme = id;
      this.apply(id);
    });

    tools.insertBefore(sel, tools.firstChild);
  }
};

const savedTheme = themes.saved();
themes.apply(savedTheme || themes.boardDefaultId());

window.themes = themes;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => themes.init());
} else {
  themes.init();
}
