window.initializeExpansion = function () {
  const threadFooters = document.querySelectorAll('.thread-footer');
  const bulkSize = 250;

  threadFooters.forEach((footer) => {
    if (footer.dataset.expansionInitialized === '1') return;
    footer.dataset.expansionInitialized = '1';

    const threadId = footer.dataset.threadId;
    const expandButtons = footer.querySelectorAll('.expand-thread, .expand-thread-btn');
    const collapseButtons = footer.querySelectorAll('.collapse-thread, .collapse-thread-btn');
    const omittedPosts = footer.querySelector('.omitted-posts');
    const expandedPosts = footer.querySelector('.expanded-posts');
    const additionalReplies = footer.nextElementSibling;
    let isExpanding = false;

    const handleExpand = async function (e) {
      e.preventDefault();
      if (isExpanding) return;

      try {
        isExpanding = true;
        const currentPath = location.pathname.split('/').filter((p) => p)[0];
        const threadRoot = footer.closest('.thread');
        const firstLink = threadRoot?.querySelector('a[href^="/"]');
        const hrefMatch = firstLink?.getAttribute('href')?.match(/^\/([^/]+)\//);
        const textMatch = firstLink?.textContent?.match(/\/(\w+)\//);
        const boardUri =
          threadRoot?.querySelector('[data-board]')?.getAttribute('data-board') ||
          (currentPath === 'all' ? hrefMatch?.[1] || textMatch?.[1] : currentPath);
        if (!boardUri) return;
        const modView = Boolean(window.modBoardUri);

        const response = await fetch(`/${boardUri}/thread/${threadId}.json`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        const existingReplies = new Set(Array.from(footer.parentNode.querySelectorAll('.reply')).map((r) => r.dataset.postId));

        const lastFivePostIds = new Set(data.posts.slice(-5).map((post) => post.postId.toString()));
        const newReplies = data.posts.filter(
          (reply) => !existingReplies.has(reply.postId.toString()) && !lastFivePostIds.has(reply.postId.toString())
        );

        if (newReplies.length) {
          const positions = new Map();
          data.posts.forEach((post, index) => positions.set(String(post.postId), index + 1));

          const batches = [];
          for (let i = 0; i < newReplies.length; i += bulkSize) {
            batches.push(newReplies.slice(i, i + bulkSize));
          }

          const rendered = await Promise.all(
            batches.map(async (batch) => {
              const cellResponse = await fetch(`/${boardUri}/cells/replies`, {
                method: 'POST',
                headers: csrfHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                  replies: batch,
                  replyNumbers: batch.map((reply) => positions.get(String(reply.postId)) || 0),
                  thread: { threadId, boardUri },
                  modView
                })
              });
              if (!cellResponse.ok) throw new Error(`HTTP ${cellResponse.status}`);
              return cellResponse.text();
            })
          );

          additionalReplies.innerHTML = rendered.join('');
        }

        additionalReplies.style.display = 'block';
        omittedPosts.style.display = 'none';
        expandedPosts.style.display = 'inline';

        if (window.markYouPosts) window.markYouPosts();
        if (window.initializePostMenus) window.initializePostMenus(additionalReplies);
        if (typeof window.initializeThumbnails === 'function') window.initializeThumbnails();
        if (window.backlinks?.init) window.backlinks.init();
      } catch (error) {
        console.error('Error fetching additional replies:', error);
        additionalReplies.textContent = '';
        const errEl = document.createElement('div');
        errEl.className = 'error';
        errEl.textContent = 'Failed to load replies';
        additionalReplies.appendChild(errEl);
      } finally {
        isExpanding = false;
      }
    };

    expandButtons.forEach((btn) => btn.addEventListener('click', handleExpand));

    const handleCollapse = function (e) {
      e.preventDefault();
      additionalReplies.style.display = 'none';
      omittedPosts.style.display = 'inline';
      expandedPosts.style.display = 'none';
      additionalReplies.innerHTML = '';
    };

    collapseButtons.forEach((btn) => btn.addEventListener('click', handleCollapse));
  });

  window.initializeThreadCollapse();
};

window.initializeThreadCollapse = function () {
  const STORAGE_KEY = 'koshiCollapsedThreads';
  const readMap = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };
  const writeMap = (map) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
  };

  const state = readMap();
  document.querySelectorAll('.thread-collapsed-bar').forEach((bar) => {
    const key = `${bar.dataset.board}/${bar.dataset.threadId}`;
    const threadEl = bar.closest('.thread');
    if (threadEl && state[key]) {
      threadEl.classList.add('thread-collapsed');
    }
  });

  if (document.body?.dataset.threadCollapseBound) return;
  if (document.body) document.body.dataset.threadCollapseBound = '1';

  document.addEventListener('click', (e) => {
    const collapseBtn = e.target?.closest ? e.target.closest('.thread-collapse-btn') : null;
    const expandBtn = e.target?.closest ? e.target.closest('.thread-expand-icon-btn') : null;
    const btn = collapseBtn || expandBtn;
    if (!btn) return;
    e.preventDefault();
    const threadEl = btn.closest('.thread');
    if (!threadEl) return;
    const key = `${btn.dataset.board}/${btn.dataset.threadId}`;
    const map = readMap();
    if (collapseBtn) {
      threadEl.classList.add('thread-collapsed');
      map[key] = true;
    } else {
      threadEl.classList.remove('thread-collapsed');
      delete map[key];
    }
    writeMap(map);
  });
};

document.addEventListener('DOMContentLoaded', function () {
  window.initializeExpansion();
});
