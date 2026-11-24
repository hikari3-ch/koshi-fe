(function () {
  const STYLE_OPTIONS_KEY = 'koshiStyleOptions';
  const MASCOT_PREFS_KEY = 'koshiMascotPrefs';
  const EXTRA_STYLE_ID = 'koshi-oneechan-style';

  const STYLE_OPTION_DEFS = [
    // Show / Hide Elements
    { key: 'hideBanner', group: 'elements', label: 'Hide board banner', desc: 'Hide the top banner image above boards', bodyClass: 'oc-hide-banner', defaultValue: false },
    { key: 'hideRotatingBanner', group: 'elements', label: 'Hide rotating promo banner', desc: 'Hide the rotating banner below the post form', bodyClass: 'oc-hide-rotating-banner', defaultValue: false },
    { key: 'hideAnnouncement', group: 'elements', label: 'Hide announcement', desc: 'Hide the global announcement notice', bodyClass: 'oc-hide-announcement', defaultValue: false },
    { key: 'hidePostForm', group: 'elements', label: 'Collapse post form by default', desc: 'Show a toggle button instead of the full post form', bodyClass: 'oc-hide-post-form', defaultValue: false },
    { key: 'hideCheckboxes', group: 'elements', label: 'Hide post checkboxes', desc: 'Hide selection checkboxes next to post headers', bodyClass: 'oc-hide-checkboxes', defaultValue: false },
    { key: 'hideSideArrows', group: 'elements', label: 'Hide >> reply arrows', desc: 'Hide the decorative >> arrows to the left of replies', bodyClass: 'oc-hide-side-arrows', defaultValue: false },
    { key: 'hideFileInfo', group: 'elements', label: 'Hide file info line', desc: 'Hide filenames and dimensions above thumbnails', bodyClass: 'oc-hide-file-info', defaultValue: false },
    { key: 'hideFlags', group: 'elements', label: 'Hide post flags', desc: 'Hide country and custom board flags on posts', bodyClass: 'oc-hide-flags', defaultValue: false },
    { key: 'hideBacklinks', group: 'elements', label: 'Hide backlinks', desc: 'Hide >>reply backlink lists below post headers', bodyClass: 'oc-hide-backlinks', defaultValue: false },
    { key: 'hideSubjects', group: 'elements', label: 'Hide post subjects', desc: 'Hide thread and post subject titles', bodyClass: 'oc-hide-subjects', defaultValue: false },
    { key: 'hideAgree', group: 'elements', label: 'Hide Agree buttons', desc: 'Hide [+]/agree counters beside post numbers', bodyClass: 'oc-hide-agree', defaultValue: false },
    { key: 'hideNavArrows', group: 'elements', label: 'Hide thread jump arrows', desc: 'Hide the up/down arrows on OP posts', bodyClass: 'oc-hide-nav-arrows', defaultValue: false },
    { key: 'hideDeleteForm', group: 'elements', label: 'Hide bottom delete form', desc: 'Hide the post deletion bar at the bottom of boards', bodyClass: 'oc-hide-delete-form', defaultValue: false },
    { key: 'hideFooterText', group: 'elements', label: 'Hide footer disclaimer', desc: 'Hide the legal disclaimer text in the page footer', bodyClass: 'oc-hide-footer-text', defaultValue: false },

    // Highlight Elements
    { key: 'highlightOp', group: 'highlights', label: 'Highlight OP posts', desc: 'Add an accent tint and left bar to thread OPs', bodyClass: 'oc-highlight-op', defaultValue: false },
    { key: 'highlightYou', group: 'highlights', label: 'Highlight your (You) posts', desc: 'Mark your own posts with a distinct side border', bodyClass: 'oc-highlight-you', defaultValue: true },
    { key: 'highlightQuotesToYou', group: 'highlights', label: 'Highlight replies quoting (You)', desc: 'Tint posts that quote one of your posts', bodyClass: 'oc-highlight-quotes-you', defaultValue: true },
    { key: 'highlightCapcodes', group: 'highlights', label: 'Highlight staff capcodes', desc: 'Accent posts made with a Mod/Admin capcode', bodyClass: 'oc-highlight-capcodes', defaultValue: false },
    { key: 'highlightHover', group: 'highlights', label: 'Highlight hovered replies', desc: 'Tint reply boxes when moving the mouse over them', bodyClass: 'oc-highlight-hover', defaultValue: false },
    { key: 'highlightSubject', group: 'highlights', label: 'Underline subjects', desc: 'Underline thread and post subjects for visibility', bodyClass: 'oc-highlight-subject', defaultValue: false },

    // Layout & Typography
    { key: 'fixedHeader', group: 'layout', label: 'Sticky top board bar', desc: 'Keep the top board navigation pinned while scrolling', bodyClass: 'oc-fixed-header', defaultValue: false },
    { key: 'centerPosts', group: 'layout', label: 'Center page content', desc: 'Constrain and center the main thread column', bodyClass: 'oc-center-posts', defaultValue: false },
    { key: 'roundedCorners', group: 'layout', label: 'Rounded boxes', desc: 'Soften reply boxes, containers, and dialogs', bodyClass: 'oc-rounded', defaultValue: false },
    { key: 'flatBorders', group: 'layout', label: 'Full 4-sided reply borders', desc: 'Draw complete borders around reply boxes', bodyClass: 'oc-flat-borders', defaultValue: false },
    { key: 'compactPosts', group: 'layout', label: 'Compact post spacing', desc: 'Reduce margins inside replies and threads', bodyClass: 'oc-compact-posts', defaultValue: false },
    { key: 'fullWidthReplies', group: 'layout', label: 'Full-width replies', desc: 'Stretch reply boxes to fill the column width', bodyClass: 'oc-full-width-replies', defaultValue: false },
    { key: 'riceCheckboxes', group: 'layout', label: 'Theme-accent checkboxes', desc: 'Tint native checkboxes with your theme link color', bodyClass: 'oc-rice-checkboxes', defaultValue: true },
    { key: 'customScrollbars', group: 'layout', label: 'Custom slim scrollbars', desc: 'Use thin theme-colored scrollbars in Chromium/WebKit', bodyClass: 'oc-custom-scrollbars', defaultValue: false }
  ];

  const THEME_VAR_DEFS = [
    { key: '--background-color', label: 'Page Background', defaultVal: '#eef2ff' },
    { key: '--background-gradient', label: 'Top Gradient', defaultVal: '#d6daf0' },
    { key: '--header-highlight', label: 'Header Highlight', defaultVal: '#9988ee' },
    { key: '--board-title-color', label: 'Board Title', defaultVal: '#af0a0f' },
    { key: '--post-color', label: 'Reply Background', defaultVal: '#d6daf0' },
    { key: '--text-color', label: 'Post Text', defaultVal: '#000000' },
    { key: '--border-color', label: 'Border Primary', defaultVal: '#aaaaaa' },
    { key: '--border-alt', label: 'Border Alt / HR', defaultVal: '#b7c5d9' },
    { key: '--marked-color', label: 'Highlighted Reply', defaultVal: '#d6bad0' },
    { key: '--marked-border-color', label: 'Highlight Border', defaultVal: '#ba9dbf' },
    { key: '--link-color', label: 'Link Color', defaultVal: '#34345c' },
    { key: '--hover-link-color', label: 'Link Hover', defaultVal: '#dd0000' },
    { key: '--name-color', label: 'Poster Name', defaultVal: '#117743' },
    { key: '--subject-color', label: 'Subject Color', defaultVal: '#0f0c5d' },
    { key: '--file-info-color', label: 'File Info Text', defaultVal: '#34345c' },
    { key: '--input', label: 'Input Background', defaultVal: '#ffffff' },
    { key: '--button-background', label: 'Button Background', defaultVal: '#d6daf0' },
    { key: '--small-button', label: 'Small Button', defaultVal: '#d1d5ee' },
    { key: '--quote-color', label: 'Greentext (>quote)', defaultVal: '#789922' }
  ];

  const FONT_CHOICES = [
    { value: '', label: 'Theme / Browser Default' },
    { value: 'Arial, Helvetica, sans-serif', label: 'Arial / Helvetica' },
    { value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", label: 'Segoe UI / Sans' },
    { value: "Verdana, Geneva, sans-serif", label: 'Verdana' },
    { value: "'MS PGothic', 'IPAMonaPGothic', sans-serif", label: 'MS PGothic (Shift_JIS art)' },
    { value: "Georgia, 'Times New Roman', serif", label: 'Georgia Serif' },
    { value: "'Courier New', Courier, monospace", label: 'Monospace' }
  ];

  const DEFAULT_STYLE_OPTIONS = STYLE_OPTION_DEFS.reduce(
    (acc, def) => {
      acc[def.key] = def.defaultValue;
      return acc;
    },
    { fontFamily: '', fontSizePt: 10, replyOpacity: 1, contentWidthPx: 1080 }
  );

  const DEFAULT_MASCOT_PREFS = {
    mode: 'default', // 'default' | 'specific' | 'random' | 'off'
    selectedId: '',
    position: 'default', // 'default' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    scale: 100,
    opacity: 100,
    clickToCycle: true,
    hideOnCatalog: false,
    hideOnMobile: true,
    behindPosts: false,
    fadeOnHover: true,
    customMascots: []
  };

  function safeJsonParse(raw, fallback) {
    try {
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function safeStorageGet(key) {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, val) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
    } catch {}
  }

  function sanitizeHex(value, fallback = '#000000') {
    const str = String(value || '').trim();
    if (/^#[0-9a-f]{3}$/i.test(str)) {
      return '#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3];
    }
    if (/^#[0-9a-f]{6}$/i.test(str)) return str.toLowerCase();
    return fallback;
  }

  function sanitizeMascotUrl(rawUrl) {
    const url = String(rawUrl || '').trim();
    if (!url || /[\r\n"'<>]/.test(url)) return '';
    if (/^(https?:\/\/|\/mascots\/|\/img\/|data:image\/(?:png|jpeg|jpg|gif|webp);base64,)/i.test(url)) return url;
    return '';
  }

  function getPalette(themeObj) {
    return (themeObj && themeObj.palette && typeof themeObj.palette === 'object' ? themeObj.palette : {}) || {};
  }

  const oneechan = {
    STYLE_OPTION_DEFS,
    THEME_VAR_DEFS,
    FONT_CHOICES,
    activeTab: 'themes',
    modal: null,
    editingThemeId: null,
    previewTimer: null,
    sessionRandomId: null,
    sessionLastMascotId: null,

    getStyleOptions() {
      const saved = safeJsonParse(safeStorageGet(STYLE_OPTIONS_KEY), {});
      return { ...DEFAULT_STYLE_OPTIONS, ...(Array.isArray(saved) ? {} : saved) };
    },

    saveStyleOptions(opts) {
      const merged = { ...DEFAULT_STYLE_OPTIONS, ...(opts || {}) };
      safeStorageSet(STYLE_OPTIONS_KEY, JSON.stringify(merged));
      return merged;
    },

    getMascotPrefs() {
      const saved = safeJsonParse(safeStorageGet(MASCOT_PREFS_KEY), {});
      const prefs = { ...DEFAULT_MASCOT_PREFS, ...(Array.isArray(saved) ? {} : saved) };
      prefs.customMascots = Array.isArray(prefs.customMascots)
        ? prefs.customMascots.filter((m) => m && m.id && sanitizeMascotUrl(m.url))
        : [];
      return prefs;
    },

    saveMascotPrefs(prefs) {
      const merged = { ...DEFAULT_MASCOT_PREFS, ...(prefs || {}) };
      safeStorageSet(MASCOT_PREFS_KEY, JSON.stringify(merged));
      return merged;
    },

    getCustomThemes() {
      return window.themes?.getCustomThemes ? window.themes.getCustomThemes() : [];
    },

    saveCustomThemes(list) {
      return window.themes?.saveCustomThemes ? window.themes.saveCustomThemes(list) : list;
    },

    buildStyleOptionsCss(opts) {
      const rules = [];
      if (opts.fontFamily) {
        const cleanFont = String(opts.fontFamily).replace(/[;{}</>]/g, '');
        if (cleanFont) {
          rules.push(`body { font-family: ${cleanFont} !important; }`);
        }
      }
      const pt = Number(opts.fontSizePt);
      if (Number.isFinite(pt) && pt >= 8 && pt <= 14 && pt !== 10) {
        rules.push(`body { font-size: ${pt}pt !important; }`);
      }
      const opacity = Number(opts.replyOpacity);
      if (Number.isFinite(opacity) && opacity >= 0.4 && opacity < 1) {
        rules.push(`.reply { opacity: ${opacity}; } .reply:hover { opacity: 1; }`);
      }
      const widthPx = Number(opts.contentWidthPx);
      if (Number.isFinite(widthPx) && widthPx >= 640 && widthPx <= 1800) {
        rules.push(`:root { --oc-content-width: ${Math.round(widthPx)}px; }`);
      }
      if (opts.hidePostForm) {
        rules.push(`body.oc-hide-post-form #post-form-container:not(.oc-form-expanded) { display: none !important; }`);
      }
      return rules.join('\n');
    },

    applyStyleOptions(optsInput) {
      const opts = optsInput || this.getStyleOptions();
      if (typeof document === 'undefined' || !document.body) return opts;

      STYLE_OPTION_DEFS.forEach((def) => {
        document.body.classList.toggle(def.bodyClass, Boolean(opts[def.key]));
      });

      let styleEl = document.getElementById(EXTRA_STYLE_ID);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = EXTRA_STYLE_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = this.buildStyleOptionsCss(opts);

      this.syncPostFormToggle(Boolean(opts.hidePostForm));
      this.annotatePosts(opts);
      return opts;
    },

    syncPostFormToggle(collapsed) {
      if (typeof document === 'undefined') return;
      const formContainer = document.getElementById('post-form-container');
      if (!formContainer) return;

      let wrap = document.getElementById('oc-post-form-toggle-wrap');
      if (!collapsed) {
        formContainer.classList.remove('oc-form-collapsed', 'oc-form-expanded');
        if (wrap) wrap.style.display = 'none';
        return;
      }

      if (!formContainer.classList.contains('oc-form-expanded')) {
        formContainer.classList.add('oc-form-collapsed');
      }

      if (!wrap && formContainer.parentNode) {
        wrap = document.createElement('div');
        wrap.id = 'oc-post-form-toggle-wrap';
        wrap.className = 'oc-post-form-toggle-wrap';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'oc-post-form-toggle-btn';
        btn.textContent = 'Start a New Thread / Reply';
        btn.addEventListener('click', () => {
          const isOpen = formContainer.classList.toggle('oc-form-expanded');
          formContainer.classList.toggle('oc-form-collapsed', !isOpen);
          btn.textContent = isOpen ? 'Hide Post Form' : 'Start a New Thread / Reply';
        });
        wrap.appendChild(btn);
        formContainer.parentNode.insertBefore(wrap, formContainer);
      } else if (wrap) {
        wrap.style.display = '';
      }
    },

    annotatePosts(optsInput) {
      if (typeof document === 'undefined') return;
      const opts = optsInput || this.getStyleOptions();
      const posts = document.querySelectorAll('.post');
      posts.forEach((post) => {
        const isYou = Boolean(post.querySelector('.you, .youName'));
        const quotesYou = Boolean(post.querySelector('.quoteYou') || Array.from(post.querySelectorAll('a')).some((a) => /\(You\)/.test(a.textContent || '')));
        const hasCapcode = Boolean(post.querySelector('[data-capcode], .capcode-label'));

        post.classList.toggle('oc-post-you', Boolean(opts.highlightYou && isYou));
        post.classList.toggle('oc-post-quotes-you', Boolean(opts.highlightQuotesToYou && quotesYou));
        post.classList.toggle('oc-post-capcode', Boolean(opts.highlightCapcodes && hasCapcode));
      });
    },

    getAvailableMascots() {
      const serverCfg = (typeof window !== 'undefined' && window.koshiMascotConfig) || {};
      const serverMascots = Array.isArray(serverCfg.mascots)
        ? serverCfg.mascots.map((m) => ({ ...m, source: 'site' }))
        : [];
      const prefs = this.getMascotPrefs();
      const customMascots = (prefs.customMascots || []).map((m) => ({
        id: m.id,
        name: m.name || 'Custom Mascot',
        url: m.url,
        position: m.position || 'bottom-right',
        width: Number(m.width) || 220,
        opacity: Number(m.opacity) || 0.9,
        offsetX: 12,
        offsetY: 0,
        flip: false,
        source: 'personal'
      }));
      return [...serverMascots, ...customMascots];
    },

    resolveActiveMascot() {
      const serverCfg = (typeof window !== 'undefined' && window.koshiMascotConfig) || {};
      const prefs = this.getMascotPrefs();
      const all = this.getAvailableMascots();
      if (!all.length || prefs.mode === 'off') return null;

      let chosen = null;
      if (prefs.mode === 'specific' && prefs.selectedId) {
        chosen = all.find((m) => m.id === prefs.selectedId) || null;
      } else if (prefs.mode === 'random') {
        if (!this.sessionRandomId || !all.some((m) => m.id === this.sessionRandomId)) {
          this.sessionRandomId = all[Math.floor(Math.random() * all.length)].id;
        }
        chosen = all.find((m) => m.id === this.sessionRandomId) || null;
      } else {
        const defId = serverCfg.defaultMascotId || '';
        if (defId === 'random') {
          if (!this.sessionRandomId || !all.some((m) => m.id === this.sessionRandomId)) {
            this.sessionRandomId = all[Math.floor(Math.random() * all.length)].id;
          }
          chosen = all.find((m) => m.id === this.sessionRandomId) || null;
        } else if (defId) {
          chosen = all.find((m) => m.id === defId) || null;
        }
      }

      if (!chosen) return null;
      this.sessionLastMascotId = chosen.id;
      return { chosen, prefs };
    },

    isCatalogOrModPage() {
      if (typeof window === 'undefined' || !window.location) return false;
      const p = String(window.location.pathname || '');
      return {
        isMod: p === '/mod' || p.startsWith('/mod/'),
        isCatalog: /\/catalog(?:\.html)?$/.test(p)
      };
    },

    renderMascot() {
      if (typeof document === 'undefined' || !document.body) return;
      const pageFlags = this.isCatalogOrModPage();
      let container = document.getElementById('koshi-mascot-container');

      if (pageFlags.isMod) {
        if (container) container.remove();
        return;
      }

      const resolved = this.resolveActiveMascot();
      const prefs = this.getMascotPrefs();
      document.body.classList.toggle('oc-mascot-hide-mobile', prefs.hideOnMobile !== false);

      if (!resolved || (prefs.hideOnCatalog && pageFlags.isCatalog)) {
        if (container) container.remove();
        return;
      }

      const { chosen } = resolved;
      const safeUrl = sanitizeMascotUrl(chosen.url);
      if (!safeUrl) {
        if (container) container.remove();
        return;
      }

      if (!container) {
        container = document.createElement('div');
        container.id = 'koshi-mascot-container';
        const img = document.createElement('img');
        img.id = 'koshi-mascot-img';
        container.appendChild(img);
        container.addEventListener('click', () => {
          const curPrefs = this.getMascotPrefs();
          if (curPrefs.clickToCycle) this.cycleMascot();
        });
        document.body.appendChild(container);
      }

      const imgEl = document.getElementById('koshi-mascot-img');
      imgEl.src = safeUrl;
      imgEl.alt = chosen.name || 'Mascot';
      imgEl.title = chosen.name + (prefs.clickToCycle ? ' (click to cycle mascot)' : '');

      const pos = prefs.position && prefs.position !== 'default' ? prefs.position : chosen.position || 'bottom-right';
      container.className = `mascot-pos-${pos}`;
      if (prefs.behindPosts) container.classList.add('mascot-behind-posts');
      if (prefs.fadeOnHover !== false) container.classList.add('mascot-fade-hover');
      if (prefs.clickToCycle) container.classList.add('mascot-clickable');

      const widthPx = Math.round((Number(chosen.width) || 220) * ((Number(prefs.scale) || 100) / 100));
      const baseOpacity = Number(chosen.opacity) || 0.9;
      const effOpacity = Math.max(0.05, Math.min(1, baseOpacity * ((Number(prefs.opacity) || 100) / 100)));

      imgEl.style.width = `${widthPx}px`;
      imgEl.style.transform = chosen.flip ? 'scaleX(-1)' : '';
      container.style.opacity = String(effOpacity);

      // Apply offsets relative to selected corner
      container.style.left = '';
      container.style.right = '';
      container.style.top = '';
      container.style.bottom = '';
      const ox = `${Number(chosen.offsetX) || 0}px`;
      const oy = `${Number(chosen.offsetY) || 0}px`;
      if (pos.includes('right')) container.style.right = ox;
      else container.style.left = ox;
      if (pos.includes('top')) container.style.top = `${Math.max(24, Number(chosen.offsetY) || 28)}px`;
      else container.style.bottom = oy;
    },

    cycleMascot() {
      const all = this.getAvailableMascots();
      if (all.length < 2) return;
      const currentId = this.sessionLastMascotId || this.getMascotPrefs().selectedId;
      const idx = all.findIndex((m) => m.id === currentId);
      const next = all[(idx + 1) % all.length];
      const prefs = this.getMascotPrefs();
      prefs.mode = 'specific';
      prefs.selectedId = next.id;
      this.saveMascotPrefs(prefs);
      this.renderMascot();
      if (this.modal && this.modal.classList.contains('oc-open')) {
        this.renderMascotsTab();
      }
    },

    currentSelectedThemeId() {
      return window.themes?.saved() || 'default';
    },

    applyThemeSelection(id) {
      if (!window.themes) return;
      window.themes.select(id);
      if (this.modal && this.modal.classList.contains('oc-open')) {
        this.renderThemesTab();
      }
    },

    createModal() {
      if (this.modal || typeof document === 'undefined' || !document.body) return;

      const modal = document.createElement('div');
      modal.id = 'style-modal';

      const content = document.createElement('div');
      content.className = 'style-modal-content';

      const header = document.createElement('div');
      header.className = 'style-modal-header';
      const title = document.createElement('span');
      title.className = 'style-modal-title';
      title.textContent = 'Style & Appearance (OneeChan)';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'style-modal-close';
      closeBtn.textContent = '×';
      closeBtn.title = 'Close';
      closeBtn.addEventListener('click', () => this.hide());
      header.append(title, closeBtn);

      const tabsBar = document.createElement('div');
      tabsBar.className = 'style-modal-tabs';
      const tabs = [
        { id: 'themes', label: 'Themes' },
        { id: 'options', label: 'Style Options' },
        { id: 'mascots', label: 'Mascots' },
        { id: 'editor', label: 'Custom Theme Editor' }
      ];
      tabs.forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'style-tab-btn';
        btn.dataset.tab = t.id;
        btn.textContent = t.label;
        btn.addEventListener('click', () => this.setTab(t.id));
        tabsBar.appendChild(btn);
      });

      const body = document.createElement('div');
      body.className = 'style-modal-body';
      tabs.forEach((t) => {
        const panel = document.createElement('div');
        panel.className = 'style-tab-panel';
        panel.id = `style-panel-${t.id}`;
        panel.dataset.tab = t.id;
        body.appendChild(panel);
      });

      const footer = document.createElement('div');
      footer.className = 'style-modal-footer';

      const leftGroup = document.createElement('div');
      leftGroup.className = 'style-footer-group';
      const exportBtn = document.createElement('button');
      exportBtn.type = 'button';
      exportBtn.textContent = 'Export Style JSON';
      exportBtn.addEventListener('click', () => this.exportAllSettings());

      const importBtn = document.createElement('button');
      importBtn.type = 'button';
      importBtn.textContent = 'Import Style JSON';
      importBtn.addEventListener('click', () => this.promptImportAllSettings());

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.textContent = 'Reset All Defaults';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all style checkboxes, mascot preferences, and theme selection?')) {
          this.resetAll();
        }
      });
      leftGroup.append(exportBtn, importBtn, resetBtn);

      const rightGroup = document.createElement('div');
      rightGroup.className = 'style-footer-group';
      const doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.textContent = 'Close';
      doneBtn.addEventListener('click', () => this.hide());
      rightGroup.appendChild(doneBtn);

      footer.append(leftGroup, rightGroup);
      content.append(header, tabsBar, body, footer);
      modal.appendChild(content);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.hide();
      });

      document.body.appendChild(modal);
      this.modal = modal;
    },

    setTab(tabId) {
      this.activeTab = tabId || 'themes';
      if (!this.modal) return;
      this.modal.querySelectorAll('.style-tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
      });
      this.modal.querySelectorAll('.style-tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.tab === this.activeTab);
      });

      if (this.activeTab === 'themes') this.renderThemesTab();
      else if (this.activeTab === 'options') this.renderOptionsTab();
      else if (this.activeTab === 'mascots') this.renderMascotsTab();
      else if (this.activeTab === 'editor') this.renderEditorTab();
    },

    show(tabId) {
      this.createModal();
      this.modal.classList.add('oc-open');
      this.setTab(tabId || this.activeTab);
    },

    hide() {
      if (this.modal) this.modal.classList.remove('oc-open');
    },

    buildThemePreviewCard({ id, label, group, palette, isCustom, customThemeObj, activeId }) {
      const p = palette || {};
      const bg = p['--background-color'] || '#eef2ff';
      const grad = p['--background-gradient'] || bg;
      const postBg = p['--post-color'] || '#d6daf0';
      const textCol = p['--text-color'] || '#000';
      const borderCol = p['--border-alt'] || p['--border-color'] || '#b7c5d9';
      const titleCol = p['--board-title-color'] || p['--subject-color'] || textCol;
      const nameCol = p['--name-color'] || '#117743';
      const subCol = p['--subject-color'] || titleCol;
      const linkCol = p['--link-color'] || '#34345c';

      const card = document.createElement('div');
      card.className = 'theme-preview-card' + (id === activeId ? ' active' : '');
      card.addEventListener('click', () => this.applyThemeSelection(id));

      const stage = document.createElement('div');
      stage.className = 'theme-preview-stage';
      stage.style.backgroundColor = bg;
      stage.style.backgroundImage = `linear-gradient(to bottom, ${grad} 0%, ${bg} 80%)`;
      stage.style.color = textCol;

      const stageTitle = document.createElement('div');
      stageTitle.className = 'theme-preview-title';
      stageTitle.style.color = titleCol;
      stageTitle.textContent = `/${group || 'Site'}/ - ${label}`;

      const replyBox = document.createElement('div');
      replyBox.className = 'theme-preview-reply';
      replyBox.style.background = postBg;
      replyBox.style.borderColor = borderCol;
      replyBox.style.color = textCol;

      const subjSpan = document.createElement('span');
      subjSpan.style.color = subCol;
      subjSpan.style.fontWeight = 'bold';
      subjSpan.textContent = 'Subject ';

      const nameSpan = document.createElement('span');
      nameSpan.style.color = nameCol;
      nameSpan.style.fontWeight = 'bold';
      nameSpan.textContent = 'Anonymous';

      const lineBreak = document.createElement('div');
      const quoteSpan = document.createElement('span');
      quoteSpan.style.color = p['--quote-color'] || '#789922';
      quoteSpan.textContent = '>mfw clean UI ';
      const linkSpan = document.createElement('span');
      linkSpan.style.color = linkCol;
      linkSpan.style.textDecoration = 'underline';
      linkSpan.textContent = '>>12345';
      lineBreak.append(quoteSpan, linkSpan);

      replyBox.append(subjSpan, nameSpan, lineBreak);
      stage.append(stageTitle, replyBox);

      const swatches = document.createElement('div');
      swatches.className = 'theme-preview-swatches';
      [bg, grad, postBg, textCol, nameCol, linkCol, titleCol].forEach((c) => {
        const sw = document.createElement('div');
        sw.className = 'theme-preview-swatch';
        sw.style.backgroundColor = c;
        swatches.appendChild(sw);
      });

      const meta = document.createElement('div');
      meta.className = 'theme-preview-meta';
      const nameEl = document.createElement('span');
      nameEl.className = 'theme-preview-name';
      nameEl.textContent = label + (id === activeId ? ' ✓' : '');

      const actions = document.createElement('div');
      actions.className = 'theme-preview-actions';

      if (id !== 'default') {
        const cloneBtn = document.createElement('button');
        cloneBtn.type = 'button';
        cloneBtn.textContent = isCustom ? 'Edit' : 'Clone';
        cloneBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isCustom && customThemeObj) {
            this.editingThemeId = customThemeObj.id;
            this.setTab('editor');
          } else {
            this.cloneIntoEditor({ id, label, palette: p });
          }
        });
        actions.appendChild(cloneBtn);
      }

      meta.append(nameEl, actions);
      card.append(stage, swatches, meta);
      return card;
    },

    renderThemesTab() {
      const panel = document.getElementById('style-panel-themes');
      if (!panel) return;
      panel.innerHTML = '';

      const builtInList = (window.themes && window.themes.list) || [];
      const customList = this.getCustomThemes();
      const activeId = this.currentSelectedThemeId();

      const groups = ['All'];
      builtInList.forEach((t) => {
        const g = t.group || 'Site';
        if (!groups.includes(g)) groups.push(g);
      });
      if (customList.length) groups.push('Custom');

      let activeGroup = this._themeFilterGroup || 'All';
      if (!groups.includes(activeGroup)) activeGroup = 'All';

      const toolbar = document.createElement('div');
      toolbar.className = 'style-themes-toolbar';

      const search = document.createElement('input');
      search.type = 'text';
      search.className = 'style-theme-search';
      search.placeholder = 'Search themes...';
      search.value = this._themeSearch || '';

      const pillsWrap = document.createElement('div');
      pillsWrap.className = 'style-group-pills';

      const grid = document.createElement('div');
      grid.className = 'style-themes-grid';

      const drawGrid = () => {
        grid.innerHTML = '';
        const q = String(this._themeSearch || '').trim().toLowerCase();
        const grp = this._themeFilterGroup || 'All';

        // Board/Site default card
        const boardDefId = window.themes ? window.themes.boardDefaultId() : '';
        const defaultTargetId = boardDefId || (window.themes ? window.themes.defaultId : 'yotsuba-b');
        const defaultThemeObj = (window.themes && window.themes.byId(defaultTargetId)) || { label: 'Default', palette: {} };
        if (!q && (grp === 'All' || grp === (defaultThemeObj.group || 'Site'))) {
          grid.appendChild(
            this.buildThemePreviewCard({
              id: 'default',
              label: boardDefId ? `Board Default (${defaultThemeObj.label})` : `Site Default (${defaultThemeObj.label})`,
              group: 'default',
              palette: getPalette(defaultThemeObj),
              activeId
            })
          );
        }

        if (grp === 'All' || grp === 'Custom') {
          customList.forEach((ct) => {
            const label = ct.name || ct.id;
            if (q && !label.toLowerCase().includes(q)) return;
            grid.appendChild(
              this.buildThemePreviewCard({
                id: 'custom:' + ct.id,
                label,
                group: 'Custom',
                palette: ct.vars || {},
                isCustom: true,
                customThemeObj: ct,
                activeId
              })
            );
          });
        }

        builtInList.forEach((t) => {
          const g = t.group || 'Site';
          if (grp !== 'All' && g !== grp) return;
          if (q && !t.label.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return;
          grid.appendChild(
            this.buildThemePreviewCard({
              id: t.id,
              label: t.label,
              group: g,
              palette: getPalette(t),
              isCustom: false,
              activeId
            })
          );
        });
      };

      groups.forEach((g) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'style-group-pill' + (g === activeGroup ? ' active' : '');
        pill.textContent = g;
        pill.addEventListener('click', () => {
          this._themeFilterGroup = g;
          pillsWrap.querySelectorAll('.style-group-pill').forEach((p) => p.classList.toggle('active', p.textContent === g));
          drawGrid();
        });
        pillsWrap.appendChild(pill);
      });

      search.addEventListener('input', () => {
        this._themeSearch = search.value;
        drawGrid();
      });

      toolbar.append(search, pillsWrap);
      panel.append(toolbar, grid);
      drawGrid();
    },

    renderOptionsTab() {
      const panel = document.getElementById('style-panel-options');
      if (!panel) return;
      panel.innerHTML = '';

      const opts = this.getStyleOptions();
      const cols = document.createElement('div');
      cols.className = 'style-options-columns';

      const sections = [
        { group: 'elements', title: 'Show / Hide Elements' },
        { group: 'highlights', title: 'Highlight Elements' },
        { group: 'layout', title: 'Layout & Typography' }
      ];

      sections.forEach((sec) => {
        const box = document.createElement('div');
        box.className = 'style-options-box';
        const h3 = document.createElement('h3');
        h3.textContent = sec.title;
        box.appendChild(h3);

        STYLE_OPTION_DEFS.filter((d) => d.group === sec.group).forEach((def) => {
          const row = document.createElement('label');
          row.className = 'style-check-row';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = Boolean(opts[def.key]);
          cb.addEventListener('change', () => {
            const next = this.getStyleOptions();
            next[def.key] = cb.checked;
            this.saveStyleOptions(next);
            this.applyStyleOptions(next);
          });

          const textWrap = document.createElement('span');
          textWrap.className = 'style-check-text';
          const nameSpan = document.createElement('span');
          nameSpan.className = 'style-check-label';
          nameSpan.textContent = def.label;
          const descSpan = document.createElement('span');
          descSpan.className = 'style-check-desc';
          descSpan.textContent = def.desc;
          textWrap.append(nameSpan, descSpan);

          row.append(cb, textWrap);
          box.appendChild(row);
        });

        if (sec.group === 'layout') {
          // Font Family selector
          const fontRow = document.createElement('div');
          fontRow.className = 'style-range-row';
          const fontLabel = document.createElement('label');
          fontLabel.textContent = 'Font Family';
          const fontSel = document.createElement('select');
          FONT_CHOICES.forEach((fc) => {
            const opt = document.createElement('option');
            opt.value = fc.value;
            opt.textContent = fc.label;
            fontSel.appendChild(opt);
          });
          fontSel.value = opts.fontFamily || '';
          fontSel.addEventListener('change', () => {
            const next = this.getStyleOptions();
            next.fontFamily = fontSel.value;
            this.saveStyleOptions(next);
            this.applyStyleOptions(next);
          });
          fontRow.append(fontLabel, fontSel);
          box.appendChild(fontRow);

          // Font size slider
          const makeSlider = (labelText, key, min, max, step, unit) => {
            const row = document.createElement('div');
            row.className = 'style-range-row';
            const lbl = document.createElement('label');
            const nameS = document.createElement('span');
            nameS.textContent = labelText;
            const valS = document.createElement('span');
            valS.textContent = `${opts[key]}${unit}`;
            lbl.append(nameS, valS);

            const range = document.createElement('input');
            range.type = 'range';
            range.min = String(min);
            range.max = String(max);
            range.step = String(step);
            range.value = String(opts[key]);
            range.addEventListener('input', () => {
              valS.textContent = `${range.value}${unit}`;
              const next = this.getStyleOptions();
              next[key] = Number(range.value);
              this.saveStyleOptions(next);
              this.applyStyleOptions(next);
            });
            row.append(lbl, range);
            return row;
          };

          box.append(
            makeSlider('Font Size', 'fontSizePt', 8, 14, 0.5, 'pt'),
            makeSlider('Reply Opacity', 'replyOpacity', 0.5, 1, 0.05, ''),
            makeSlider('Centered Max Width', 'contentWidthPx', 720, 1600, 40, 'px')
          );
        }

        cols.appendChild(box);
      });

      panel.appendChild(cols);
    },

    renderMascotsTab() {
      const panel = document.getElementById('style-panel-mascots');
      if (!panel) return;
      panel.innerHTML = '';

      const serverCfg = (typeof window !== 'undefined' && window.koshiMascotConfig) || {};
      const prefs = this.getMascotPrefs();
      const allMascots = this.getAvailableMascots();

      const bar = document.createElement('div');
      bar.className = 'mascot-prefs-bar';

      // Mode & Position Column
      const col1 = document.createElement('div');
      const modeLbl = document.createElement('label');
      modeLbl.textContent = 'Mascot Mode: ';
      const modeSel = document.createElement('select');
      [
        { value: 'default', label: serverCfg.defaultMascotId ? 'Board / Site Default' : 'Default (None)' },
        { value: 'specific', label: 'Selected Mascot' },
        { value: 'random', label: 'Random Per Page Load' },
        { value: 'off', label: 'Disabled (Off)' }
      ].forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        modeSel.appendChild(opt);
      });
      modeSel.value = prefs.mode;
      modeSel.addEventListener('change', () => {
        const next = this.getMascotPrefs();
        next.mode = modeSel.value;
        this.saveMascotPrefs(next);
        this.renderMascot();
      });
      modeLbl.appendChild(modeSel);

      const posLbl = document.createElement('label');
      posLbl.style.display = 'block';
      posLbl.style.marginTop = '6px';
      posLbl.textContent = 'Position Override: ';
      const posSel = document.createElement('select');
      [
        { value: 'default', label: 'Mascot Default' },
        { value: 'bottom-right', label: 'Bottom Right' },
        { value: 'bottom-left', label: 'Bottom Left' },
        { value: 'top-right', label: 'Top Right' },
        { value: 'top-left', label: 'Top Left' }
      ].forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        posSel.appendChild(opt);
      });
      posSel.value = prefs.position;
      posSel.addEventListener('change', () => {
        const next = this.getMascotPrefs();
        next.position = posSel.value;
        this.saveMascotPrefs(next);
        this.renderMascot();
      });
      posLbl.appendChild(posSel);
      col1.append(modeLbl, posLbl);

      // Sliders Column
      const col2 = document.createElement('div');
      const makeRange = (title, key, min, max, step, unit) => {
        const wrap = document.createElement('div');
        wrap.className = 'style-range-row';
        const lbl = document.createElement('label');
        const t = document.createElement('span');
        t.textContent = title;
        const v = document.createElement('span');
        v.textContent = `${prefs[key]}${unit}`;
        lbl.append(t, v);
        const inp = document.createElement('input');
        inp.type = 'range';
        inp.min = String(min);
        inp.max = String(max);
        inp.step = String(step);
        inp.value = String(prefs[key]);
        inp.addEventListener('input', () => {
          v.textContent = `${inp.value}${unit}`;
          const next = this.getMascotPrefs();
          next[key] = Number(inp.value);
          this.saveMascotPrefs(next);
          this.renderMascot();
        });
        wrap.append(lbl, inp);
        return wrap;
      };
      col2.append(makeRange('Mascot Size Scale', 'scale', 30, 200, 5, '%'), makeRange('Mascot Opacity', 'opacity', 10, 100, 5, '%'));

      // Checkboxes Column
      const col3 = document.createElement('div');
      [
        { key: 'clickToCycle', label: 'Click mascot to cycle' },
        { key: 'fadeOnHover', label: 'Fade mascot on mouse hover' },
        { key: 'behindPosts', label: 'Place behind posts (non-interactive)' },
        { key: 'hideOnCatalog', label: 'Hide on catalog pages' },
        { key: 'hideOnMobile', label: 'Hide on small screens (<768px)' }
      ].forEach((chk) => {
        const lbl = document.createElement('label');
        lbl.style.display = 'block';
        lbl.style.marginBottom = '4px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = Boolean(prefs[chk.key]);
        cb.addEventListener('change', () => {
          const next = this.getMascotPrefs();
          next[chk.key] = cb.checked;
          this.saveMascotPrefs(next);
          this.renderMascot();
        });
        lbl.append(cb, ' ' + chk.label);
        col3.appendChild(lbl);
      });

      bar.append(col1, col2, col3);
      panel.appendChild(bar);

      // Mascot Grid
      const grid = document.createElement('div');
      grid.className = 'mascot-picker-grid';
      if (!allMascots.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No mascots are currently defined. Admins can upload mascots in /mod/mascots, or you can add a personal mascot URL below.';
        panel.appendChild(empty);
      } else {
        allMascots.forEach((m) => {
          const card = document.createElement('div');
          const isSelected = prefs.mode === 'specific' && prefs.selectedId === m.id;
          card.className = 'mascot-pick-card' + (isSelected ? ' active' : '');

          const img = document.createElement('img');
          img.src = sanitizeMascotUrl(m.url) || '';
          img.alt = m.name;

          const name = document.createElement('div');
          name.className = 'mascot-pick-name';
          name.textContent = m.name;

          const badge = document.createElement('div');
          badge.className = 'mascot-pick-badge';
          const badgeParts = [];
          if (serverCfg.defaultMascotId === m.id) badgeParts.push('Default');
          if (m.source === 'personal') badgeParts.push('Personal');
          badge.textContent = badgeParts.join(' • ') || m.position;

          card.append(img, name, badge);

          if (m.source === 'personal') {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.textContent = 'Remove';
            delBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const next = this.getMascotPrefs();
              next.customMascots = next.customMascots.filter((cm) => cm.id !== m.id);
              if (next.selectedId === m.id) {
                next.selectedId = '';
                next.mode = 'default';
              }
              this.saveMascotPrefs(next);
              this.renderMascot();
              this.renderMascotsTab();
            });
            card.appendChild(delBtn);
          }

          card.addEventListener('click', () => {
            const next = this.getMascotPrefs();
            next.mode = 'specific';
            next.selectedId = m.id;
            this.saveMascotPrefs(next);
            this.renderMascot();
            this.renderMascotsTab();
          });
          grid.appendChild(card);
        });
        panel.appendChild(grid);
      }

      // Personal Custom Mascot Form
      const addBox = document.createElement('div');
      addBox.className = 'style-options-box';
      const h3 = document.createElement('h3');
      h3.textContent = 'Add Personal Mascot (Stored Locally)';
      const row = document.createElement('div');
      row.className = 'mascot-custom-add';

      const nameIn = document.createElement('input');
      nameIn.type = 'text';
      nameIn.placeholder = 'Mascot name';
      const urlIn = document.createElement('input');
      urlIn.type = 'url';
      urlIn.placeholder = 'https://... image URL';
      urlIn.style.flex = '1 1 240px';
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.textContent = 'Add Personal Mascot';
      addBtn.addEventListener('click', () => {
        const cleanUrl = sanitizeMascotUrl(urlIn.value);
        if (!cleanUrl) {
          alert('Enter a valid http(s):// or data:image/... URL.');
          return;
        }
        const next = this.getMascotPrefs();
        const id = 'pm_' + Date.now();
        next.customMascots.push({
          id,
          name: nameIn.value.trim() || 'Personal Mascot',
          url: cleanUrl,
          position: 'bottom-right',
          width: 220,
          opacity: 0.9
        });
        next.mode = 'specific';
        next.selectedId = id;
        this.saveMascotPrefs(next);
        this.renderMascot();
        this.renderMascotsTab();
      });
      row.append(nameIn, urlIn, addBtn);
      addBox.append(h3, row);
      panel.appendChild(addBox);
    },

    cloneIntoEditor(sourceTheme) {
      const palette = getPalette(sourceTheme);
      const vars = {};
      THEME_VAR_DEFS.forEach((def) => {
        vars[def.key] = sanitizeHex(palette[def.key] || def.defaultVal, def.defaultVal);
      });
      const draft = {
        id: 'ct_' + Date.now(),
        name: `${sourceTheme.label || sourceTheme.id} (Custom)`,
        baseTheme: sourceTheme.id && !String(sourceTheme.id).startsWith('custom:') ? sourceTheme.id : window.themes?.defaultId || 'yotsuba-b',
        vars,
        bgImage: '',
        bgRepeat: 'no-repeat',
        bgSize: 'cover',
        bgPosition: 'center center',
        bgFixed: true,
        customCss: ''
      };
      this.editorDraft = draft;
      this.editingThemeId = null;
      this.setTab('editor');
    },

    makeDefaultDraft(existing) {
      if (existing) {
        const vars = {};
        THEME_VAR_DEFS.forEach((def) => {
          vars[def.key] = sanitizeHex(existing.vars?.[def.key] || def.defaultVal, def.defaultVal);
        });
        return {
          ...existing,
          vars
        };
      }
      const vars = {};
      THEME_VAR_DEFS.forEach((def) => {
        vars[def.key] = def.defaultVal;
      });
      return {
        id: 'ct_' + Date.now(),
        name: 'My Custom Theme',
        baseTheme: window.themes?.defaultId || 'yotsuba-b',
        vars,
        bgImage: '',
        bgRepeat: 'no-repeat',
        bgSize: 'cover',
        bgPosition: 'center center',
        bgFixed: true,
        customCss: ''
      };
    },

    renderEditorTab() {
      const panel = document.getElementById('style-panel-editor');
      if (!panel) return;
      panel.innerHTML = '';

      const customList = this.getCustomThemes();
      const editingExisting = this.editingThemeId ? customList.find((t) => t.id === this.editingThemeId) : null;
      const draft = this.editorDraft && (!this.editingThemeId || this.editorDraft.id === this.editingThemeId)
        ? this.editorDraft
        : this.makeDefaultDraft(editingExisting);
      this.editorDraft = draft;

      // Saved Custom Themes Bar
      const savedBar = document.createElement('div');
      savedBar.className = 'custom-theme-saved-bar';
      const savedSel = document.createElement('select');
      const newOpt = document.createElement('option');
      newOpt.value = '';
      newOpt.textContent = '-- Create New Custom Theme --';
      savedSel.appendChild(newOpt);
      customList.forEach((ct) => {
        const opt = document.createElement('option');
        opt.value = ct.id;
        opt.textContent = ct.name || ct.id;
        if (this.editingThemeId === ct.id) opt.selected = true;
        savedSel.appendChild(opt);
      });
      savedSel.addEventListener('change', () => {
        this.editingThemeId = savedSel.value || null;
        this.editorDraft = null;
        this.renderEditorTab();
      });

      const cloneSel = document.createElement('select');
      const clonePlaceholder = document.createElement('option');
      clonePlaceholder.value = '';
      clonePlaceholder.textContent = 'Load colors from built-in...';
      cloneSel.appendChild(clonePlaceholder);
      ((window.themes && window.themes.list) || []).forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.label;
        cloneSel.appendChild(opt);
      });
      cloneSel.addEventListener('change', () => {
        const found = window.themes?.byId(cloneSel.value);
        if (found) this.cloneIntoEditor(found);
      });

      const importThemeBtn = document.createElement('button');
      importThemeBtn.type = 'button';
      importThemeBtn.textContent = 'Import Theme JSON';
      importThemeBtn.addEventListener('click', () => {
        const raw = prompt('Paste exported custom theme JSON:');
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object' || !parsed.vars) throw new Error('Invalid theme JSON');
          parsed.id = 'ct_' + Date.now();
          parsed.name = String(parsed.name || 'Imported Theme').slice(0, 48);
          this.editorDraft = this.makeDefaultDraft(parsed);
          this.editingThemeId = null;
          this.renderEditorTab();
        } catch (err) {
          alert('Could not import theme: ' + err.message);
        }
      });

      savedBar.append(savedSel, cloneSel, importThemeBtn);
      panel.appendChild(savedBar);

      // Name & Base Row
      const topFields = document.createElement('div');
      topFields.className = 'mascot-custom-add';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = draft.name;
      nameInput.placeholder = 'Theme Name';
      nameInput.maxLength = 48;
      nameInput.addEventListener('input', () => {
        draft.name = nameInput.value;
      });

      const baseSel = document.createElement('select');
      ((window.themes && window.themes.list) || []).forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `Base CSS: ${t.label}`;
        baseSel.appendChild(opt);
      });
      baseSel.value = draft.baseTheme || 'yotsuba-b';
      baseSel.addEventListener('change', () => {
        draft.baseTheme = baseSel.value;
      });
      topFields.append(document.createTextNode('Name: '), nameInput, document.createTextNode(' Structural Base: '), baseSel);
      panel.appendChild(topFields);

      // Editor + Live Preview Columns
      const layout = document.createElement('div');
      layout.className = 'custom-theme-editor-layout';

      const leftCol = document.createElement('div');
      const colorsGrid = document.createElement('div');
      colorsGrid.className = 'custom-theme-colors-grid';

      const rightCol = document.createElement('div');
      const liveTitle = document.createElement('strong');
      liveTitle.textContent = 'Live Theme Preview';
      const liveBox = document.createElement('div');
      liveBox.className = 'custom-theme-live-preview';

      const updateLivePreview = () => {
        const v = draft.vars;
        liveBox.style.backgroundColor = v['--background-color'];
        liveBox.style.backgroundImage = `linear-gradient(to bottom, ${v['--background-gradient']} 0%, ${v['--background-color']} 140px)`;
        liveBox.style.color = v['--text-color'];
        liveBox.style.borderColor = v['--border-color'];
        liveBox.innerHTML = '';

        const hdr = document.createElement('div');
        hdr.style.color = v['--board-title-color'];
        hdr.style.fontWeight = 'bold';
        hdr.style.fontSize = '1.2em';
        hdr.style.marginBottom = '8px';
        hdr.textContent = `/${draft.name || 'custom'}/ - Theme Preview`;

        const post = document.createElement('div');
        post.style.background = v['--post-color'];
        post.style.border = `1px solid ${v['--border-alt']}`;
        post.style.padding = '8px';
        post.style.marginBottom = '8px';

        const pSub = document.createElement('span');
        pSub.style.color = v['--subject-color'];
        pSub.style.fontWeight = 'bold';
        pSub.textContent = 'Thread Subject ';

        const pName = document.createElement('span');
        pName.style.color = v['--name-color'];
        pName.style.fontWeight = 'bold';
        pName.textContent = 'Anonymous ';

        const pLink = document.createElement('a');
        pLink.href = '#';
        pLink.style.color = v['--link-color'];
        pLink.textContent = 'No.123456';
        pLink.addEventListener('click', (e) => e.preventDefault());

        const pBody = document.createElement('div');
        pBody.style.marginTop = '5px';
        const pQuote = document.createElement('div');
        pQuote.style.color = v['--quote-color'];
        pQuote.textContent = '>be me creating custom themes';
        const pNorm = document.createElement('div');
        pNorm.textContent = 'Normal reply text looks like this.';
        pBody.append(pQuote, pNorm);

        post.append(pSub, pName, pLink, pBody);

        const marked = document.createElement('div');
        marked.style.background = v['--marked-color'];
        marked.style.border = `1px solid ${v['--marked-border-color']}`;
        marked.style.padding = '6px';
        marked.textContent = 'Highlighted / marked reply box';

        liveBox.append(hdr, post, marked);
      };

      THEME_VAR_DEFS.forEach((def) => {
        const field = document.createElement('div');
        field.className = 'custom-color-field';
        const lbl = document.createElement('span');
        lbl.textContent = def.label;
        const inputs = document.createElement('div');
        inputs.className = 'custom-color-inputs';

        const hex = sanitizeHex(draft.vars[def.key] || def.defaultVal, def.defaultVal);
        draft.vars[def.key] = hex;

        const picker = document.createElement('input');
        picker.type = 'color';
        picker.value = hex;

        const text = document.createElement('input');
        text.type = 'text';
        text.value = hex;
        text.maxLength = 7;

        picker.addEventListener('input', () => {
          text.value = picker.value;
          draft.vars[def.key] = picker.value;
          updateLivePreview();
        });
        text.addEventListener('input', () => {
          const clean = sanitizeHex(text.value, '');
          if (clean) {
            picker.value = clean;
            draft.vars[def.key] = clean;
            updateLivePreview();
          }
        });

        inputs.append(picker, text);
        field.append(lbl, inputs);
        colorsGrid.appendChild(field);
      });

      // Background image + custom CSS
      const bgRow = document.createElement('div');
      bgRow.className = 'mascot-custom-add';
      const bgUrlIn = document.createElement('input');
      bgUrlIn.type = 'text';
      bgUrlIn.placeholder = 'Background image URL (optional)';
      bgUrlIn.value = draft.bgImage || '';
      bgUrlIn.style.flex = '1 1 200px';
      bgUrlIn.addEventListener('input', () => {
        draft.bgImage = bgUrlIn.value.trim();
      });

      const bgSizeSel = document.createElement('select');
      ['cover', 'contain', 'auto'].forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = `Size: ${s}`;
        bgSizeSel.appendChild(opt);
      });
      bgSizeSel.value = draft.bgSize || 'cover';
      bgSizeSel.addEventListener('change', () => {
        draft.bgSize = bgSizeSel.value;
      });
      bgRow.append(bgUrlIn, bgSizeSel);

      const extraCssArea = document.createElement('textarea');
      extraCssArea.className = 'settings-code';
      extraCssArea.rows = 4;
      extraCssArea.placeholder = 'Optional custom CSS overrides for this theme...';
      extraCssArea.value = draft.customCss || '';
      extraCssArea.style.width = '100%';
      extraCssArea.style.marginTop = '8px';
      extraCssArea.addEventListener('input', () => {
        draft.customCss = extraCssArea.value;
      });

      leftCol.append(colorsGrid, bgRow, extraCssArea);

      // Action Buttons under Preview
      const editorActions = document.createElement('div');
      editorActions.className = 'style-footer-group';
      editorActions.style.marginTop = '8px';

      const saveApplyBtn = document.createElement('button');
      saveApplyBtn.type = 'button';
      saveApplyBtn.textContent = 'Save & Apply Theme';
      saveApplyBtn.addEventListener('click', () => {
        const list = this.getCustomThemes();
        const savedObj = {
          ...draft,
          name: String(draft.name || '').trim() || 'Custom Theme'
        };
        const idx = list.findIndex((t) => t.id === savedObj.id);
        if (idx !== -1) list[idx] = savedObj;
        else list.push(savedObj);
        this.saveCustomThemes(list);
        this.editingThemeId = savedObj.id;
        window.themes?.rebuildSelector();
        window.themes?.select('custom:' + savedObj.id);
        this.renderEditorTab();
      });

      const exportThemeBtn = document.createElement('button');
      exportThemeBtn.type = 'button';
      exportThemeBtn.textContent = 'Export Theme JSON';
      exportThemeBtn.addEventListener('click', () => {
        const json = JSON.stringify(draft, null, 2);
        prompt('Copy this custom theme JSON:', json);
      });

      editorActions.append(saveApplyBtn, exportThemeBtn);

      if (editingExisting) {
        const delThemeBtn = document.createElement('button');
        delThemeBtn.type = 'button';
        delThemeBtn.textContent = 'Delete Theme';
        delThemeBtn.addEventListener('click', () => {
          if (!confirm(`Delete custom theme "${editingExisting.name}"?`)) return;
          const next = this.getCustomThemes().filter((t) => t.id !== editingExisting.id);
          this.saveCustomThemes(next);
          if (safeStorageGet('selectedTheme') === 'custom:' + editingExisting.id) {
            window.themes?.select('default');
          }
          window.themes?.rebuildSelector();
          this.editingThemeId = null;
          this.editorDraft = null;
          this.renderEditorTab();
        });
        editorActions.appendChild(delThemeBtn);
      }

      rightCol.append(liveTitle, liveBox, editorActions);
      updateLivePreview();

      layout.append(leftCol, rightCol);
      panel.appendChild(layout);
    },

    exportAllSettings() {
      const bundle = {
        selectedTheme: safeStorageGet('selectedTheme') || '',
        styleOptions: this.getStyleOptions(),
        mascotPrefs: this.getMascotPrefs(),
        customThemes: this.getCustomThemes()
      };
      prompt('Copy your Koshi / OneeChan style backup JSON:', JSON.stringify(bundle, null, 2));
    },

    promptImportAllSettings() {
      const raw = prompt('Paste Koshi / OneeChan style backup JSON:');
      if (!raw) return;
      try {
        const bundle = JSON.parse(raw);
        if (!bundle || typeof bundle !== 'object') throw new Error('Invalid JSON object');
        if (bundle.styleOptions && typeof bundle.styleOptions === 'object') {
          this.saveStyleOptions(bundle.styleOptions);
          this.applyStyleOptions();
        }
        if (bundle.mascotPrefs && typeof bundle.mascotPrefs === 'object') {
          this.saveMascotPrefs(bundle.mascotPrefs);
          this.renderMascot();
        }
        if (Array.isArray(bundle.customThemes)) {
          this.saveCustomThemes(bundle.customThemes);
          window.themes?.rebuildSelector();
        }
        if (typeof bundle.selectedTheme === 'string' && bundle.selectedTheme) {
          window.themes?.select(bundle.selectedTheme);
        }
        this.setTab(this.activeTab);
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    },

    resetAll() {
      this.saveStyleOptions({ ...DEFAULT_STYLE_OPTIONS });
      this.saveMascotPrefs({ ...DEFAULT_MASCOT_PREFS });
      window.themes?.select('default');
      this.applyStyleOptions();
      this.renderMascot();
      this.setTab(this.activeTab);
    },

    init() {
      this.applyStyleOptions();
      this.renderMascot();

      if (typeof document !== 'undefined') {
        document.querySelectorAll('.style-btn').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.show();
          });
        });

        document.addEventListener('contentAdded', () => {
          this.annotatePosts();
        });

        document.addEventListener('koshiThemeChanged', () => {
          if (this.modal && this.modal.classList.contains('oc-open') && this.activeTab === 'themes') {
            this.renderThemesTab();
          }
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.modal && this.modal.classList.contains('oc-open')) {
            this.hide();
          }
        });
      }
    }
  };

  if (typeof window !== 'undefined') window.oneechan = oneechan;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => oneechan.init());
    } else {
      oneechan.init();
    }
  }
})();
