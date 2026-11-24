const siteThemeCfg = typeof window !== 'undefined' && window.siteThemeConfig ? window.siteThemeConfig : {};

const themes = {
  list:
    Array.isArray(siteThemeCfg.themes) && siteThemeCfg.themes.length
      ? siteThemeCfg.themes
      : [
          { label: 'Yotsuba', id: 'yotsuba' },
          { label: 'Yotsuba B', id: 'yotsuba-b' }
        ],
  defaultId: siteThemeCfg.defaultTheme || 'yotsuba-b',
  defaultLabel: siteThemeCfg.defaultThemeLabel || '',

  ids() {
    return this.list.map((t) => t.id);
  },

  boardDefaultId() {
    const raw = String(window.boardDefaultTheme || '');
    const id = raw.replace(/^vichan\//, '');
    if (this.ids().indexOf(raw) !== -1) return raw;
    if (this.ids().indexOf(id) !== -1) return id;
    return raw === this.defaultId || id === this.defaultId ? this.defaultId : '';
  },

  href(id) {
    const requested = id || this.defaultId;
    const theme = this.byId(requested);
    if (theme) return `/css/${theme.id}.css`;
    if (requested === this.defaultId && this.defaultId) return `/css/${this.defaultId}.css`;
    const fallback = this.byId(this.defaultId);
    return fallback ? `/css/${fallback.id}.css` : `/css/${this.defaultId || 'yotsuba-b'}.css`;
  },

  byId(id) {
    return this.list.find((theme) => theme.id === id);
  },

  saved() {
    const raw = String(localStorage.selectedTheme || '');
    if (!raw) return '';
    if (this.ids().indexOf(raw) !== -1) return raw;
    const id = raw.replace(/^vichan\//, '');
    if (id && id !== raw && this.ids().indexOf(id) !== -1) {
      localStorage.selectedTheme = id;
      return id;
    }
    return '';
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
    const defaultLabel = this.defaultLabel || (this.byId(this.defaultId) || { label: 'Yotsuba B' }).label;
    const def = document.createElement('option');
    def.value = 'default';
    def.textContent = boardDefault ? `Board default (${boardDefault.label})` : `Default (${defaultLabel})`;
    sel.appendChild(def);

    this.list.forEach((theme) => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.label;
      if (!theme.group) {
        sel.appendChild(option);
        return;
      }
      let group = sel.querySelector(`optgroup[data-group="${theme.group}"]`);
      if (!group) {
        group = document.createElement('optgroup');
        group.label = theme.group;
        group.dataset.group = theme.group;
        sel.appendChild(group);
      }
      group.appendChild(option);
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
