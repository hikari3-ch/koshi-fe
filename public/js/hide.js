(() => {
  let hiddenBoardsFallback = [];
  let initialized = false;

  const normalizeBoards = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    for (const item of list) {
      if (typeof item !== 'string') continue;
      const uri = item.trim();
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      out.push(uri);
    }
    return out;
  };

  const getHiddenBoards = () => {
    try {
      const raw = localStorage.getItem('hiddenBoards');
      if (!raw) return [...hiddenBoardsFallback];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...hiddenBoardsFallback];
      const normalized = normalizeBoards(parsed);
      hiddenBoardsFallback = normalized;
      return [...normalized];
    } catch {
      return [...hiddenBoardsFallback];
    }
  };

  const saveHiddenBoards = (boards) => {
    const normalized = normalizeBoards(boards);
    hiddenBoardsFallback = normalized;
    try {
      localStorage.setItem('hiddenBoards', JSON.stringify(normalized));
    } catch {}
    return [...normalized];
  };

  const setThreadHidden = (thread, hidden) => {
    if (!thread) return;
    const hr = thread.nextElementSibling;
    if (hidden) {
      thread.dataset.boardHidden = '1';
      thread.style.display = 'none';
      if (hr && hr.tagName === 'HR') {
        hr.dataset.boardHidden = '1';
        hr.style.display = 'none';
      }
    } else {
      if (thread.dataset.boardHidden === '1') {
        thread.style.display = '';
        delete thread.dataset.boardHidden;
      }
      if (hr && hr.tagName === 'HR' && hr.dataset.boardHidden === '1') {
        hr.style.display = '';
        delete hr.dataset.boardHidden;
      }
    }
  };

  const syncBoardVisibility = (hiddenBoards = getHiddenBoards()) => {
    const hiddenSet = new Set(normalizeBoards(hiddenBoards));
    document.querySelectorAll('.thread[data-board]').forEach((thread) => {
      setThreadHidden(thread, hiddenSet.has(thread.dataset.board));
    });
  };

  const renderHiddenBoardsList = () => {
    document.querySelectorAll('.hidden-boards-list').forEach((el) => el.remove());

    const hiddenBoards = getHiddenBoards();
    if (hiddenBoards.length === 0) return;

    const listContainer = document.createElement('div');
    listContainer.className = 'hidden-boards-list';
    listContainer.style.margin = '10px 0';
    listContainer.style.padding = '10px';
    listContainer.style.borderRadius = '4px';

    const title = document.createElement('div');
    title.textContent = 'Hidden Boards:';
    title.style.marginBottom = '5px';
    title.style.fontWeight = 'bold';
    listContainer.appendChild(title);

    hiddenBoards.forEach((board) => {
      const boardItem = document.createElement('div');
      boardItem.style.margin = '5px 0';

      const boardText = document.createElement('span');
      boardText.textContent = `/${board}/`;
      boardItem.appendChild(boardText);

      const unhideButton = document.createElement('button');
      unhideButton.type = 'button';
      unhideButton.className = 'unhide-board-btn';
      unhideButton.dataset.board = board;
      unhideButton.textContent = 'Unhide';
      unhideButton.style.marginLeft = '10px';
      unhideButton.style.padding = '2px 8px';
      unhideButton.style.fontSize = '12px';
      unhideButton.onclick = () => showBoard(board);
      boardItem.appendChild(unhideButton);

      listContainer.appendChild(boardItem);
    });

    const threadsEl = document.querySelector('.threads');
    if (threadsEl && threadsEl.parentNode) {
      threadsEl.parentNode.insertBefore(listContainer, threadsEl);
      return;
    }

    const nav = document.querySelector('.pagelist') || document.querySelector('.page-nav');
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(listContainer, nav.nextSibling);
      return;
    }

    const host = document.querySelector('main.content') || document.body;
    if (host) {
      if (typeof host.prepend === 'function') host.prepend(listContainer);
      else host.insertBefore(listContainer, host.firstChild || null);
    }
  };

  const hideBoard = (boardUri) => {
    const uri = typeof boardUri === 'string' ? boardUri.trim() : '';
    if (!uri) return;
    const current = getHiddenBoards();
    const next = current.includes(uri) ? current : saveHiddenBoards([...current, uri]);
    syncBoardVisibility(next);
    renderHiddenBoardsList();
  };

  const showBoard = (boardUri) => {
    const uri = typeof boardUri === 'string' ? boardUri.trim() : '';
    if (!uri) return;
    const next = saveHiddenBoards(getHiddenBoards().filter((b) => b !== uri));
    syncBoardVisibility(next);
    renderHiddenBoardsList();
  };

  const initializeHiddenBoards = () => {
    const hiddenBoards = getHiddenBoards();
    const hasBoardH = Boolean(document.querySelector('.thread[data-board="h"]'));
    if (hiddenBoards.includes('h') && !hasBoardH) {
      saveHiddenBoards(hiddenBoards.filter((b) => b !== 'h'));
    }
    try {
      localStorage.removeItem('hBoardExplicitlyUnhidden');
    } catch {}
  };

  const init = () => {
    if (initialized) return;
    initialized = true;
    initializeHiddenBoards();
    syncBoardVisibility();
    renderHiddenBoardsList();
  };

  document.addEventListener('click', (e) => {
    const btn = e.target && typeof e.target.closest === 'function' ? e.target.closest('.hide-board-btn') : null;
    if (!btn) return;
    e.preventDefault();
    hideBoard(btn.dataset.board);
  });

  document.addEventListener('contentAdded', () => syncBoardVisibility());

  if (typeof window !== 'undefined') {
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (e) => {
        if (e && e.key === 'hiddenBoards') {
          syncBoardVisibility();
          renderHiddenBoardsList();
        }
      });
    }
    window.boardHider = { getHiddenBoards, hideBoard, showBoard, syncBoardVisibility, renderHiddenBoardsList };
  }

  if (document.readyState && document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
