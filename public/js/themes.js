const siteThemeCfg = typeof window !== 'undefined' && window.siteThemeConfig ? window.siteThemeConfig : {};

const CUSTOM_THEME_PREFIX = 'custom:';
const CUSTOM_THEMES_KEY = 'koshiCustomThemes';
const CUSTOM_STYLE_ID = 'koshi-custom-theme-style';

function safeStorageGet(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {}
}

function safeStorageRemove(key) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {}
}

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
    const raw = String((typeof window !== 'undefined' && window.boardDefaultTheme) || '');
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

  getCustomThemes() {
    try {
      const raw = safeStorageGet(CUSTOM_THEMES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.id === 'string' && t.id) : [];
    } catch {
      return [];
    }
  },

  saveCustomThemes(list) {
    const cleaned = Array.isArray(list) ? list : [];
    safeStorageSet(CUSTOM_THEMES_KEY, JSON.stringify(cleaned));
    return cleaned;
  },

  getCustomTheme(customId) {
    const cleanId = String(customId || '').replace(/^custom:/, '');
    return this.getCustomThemes().find((t) => t.id === cleanId) || null;
  },

  sanitizeCssUrl(rawUrl) {
    const url = String(rawUrl || '').trim();
    if (!url) return '';
    if (/[\r\n"'()<>\\;]/g.test(url)) return '';
    if (/^\s*(javascript|vbscript):/i.test(url)) return '';
    if (/^(https?:\/\/|\/|data:image\/)/i.test(url)) return url;
    return '';
  },

  sanitizeCssValue(val) {
    const str = String(val || '').trim();
    if (!str || /[\r\n{};<>]/.test(str)) return '';
    return str;
  },

  buildCustomThemeCss(themeObj) {
    if (!themeObj || typeof themeObj !== 'object') return '';
    const vars = themeObj.vars && typeof themeObj.vars === 'object' ? themeObj.vars : {};
    const decls = [];
    Object.keys(vars).forEach((prop) => {
      if (!/^--[a-z0-9-]+$/i.test(prop)) return;
      const val = this.sanitizeCssValue(vars[prop]);
      if (val) decls.push(`  ${prop}: ${val};`);
    });

    const blocks = [];
    if (decls.length) {
      blocks.push(`:root {\n${decls.join('\n')}\n}`);
    }

    const bgUrl = this.sanitizeCssUrl(themeObj.bgImage);
    if (bgUrl) {
      const repeat = ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'].includes(themeObj.bgRepeat) ? themeObj.bgRepeat : 'no-repeat';
      const size = ['auto', 'cover', 'contain'].includes(themeObj.bgSize) ? themeObj.bgSize : 'cover';
      const pos = ['center center', 'bottom right', 'bottom left', 'top center', 'top right', 'top left'].includes(themeObj.bgPosition)
        ? themeObj.bgPosition
        : 'center center';
      const att = themeObj.bgFixed === false ? 'scroll' : 'fixed';
      blocks.push(
        `body {\n  background-image: url("${bgUrl}") !important;\n  background-repeat: ${repeat} !important;\n  background-size: ${size} !important;\n  background-position: ${pos} !important;\n  background-attachment: ${att} !important;\n}`
      );
    }

    if (typeof themeObj.customCss === 'string' && themeObj.customCss.trim()) {
      blocks.push(themeObj.customCss);
    }

    return blocks.join('\n\n');
  },

  applyCustomTheme(themeObj) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById(CUSTOM_STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = CUSTOM_STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = this.buildCustomThemeCss(themeObj);
  },

  clearCustomTheme() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(CUSTOM_STYLE_ID);
    if (el) el.textContent = '';
  },

  saved() {
    const raw = String(safeStorageGet('selectedTheme') || '');
    if (!raw) return '';
    if (raw.startsWith(CUSTOM_THEME_PREFIX)) {
      const ct = this.getCustomTheme(raw.slice(CUSTOM_THEME_PREFIX.length));
      return ct ? raw : '';
    }
    if (this.ids().indexOf(raw) !== -1) return raw;
    const id = raw.replace(/^vichan\//, '');
    if (id && id !== raw && this.ids().indexOf(id) !== -1) {
      safeStorageSet('selectedTheme', id);
      return id;
    }
    return '';
  },

  apply(id) {
    const link = typeof document !== 'undefined' ? document.getElementById('theme-css') : null;
    if (typeof id === 'string' && id.startsWith(CUSTOM_THEME_PREFIX)) {
      const ct = this.getCustomTheme(id.slice(CUSTOM_THEME_PREFIX.length));
      if (ct) {
        if (link) link.href = this.href(ct.baseTheme || this.boardDefaultId() || this.defaultId);
        this.applyCustomTheme(ct);
        this.syncSelectorValue(id);
        this.emitChange(id);
        return;
      }
    }
    this.clearCustomTheme();
    if (link) link.href = this.href(id);
    this.syncSelectorValue(id || 'default');
    this.emitChange(id || '');
  },

  emitChange(id) {
    if (typeof document === 'undefined' || typeof document.dispatchEvent !== 'function') return;
    try {
      document.dispatchEvent(new CustomEvent('koshiThemeChanged', { detail: { id } }));
    } catch {}
  },

  select(id) {
    if (!id || id === 'default') {
      safeStorageRemove('selectedTheme');
      const boardDef = this.boardDefaultId();
      this.apply(boardDef);
      return boardDef;
    }
    safeStorageSet('selectedTheme', id);
    this.apply(id);
    return id;
  },

  syncSelectorValue(val) {
    if (typeof document === 'undefined') return;
    const sel = document.getElementById('themeSelector');
    if (!sel) return;
    const target = val && Array.from(sel.options || []).some((o) => o.value === val) ? val : 'default';
    sel.value = target;
  },

  rebuildSelector() {
    if (typeof document === 'undefined') return;
    const sel = document.getElementById('themeSelector');
    if (!sel) return;
    sel.innerHTML = '';

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

    const customList = this.getCustomThemes();
    if (customList.length) {
      const customGroup = document.createElement('optgroup');
      customGroup.label = 'Custom Themes';
      customGroup.dataset.group = 'Custom Themes';
      customList.forEach((ct) => {
        const option = document.createElement('option');
        option.value = `${CUSTOM_THEME_PREFIX}${ct.id}`;
        option.textContent = ct.name || ct.id;
        customGroup.appendChild(option);
      });
      sel.appendChild(customGroup);
    }

    const saved = this.saved();
    sel.value = saved || 'default';
  },

  init() {
    if (typeof document === 'undefined') return;
    const tools = document.querySelector('.footer-nav-tools');
    if (!tools || document.getElementById('themeSelector')) return;

    const sel = document.createElement('select');
    sel.id = 'themeSelector';
    tools.insertBefore(sel, tools.firstChild);

    this.rebuildSelector();

    const saved = this.saved();
    if (!saved && safeStorageGet('selectedTheme')) {
      safeStorageRemove('selectedTheme');
      this.apply(this.boardDefaultId());
    }

    sel.addEventListener('change', () => {
      this.select(sel.value);
    });
  }
};

const savedTheme = themes.saved();
themes.apply(savedTheme || themes.boardDefaultId());

if (typeof window !== 'undefined') window.themes = themes;
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => themes.init());
  } else {
    themes.init();
  }
}
