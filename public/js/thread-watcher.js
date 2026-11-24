const watchedThreads = {
  init() {
    const pathMatch = location.pathname.match(/^\/([^/]+)\/thread\/(\d+)/);
    this.isInThread = !!pathMatch;
    this.pageBoard = pathMatch ? pathMatch[1] : null;
    this.pageThread = pathMatch ? pathMatch[2] : null;
    this.watcherAlertCounter = 0;
    this.showingWatched = false;

    document.querySelectorAll('.watch-list-btn').forEach((btn) => {
      if (!btn.querySelector('.watcher-counter')) {
        const counter = document.createElement('span');
        counter.className = 'watcher-counter';
        btn.appendChild(counter);
      }
    });

    document.querySelectorAll('.op').forEach((op) => this.processOP(op));

    this.bindEvents();
    this.createWatchList();
    this.xchan.init();

    const stored = this.getStoredWatchedData();
    if (this.isInThread && stored[this.pageBoard] && stored[this.pageBoard][this.pageThread]) {
      stored[this.pageBoard][this.pageThread].lastSeen = Date.now();
      stored[this.pageBoard][this.pageThread].unreadCount = 0;
      this.saveWatchedData(stored);
    }

    this.updateWatchListDisplay();
    this.updateWatcherCounter();
    this.scheduleWatchedThreadsCheck();

    try {
      if (localStorage.getItem('watchListOpen') === 'true') {
        this.showWatchList();
      }
    } catch (e) {}
  },

  placeWatchList() {
    const modal = document.querySelector('.watch-list-modal');
    if (!modal) return;
    const inline = window.matchMedia('(max-width: 768px)').matches;
    modal.classList.toggle('watch-list-inline', inline);
    if (!inline) {
      if (modal.parentNode !== document.body) document.body.appendChild(modal);
      return;
    }
    const banner = document.getElementById('banner-container');
    if (banner) {
      banner.after(modal);
    } else {
      const content = document.querySelector('main.content') || document.body;
      content.prepend(modal);
    }
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const heart = e.target.closest('.watch-thread-toggle');
      if (!heart) return;
      e.preventDefault();
      this.toggleThreadWatch(heart);
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.watch-list-btn')) {
        e.preventDefault();
        if (this.showingWatched) {
          this.closeWatchList();
        } else {
          this.showWatchList();
        }
      }
    });

    window.matchMedia('(max-width: 768px)').addEventListener('change', () => this.placeWatchList());
  },

  processOP(op) {
    if (op.querySelector('.watch-thread-toggle')) return;

    const info = op.querySelector('.post-info');
    if (!info) return;
    if (info.querySelector('.watch-thread-link')) {
      this.xchan.observeToggler(info.querySelector('.watch-thread-link'));
      return;
    }

    const board = op.dataset.board;
    const thread = String(op.dataset.threadId || op.dataset.postId || '');
    if (!board || !thread) return;

    const checkBox = info.querySelector('.post-checkbox, .mod-select');
    info.insertBefore(this.makeWatchButton(board, thread), checkBox || info.firstElementChild);
  },

  makeWatchButton(board, thread) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'watch-thread-toggle';
    this.setWatchButtonLabel(button, this.isWatched(board, thread));
    return button;
  },

  setWatchButtonLabel(button, watched) {
    button.classList.toggle('watch-thread-on', watched);
    button.classList.toggle('watch-thread-off', !watched);
    button.title = watched ? 'Unwatch Thread' : 'Watch Thread';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', watched ? 'true' : 'false');
  },

  threadSelector(board, thread) {
    return (
      `.op[data-board="${board}"][data-post-id="${thread}"], .op[data-board="${board}"][data-thread-id="${thread}"], ` +
      `.catalog-thread[data-board="${board}"][data-thread-id="${thread}"]`
    );
  },

  threadElementsFor(board, thread) {
    return document.querySelectorAll(this.threadSelector(board, thread));
  },

  isWatched(board, thread) {
    const stored = this.getStoredWatchedData();
    return this.isWatchedStored(stored, board, thread);
  },

  isWatchedStored(stored, board, thread) {
    return !!(stored[board] && stored[board][thread]);
  },

  importWatched(stored, board, thread, label) {
    const now = Date.now();
    if (!stored[board]) stored[board] = {};
    stored[board][thread] = {
      lastSeen: now,
      lastReplied: now,
      label: label || null,
      unreadCount: 0
    };
  },

  toggleThreadWatch(heartIcon) {
    const threadElement = heartIcon.closest('.op, .catalog-thread');
    if (!threadElement) return;

    const threadId = String(threadElement.dataset.postId || threadElement.dataset.threadId);
    const boardUri = threadElement.dataset.board || location.pathname.split('/')[1];

    if (heartIcon.classList.contains('watch-thread-off')) {
      const subject = threadElement.querySelector('.subject, .thread-subject')?.textContent?.trim();
      const message = threadElement
        .querySelector('.thread-content, .reply-content, .message, .thread-text')
        ?.textContent?.trim();
      this.addThreadToWatch(threadId, boardUri, subject, message);
    } else {
      this.removeThreadFromWatch(threadId, boardUri);
    }
  },

  makeLabel(title, text) {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

    const cleanTitle = clean(title);
    if (cleanTitle && cleanTitle !== 'No subject') return cleanTitle.substring(0, 50);

    const cleanText = clean(text);
    if (!cleanText) return '';
    return cleanText.length > 15 ? `${cleanText.substring(0, 15)}...` : cleanText;
  },

  threadLabel(op, subject, message) {
    if (op) {
      const title = op.querySelector('.subject, .thread-subject')?.textContent;
      const text =
        op.querySelector('.thread-content, .reply-content, .message, .thread-text')?.textContent ||
        op.querySelector('.divMessage')?.textContent;
      return this.makeLabel(title, text);
    }
    return this.makeLabel(subject, message);
  },

  addThreadToWatch(threadId, boardUri, subject, message) {
    threadId = String(threadId);
    const stored = this.getStoredWatchedData();
    const boardThreads = stored[boardUri] || {};
    if (boardThreads[threadId]) return;

    const op = this.threadElementsFor(boardUri, threadId)[0] || null;
    const now = Date.now();
    boardThreads[threadId] = {
      lastSeen: now,
      lastReplied: now,
      label: this.threadLabel(op, subject, message) || null,
      unreadCount: 0
    };
    stored[boardUri] = boardThreads;
    this.saveWatchedData(stored);
    this.setWatchButtonState(boardUri, threadId, true);
    this.updateWatchListDisplay();
    this.xchan.addToUserscript(boardUri, threadId);
  },

  removeThreadFromWatch(threadId, boardUri) {
    threadId = String(threadId);
    const stored = this.getStoredWatchedData();
    if (stored[boardUri]) {
      delete stored[boardUri][threadId];
      if (!Object.keys(stored[boardUri]).length) delete stored[boardUri];
      this.saveWatchedData(stored);
    }
    this.setWatchButtonState(boardUri, threadId, false);
    this.updateWatchListDisplay();
    this.updateWatcherCounter();
    this.xchan.removeFromUserscript(boardUri, threadId);
  },

  setWatchButtonState(boardUri, threadId, watched) {
    this.threadElementsFor(boardUri, threadId).forEach((threadElement) => {
      threadElement.querySelectorAll('.watch-thread-toggle').forEach((heart) => {
        this.setWatchButtonLabel(heart, watched);
      });
    });
  },

  refreshHearts(stored) {
    stored = stored || this.getStoredWatchedData();
    document.querySelectorAll('.watch-thread-toggle').forEach((heart) => {
      const threadElement = heart.closest('.op, .catalog-thread');
      if (!threadElement) return;
      const board = threadElement.dataset.board;
      const thread = String(threadElement.dataset.threadId || threadElement.dataset.postId || '');
      if (!board || !thread) return;
      this.setWatchButtonLabel(heart, this.isWatchedStored(stored, board, thread));
    });
  },

  migrateOldWatchedThreads() {
    let old;
    try {
      old = JSON.parse(localStorage.getItem('watchedThreads') || '{}');
    } catch (e) {
      return {};
    }
    const migrated = {};
    Object.values(old).forEach((thread) => {
      if (!thread || !thread.boardUri || thread.threadId == null) return;
      const board = thread.boardUri;
      const id = String(thread.threadId);
      migrated[board] = migrated[board] || {};
      migrated[board][id] = {
        lastSeen: thread.unreadCount > 0 ? 0 : Date.now(),
        lastReplied: Date.now(),
        label: (thread.subject || thread.message || '').substring(0, 50).trim() || null,
        unreadCount: thread.unreadCount || 0
      };
    });
    return migrated;
  },

  getStoredWatchedData() {
    try {
      if (localStorage.watchedData) return JSON.parse(localStorage.watchedData);
    } catch (e) {}
    const migrated = this.migrateOldWatchedThreads();
    if (Object.keys(migrated).length) this.saveWatchedData(migrated);
    return migrated;
  },

  saveWatchedData(data) {
    try {
      localStorage.watchedData = JSON.stringify(data);
    } catch (e) {
      console.error('Could not save watched threads:', e);
    }
  },

  updateWatcherCounter() {
    const text = this.watcherAlertCounter ? ` (${this.watcherAlertCounter})` : '';
    document.querySelectorAll('.watcher-counter').forEach((el) => {
      el.textContent = text;
    });
  },

  createWatchList() {
    if (document.querySelector('.watch-list-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'watch-list-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="watch-list-content">
        <div class="watch-list-header">
          Watched Threads
          <button type="button" class="close-watch-list" title="Close" aria-label="Close">&times;</button>
        </div>
        <div class="watch-list-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    this.placeWatchList();

    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-watch')) {
        this.removeThreadFromWatch(e.target.dataset.thread, e.target.dataset.board);
      }
    });

    const titleBar = modal.querySelector('.watch-list-header');
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    const setTranslate = (xPos, yPos) => {
      modal.style.transform = `translate(${xPos}px, ${yPos}px)`;
    };

    const savePosition = (xPos, yPos) => {
      try {
        localStorage.setItem('watchListPosition', JSON.stringify({ x: xPos, y: yPos }));
      } catch (e) {}
    };

    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('close-watch-list')) return;
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY);
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      savePosition(xOffset, yOffset);
    });

    modal.querySelector('.close-watch-list').addEventListener('click', () => {
      savePosition(xOffset, yOffset);
      this.closeWatchList();
    });

    try {
      const savedPosition = JSON.parse(localStorage.getItem('watchListPosition') || '{"x":0,"y":0}');
      setTranslate(savedPosition.x, savedPosition.y);
      xOffset = savedPosition.x;
      yOffset = savedPosition.y;
    } catch (e) {}
  },

  showWatchList() {
    const modal = document.querySelector('.watch-list-modal');
    if (!modal || this.showingWatched) return;
    this.showingWatched = true;
    this.updateWatchListDisplay();
    modal.style.display = 'block';

    try {
      localStorage.setItem('watchListOpen', 'true');
    } catch (e) {}
  },

  closeWatchList() {
    const modal = document.querySelector('.watch-list-modal');
    if (modal) modal.style.display = 'none';
    this.showingWatched = false;

    try {
      localStorage.setItem('watchListOpen', 'false');
    } catch (e) {}
  },

  watchListEntries() {
    const stored = this.getStoredWatchedData();
    const entries = [];
    Object.keys(stored).forEach((board) => {
      Object.keys(stored[board]).forEach((thread) => {
        entries.push({ board, thread, data: stored[board][thread] });
      });
    });
    return entries;
  },

  updateWatchListDisplay() {
    const watchListBody = document.querySelector('.watch-list-body');
    if (!watchListBody) return;

    const stored = this.getStoredWatchedData();
    const entries = [];
    Object.keys(stored).forEach((board) => {
      Object.keys(stored[board]).forEach((thread) => {
        entries.push({ board, thread, data: stored[board][thread] });
      });
    });

    watchListBody.textContent = '';
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'no-watched-threads';
      empty.textContent = 'No watched threads';
      watchListBody.appendChild(empty);
      return;
    }

    let labelAdded = false;
    entries.forEach(({ board, thread, data }) => {
      const op = this.threadElementsFor(board, thread)[0] || null;
      const derived = op ? this.threadLabel(op) : '';
      if (derived && derived !== data.label) {
        data.label = derived;
        labelAdded = true;
      }

      let label = data.label && data.label !== 'No subject' ? data.label : null;
      label = label || `${board}/${thread}`;
      const unread = data.unreadCount > 0 || data.lastSeen < data.lastReplied;
      const item = document.createElement('div');
      item.className = 'watch-list-item';

      const link = document.createElement('a');
      link.href = `/${encodeURIComponent(board)}/thread/${encodeURIComponent(thread)}`;
      link.textContent = `/${board}/ - ${label}`;
      if (unread) {
        const span = document.createElement('span');
        span.className = 'unread-count';
        span.textContent = `[${data.unreadCount}]`;
        link.appendChild(document.createTextNode(' '));
        link.appendChild(span);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'remove-watch';
      btn.title = 'Unwatch';
      btn.setAttribute('aria-label', `Unwatch /${board}/ - ${label}`);
      btn.dataset.board = board;
      btn.dataset.thread = thread;
      btn.textContent = '×';

      item.appendChild(link);
      item.appendChild(btn);
      watchListBody.appendChild(item);
    });

    if (labelAdded) this.saveWatchedData(stored);
  },

  autoWatchThread(threadId, boardUri, subject, message) {
    if (localStorage.getItem('disableAutoWatch') === 'true') return;
    this.addThreadToWatch(threadId, boardUri, subject, message);
  },

  scheduleWatchedThreadsCheck() {
    if (this.watchTimer) clearTimeout(this.watchTimer);
    const lastCheck = localStorage.lastWatchCheck;
    if (!lastCheck) {
      this.runWatchedThreadsCheck();
      return;
    }
    const next = new Date(+lastCheck);
    next.setUTCSeconds(next.getUTCSeconds() + 10);
    const delay = Math.max(1000, next.getTime() - Date.now());
    this.watchTimer = setTimeout(() => this.runWatchedThreadsCheck(), delay);
  },

  runWatchedThreadsCheck() {
    if (document.hidden) {
      if (this.watchTimer) clearTimeout(this.watchTimer);
      this.watchTimer = setTimeout(() => this.runWatchedThreadsCheck(), 10000);
      return;
    }
    this.watcherAlertCounter = 0;
    localStorage.lastWatchCheck = Date.now();

    const stored = this.getStoredWatchedData();
    const urls = [];

    Object.keys(stored).forEach((board) => {
      Object.keys(stored[board]).forEach((thread) => {
        if (this.isInThread && board === this.pageBoard && thread === this.pageThread) {
          stored[board][thread].lastSeen = Date.now();
          stored[board][thread].unreadCount = 0;
          this.saveWatchedData(stored);
        }
        urls.push({ board, thread });
      });
    });

    this.iterateWatchedThreads(urls);
  },

  iterateWatchedThreads(urls, index) {
    index = index || 0;
    if (index >= urls.length) {
      this.updateWatcherCounter();
      this.updateWatchListDisplay();
      this.scheduleWatchedThreadsCheck();
      return;
    }

    const url = urls[index];
    fetch(`/${url.board}/thread/${url.thread}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('missing');
        return r.text();
      })
      .then((data) => this.processThread(urls, index, data))
      .catch(() => this.iterateWatchedThreads(urls, index + 1));
  },

  processThread(urls, index, raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      this.iterateWatchedThreads(urls, index + 1);
      return;
    }

    const url = urls[index];
    const posts = data.posts || [];
    const stored = this.getStoredWatchedData();
    if (!stored[url.board] || !stored[url.board][url.thread]) {
      this.iterateWatchedThreads(urls, index + 1);
      return;
    }

    const watchData = stored[url.board][url.thread];
    const lastPost = posts.length ? posts[posts.length - 1] : data.thread;
    const parsedCreation = new Date(lastPost && (lastPost.creation || lastPost.lastBump));

    if (!isNaN(parsedCreation.getTime()) && parsedCreation.getTime() > watchData.lastReplied) {
      watchData.lastReplied = parsedCreation.getTime();
    }

    if (this.isInThread && url.board === this.pageBoard && url.thread === this.pageThread) {
      watchData.lastSeen = Date.now();
      watchData.unreadCount = 0;
    } else {
      watchData.unreadCount = posts.filter((p) => new Date(p.creation).getTime() > watchData.lastSeen).length;
    }

    if (watchData.lastSeen >= watchData.lastReplied) {
      watchData.unreadCount = 0;
    } else {
      this.watcherAlertCounter++;
      if (!watchData.unreadCount) watchData.unreadCount = 1;
    }

    this.saveWatchedData(stored);
    this.iterateWatchedThreads(urls, index + 1);
  },

  xchan: {
    enabled: false,
    dialog: null,
    list: null,
    suppressUntil: 0,
    attachObserver: null,
    listObserver: null,
    scanObserver: null,
    scanTimer: null,
    reconcileTimer: null,
    togglers: null,

    init() {
      if (localStorage.getItem('disableXchanSync') === 'true') return;
      this.togglers = new WeakSet();
      this.attach();
      if (this.enabled) return;
      this.attachObserver = new MutationObserver(() => this.attach());
      this.attachObserver.observe(document.documentElement, { childList: true, subtree: true });
    },

    attach() {
      if (this.enabled) return;
      const dialog = document.getElementById('thread-watcher');
      if (!dialog) return;
      const list = dialog.querySelector('#watched-threads');
      if (!list) return;

      this.enabled = true;
      this.dialog = dialog;
      this.list = list;
      if (this.attachObserver) {
        this.attachObserver.disconnect();
        this.attachObserver = null;
      }

      this.listObserver = new MutationObserver(() => this.scheduleReconcile());
      this.listObserver.observe(dialog, { childList: true, subtree: true });

      this.scan();
      this.syncHearts();
      this.reconcile();
    },

    scan() {
      if (this.scanObserver) return;
      this.scanObserver = new MutationObserver(() => {
        if (this.scanTimer) return;
        this.scanTimer = setTimeout(() => {
          this.scanTimer = null;
          this.syncHearts();
        }, 250);
      });
      this.scanObserver.observe(document.body, { childList: true, subtree: true });
    },

    syncHearts() {
      document.querySelectorAll('.watch-thread-toggle').forEach((heart) => {
        const info = heart.parentElement;
        if (!info) return;
        if (info.querySelector('.watch-thread-link')) heart.remove();
      });
      const togglers = document.querySelectorAll('.watch-thread-link');
      togglers.forEach((toggler) => this.observeToggler(toggler));
      if (togglers.length) this.scheduleReconcile();
    },

    observeToggler(toggler) {
      if (!toggler || !this.togglers || this.togglers.has(toggler)) return;
      this.togglers.add(toggler);
      new MutationObserver(() => this.scheduleReconcile()).observe(toggler, {
        attributes: true,
        attributeFilter: ['class']
      });
    },

    scheduleReconcile() {
      if (this.reconcileTimer) return;
      this.reconcileTimer = setTimeout(() => {
        this.reconcileTimer = null;
        this.reconcile();
      }, 300);
    },

    quiet(ms) {
      this.suppressUntil = Date.now() + (ms || 800);
    },

    fullIdOf(row) {
      return row.dataset.fullID || row.getAttribute('data-full-i-d') || row.getAttribute('data-full-id') || '';
    },

    listedThreads() {
      const entries = [];
      if (!this.list) return entries;
      this.list.querySelectorAll('div[data-full-i-d], div[data-full-id]').forEach((row) => {
        const link = row.querySelector('a.watcher-link');
        if (!link) return;
        let url;
        try {
          url = new URL(link.getAttribute('href'), location.href);
        } catch (e) {
          return;
        }
        if (url.origin !== location.origin) return;
        const match = /^(.+)\.(\d+)$/.exec(this.fullIdOf(row));
        if (!match) return;
        const title = row.querySelector('.watcher-title');
        entries.push({
          board: match[1],
          thread: match[2],
          label: title && title.textContent ? title.textContent.trim() : null
        });
      });
      return entries;
    },

    reconcile() {
      if (!this.enabled) return;
      if (Date.now() < this.suppressUntil) {
        this.scheduleReconcile();
        return;
      }

      const stored = watchedThreads.getStoredWatchedData();
      const listed = new Set();
      let changed = false;

      this.listedThreads().forEach((entry) => {
        listed.add(`${entry.board}.${entry.thread}`);
        if (watchedThreads.isWatchedStored(stored, entry.board, entry.thread)) return;
        watchedThreads.importWatched(stored, entry.board, entry.thread, entry.label);
        changed = true;
      });

      document.querySelectorAll('.watch-thread-link').forEach((toggler) => {
        const op = toggler.closest('.op');
        if (!op) return;
        const board = op.dataset.board;
        const thread = String(op.dataset.threadId || op.dataset.postId || '');
        if (!board || !thread) return;
        const fullId = `${board}.${thread}`;
        if (listed.has(fullId)) return;
        if (toggler.classList.contains('watched')) {
          if (watchedThreads.isWatchedStored(stored, board, thread)) return;
          watchedThreads.importWatched(stored, board, thread, null);
          changed = true;
        } else if (watchedThreads.isWatchedStored(stored, board, thread)) {
          delete stored[board][thread];
          if (!Object.keys(stored[board]).length) delete stored[board];
          changed = true;
        }
      });

      if (!changed) return;
      watchedThreads.saveWatchedData(stored);
      watchedThreads.updateWatchListDisplay();
      watchedThreads.updateWatcherCounter();
      watchedThreads.refreshHearts(stored);
    },

    rowFor(board, thread) {
      if (!this.list) return null;
      const fullId = `${board}.${thread}`;
      const rows = this.list.querySelectorAll('div[data-full-i-d], div[data-full-id]');
      for (const row of rows) {
        if (this.fullIdOf(row) === fullId) return row;
      }
      return null;
    },

    togglerFor(board, thread) {
      const op = document.querySelector(
        `.op[data-board="${board}"][data-post-id="${thread}"], .op[data-board="${board}"][data-thread-id="${thread}"]`
      );
      return op ? op.querySelector('.watch-thread-link') : null;
    },

    addToUserscript(board, thread) {
      if (!this.enabled) return;
      if (this.rowFor(board, thread)) return;
      const toggler = this.togglerFor(board, thread);
      if (toggler && !toggler.classList.contains('watched')) {
        this.quiet();
        toggler.click();
        return;
      }
      this.request('xt-watch-thread', board, thread);
    },

    removeFromUserscript(board, thread) {
      if (!this.enabled) return;
      this.quiet();
      const row = this.rowFor(board, thread);
      const removeLink = row ? row.querySelector('a') : null;
      if (removeLink && !removeLink.classList.contains('watcher-link')) {
        removeLink.click();
        return;
      }
      const toggler = this.togglerFor(board, thread);
      if (toggler && toggler.classList.contains('watched')) {
        toggler.click();
        return;
      }
      this.request('xt-unwatch-thread', board, thread);
    },

    request(type, board, thread) {
      document.dispatchEvent(new CustomEvent(type, { detail: `${board}.${thread}` }));
    }
  }
};

document.addEventListener('DOMContentLoaded', () => watchedThreads.init());