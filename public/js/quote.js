const QUOTE_LINK_SELECTOR =
  '.quoteLink, .backlink, .thread-content a[href], .reply-content a[href], .thread-text a[href]';

const tooltips = {
  margin: 8,
  gap: 10,
  loadingPreviews: {},
  loadedContent: {},
  knownData: {},
  activeTooltip: null,
  activeQuote: null,
  lastPointer: null,
  watchTimer: null,

  init() {
    this.cachePosts(document);
    this.processQuotes(document);
  },

  refreshQuotes(root) {
    this.cachePosts(root);
    this.processQuotes(root);
  },

  cachePosts(root) {
    root.querySelectorAll('.post.op, .post.reply').forEach((post) => {
      this.cachePostData(post);
    });
  },

  processQuotes(root) {
    root.querySelectorAll(QUOTE_LINK_SELECTOR).forEach((quote) => {
      if (quote.classList.contains('quoteLink') || quote.classList.contains('backlink')) {
        this.processQuote(quote);
        return;
      }
      if (!isCrossboardQuote(quote)) return;
      quote.classList.add('quoteLink');
      this.processQuote(quote);
    });
  },

  parseQuoteUrl(url) {
    let match = url.match(/\/([^/]+)\/(?:archive\/)?thread\/(\d+)(?:\/replies)?#(\d+)/);
    if (!match) match = url.match(/\/([^/]+)\/res\/(\d+)\.html#(\d+)/);
    if (!match) return null;
    return {
      boardUri: match[1],
      threadId: match[2],
      postId: match[3],
      archive: url.includes('/archive/')
    };
  },

  parsePostDate(text) {
    if (!text) return null;
    const m = text.match(/^(\d{2})\/(\d{2})\/(\d{2})\(\w+\)(\d{2}):(\d{2}):(\d{2})$/);
    if (m) {
      const d = new Date(2000 + +m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    const d = new Date(text);
    return isNaN(d.getTime()) ? null : d.toISOString();
  },

  trimPreviewMessage(html) {
    if (!html) return '';
    return html
      .replace(/(<p>\s*(<br\s*\/?>)?\s*<\/p>|<br\s*\/?>\s*)+$/gi, '')
      .replace(/[\s\u00a0\n\r]+$/g, '')
      .trim();
  },

  extractPostData(post) {
    const inInline = post.closest('.post-inline');
    const isOwn = (el) => el && el.closest('.post-inline') === inInline;
    const own = (selector) => Array.from(post.querySelectorAll(selector)).find(isOwn) || null;
    const ownAll = (selector) => Array.from(post.querySelectorAll(selector)).filter(isOwn);

    const timeInfo = own('.time-info');
    const dateText = timeInfo?.textContent?.trim();
    const contentEl = post.querySelector(':scope > .reply-content, :scope > .thread-content') || own('.reply-content, .thread-content');
    const nameEl = own('.name')?.cloneNode(true);
    nameEl?.querySelectorAll('.capcode-label').forEach((el) => el.remove());

    return {
      name: nameEl?.innerHTML,
      subject: own('.subject')?.innerHTML,
      postId: post.getAttribute('data-post-id'),
      creation: this.parsePostDate(dateText),
      sage: Boolean(own('a.sage-name-link')),
      signedRole:
        own('[data-capcode]')?.getAttribute('data-capcode') ??
        (own('.admin-name')
          ? 'Admin'
          : own('.mod-name')
            ? 'Global volunteer'
            : null),
      message: this.trimPreviewMessage(contentEl?.innerHTML),
      files: ownAll('.file-info')
        .map((fileInfo) => {
          const fileLink = fileInfo.querySelector('.file-link');
          const href = fileLink?.getAttribute('href') || fileLink?.href || '';
          let path = href;
          if (/^https?:\/\//i.test(href)) {
            try {
              const parsed = new URL(href);
              if (parsed.origin === window.location.origin) {
                path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
              }
            } catch {
              path = href;
            }
          }
          const sizeMatch = fileInfo.textContent.match(/- ([\d.]+) KB/);
          const dimMatch = fileInfo.textContent.match(/\((\d+)x(\d+)\)/);

          return {
            path,
            originalName: fileLink?.getAttribute('title') || fileLink?.textContent?.trim(),
            size: sizeMatch ? parseFloat(sizeMatch[1]) * 1024 : 0,
            width: dimMatch ? parseInt(dimMatch[1], 10) : null,
            height: dimMatch ? parseInt(dimMatch[2], 10) : null,
            thumb: fileInfo.querySelector('.image-container img')?.getAttribute('src') || fileInfo.querySelector('.image-container img')?.src,
            mime: fileInfo.querySelector('.media-toggle')?.getAttribute('data-mime') || ''
          };
        })
        .filter((file) => file.path),
      banMessage: own('.ban-message')?.innerHTML,
      warningMessage: own('.warning-message')?.innerHTML,
      poll: own('.poll')?.outerHTML
    };
  },

  normalizePostData(post, boardUri) {
    return {
      name: post.name || 'Anonymous',
      creation: post.creation,
      postId: post.postId || post.threadId,
      subject: post.subject,
      sage: Boolean(post.sage),
      signedRole: post.signedRole ?? null,
      message: this.trimPreviewMessage(post.markdown || post.message || ''),
      files: post.files?.map((file) => ({
        path: file.path,
        originalName: file.originalName,
        size: file.size,
        width: file.width,
        height: file.height,
        thumb: file.thumb,
        mime: file.mime || ''
      })),
      boardUri
    };
  },

  cachePostData(post) {
    const boardUri = post.dataset.board;
    const postId = post.getAttribute('data-post-id');
    if (!boardUri || !postId) return;
    this.knownData[`${boardUri}/${postId}`] = this.extractPostData(post);
  },

  cacheThreadData(data, boardUri) {
    if (data.thread) {
      const postData = this.normalizePostData(data.thread, boardUri);
      this.knownData[`${boardUri}/${data.thread.threadId}`] = postData;
    }
    if (data.posts) {
      data.posts.forEach((post) => {
        this.knownData[`${boardUri}/${post.postId}`] = this.normalizePostData(post, boardUri);
      });
    }
  },

  hideTooltip() {
    this.stopPointerWatch();
    if (this.activeTooltip) {
      this.activeTooltip.remove();
      this.activeTooltip = null;
    }
  },

  dismiss() {
    this.activeQuote = null;
    this.hideTooltip();
  },

  stopPointerWatch() {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
  },

  startPointerWatch() {
    if (this.watchTimer) return;
    this.watchTimer = setInterval(() => {
      if (!this.activeQuote || !this.activeTooltip) {
        this.stopPointerWatch();
        return;
      }
      const rect = this.activeQuote.getBoundingClientRect();
      const pointer = this.lastPointer;
      const overAnchor =
        pointer &&
        pointer.x >= rect.left &&
        pointer.x <= rect.right &&
        pointer.y >= rect.top &&
        pointer.y <= rect.bottom;
      if (!overAnchor) this.dismiss();
    }, 150);
  },

  fitTooltip(tooltip, anchorRect) {
    const { margin } = this;
    tooltip.style.position = 'fixed';
    tooltip.style.maxWidth = `${window.innerWidth - margin * 2}px`;
    tooltip.style.maxHeight = `${window.innerHeight - margin * 2}px`;
    tooltip.style.visibility = 'hidden';
    tooltip.style.left = `${margin}px`;
    tooltip.style.top = `${margin}px`;

    const { left, top } = this.placeTooltip(tooltip.offsetWidth, tooltip.offsetHeight, anchorRect);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = '';
  },

  placeTooltip(width, height, anchorRect) {
    const { margin, gap } = this;
    const maxLeft = window.innerWidth - margin - width;
    const maxTop = window.innerHeight - margin - height;
    const clampLeft = (value) => Math.max(margin, Math.min(value, maxLeft));
    const clampTop = (value) => Math.max(margin, Math.min(value, maxTop));
    const overlaps = (left, top) =>
      left < anchorRect.right && left + width > anchorRect.left && top < anchorRect.bottom && top + height > anchorRect.top;
    const fits = (left, top) =>
      left >= margin &&
      left + width <= window.innerWidth - margin &&
      top >= margin &&
      top + height <= window.innerHeight - margin;

    const spots = [
      { left: anchorRect.right + gap, top: anchorRect.top },
      { left: anchorRect.left - gap - width, top: anchorRect.top },
      { left: clampLeft(anchorRect.left), top: anchorRect.bottom + gap },
      { left: clampLeft(anchorRect.left), top: anchorRect.top - gap - height }
    ];
    for (const spot of spots) {
      if (fits(spot.left, spot.top) && !overlaps(spot.left, spot.top)) return spot;
    }

    let left = anchorRect.right + gap;
    if (left + width > window.innerWidth - margin) left = anchorRect.left - gap - width;
    let top = anchorRect.top;
    if (top + height > window.innerHeight - margin) top = window.innerHeight - margin - height;
    return { left: clampLeft(left), top: clampTop(top) };
  },

  renderPreview(postData, tooltip, quoteUrl) {
    return fetch('/cells/post-preview?post=' + encodeURIComponent(JSON.stringify(postData)), {
      headers: csrfHeaders()
    })
      .then((r) => {
        if (!r.ok) throw new Error('Preview request failed');
        return r.text();
      })
      .then((html) => {
        this.loadedContent[quoteUrl] = html;
        if (this.activeTooltip && this.activeQuote?.href === quoteUrl) {
          this.activeTooltip.innerHTML = html;
          this.fitTooltip(this.activeTooltip, this.activeQuote.getBoundingClientRect());
        }
      })
      .catch(() => {
        if (this.activeTooltip && this.activeQuote?.href === quoteUrl) {
          this.activeTooltip.textContent = 'Error loading post';
        }
      });
  },

  loadQuote(tooltip, quoteUrl) {
    const parts = this.parseQuoteUrl(quoteUrl);
    if (!parts) {
      tooltip.textContent = 'Post not found';
      return;
    }

    const dataKey = `${parts.boardUri}/${parts.postId}`;
    const cached = this.knownData[dataKey];
    if (cached) {
      this.renderPreview(cached, tooltip, quoteUrl);
      return;
    }

    this.loadingPreviews[quoteUrl] = true;

    const archivePrefix = parts.archive ? 'archive/' : '';
    fetch(`/${parts.boardUri}/${archivePrefix}thread/${parts.threadId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('Thread not found');
        return r.json();
      })
      .then((data) => {
        this.cacheThreadData(data, parts.boardUri);
        const postData = this.knownData[dataKey];
        if (postData) {
          return this.renderPreview(postData, tooltip, quoteUrl);
        }
        if (this.activeTooltip && this.activeQuote?.href === quoteUrl) {
          this.activeTooltip.textContent = 'Post not found';
        }
      })
      .catch(() => {
        if (this.activeTooltip && this.activeQuote?.href === quoteUrl) {
          this.activeTooltip.textContent = 'Post not found';
        }
      })
      .finally(() => {
        delete this.loadingPreviews[quoteUrl];
      });
  },

  isMobileOrTouch() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)').matches) {
        return true;
      }
    }
    return typeof window !== 'undefined' && Number(window.innerWidth) > 0 && window.innerWidth <= 768;
  },

  processQuote(quote) {
    if (quote.dataset.quoteBound) return;
    quote.dataset.quoteBound = '1';

    quote.onmouseenter = (event) => {
      if (this.isMobileOrTouch()) return;
      const quoteUrl = quote.href;
      if (!quoteUrl || quoteUrl.endsWith('#')) return;

      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.hideTooltip();
      this.activeQuote = quote;

      const tooltip = document.createElement('div');
      tooltip.className = 'quote-preview';
      const rect = quote.getBoundingClientRect();
      document.body.appendChild(tooltip);

      this.activeTooltip = tooltip;
      this.startPointerWatch();

      if (this.loadedContent[quoteUrl]) {
        tooltip.innerHTML = this.loadedContent[quoteUrl];
        this.fitTooltip(tooltip, rect);
        return;
      }

      tooltip.textContent = 'Loading...';
      this.fitTooltip(tooltip, rect);

      if (!this.loadingPreviews[quoteUrl]) {
        this.loadQuote(tooltip, quoteUrl);
      }
    };

    quote.onmouseout = () => {
      if (this.activeQuote !== quote) return;
      this.hideTooltip();
      this.activeQuote = null;
    };

  }
};

function isCrossboardQuote(anchor) {
  const source = anchor.closest('[data-board][data-thread-id]');
  if (!source) return false;

  const target = tooltips.parseQuoteUrl(anchor.getAttribute('href') || anchor.href || '');
  if (!target || !target.postId) return false;
  return (
    target.boardUri !== source.getAttribute('data-board') ||
    String(target.threadId) !== String(source.getAttribute('data-thread-id'))
  );
}

const POST_CONTAINER_SELECTOR =
  '.post[data-board][data-thread-id][data-post-id], .op[data-board][data-thread-id][data-post-id], .reply[data-board][data-thread-id][data-post-id]';
const IGNORED_MUTATION_SELECTOR = '.backlinks, .inline-backlinks, .quote-preview, .post-inline, .embed-container';

function isIgnoredMutationTarget(node) {
  const el = node && node.nodeType === 1 ? node : node?.parentElement;
  return Boolean(el?.closest?.(IGNORED_MUTATION_SELECTOR));
}

function hasPostElement(node) {
  if (!node || node.nodeType !== 1) return false;
  if (node.classList?.contains('post-inline') || node.classList?.contains('quote-preview')) return false;
  if (node.closest?.('.backlinks, .inline-backlinks, .quote-preview, .post-inline')) return false;
  if (node.matches?.('.post[data-post-id], .op[data-post-id][data-board], .reply[data-post-id][data-board]')) return true;
  if (node.querySelectorAll) {
    for (const post of node.querySelectorAll('.post[data-post-id], .op[data-post-id][data-board], .reply[data-post-id][data-board]')) {
      if (!post.closest?.('.post-inline')) return true;
    }
    return false;
  }
  const nested = node.querySelector?.('.post[data-post-id]');
  return Boolean(nested && !nested.closest?.('.post-inline'));
}

const backlinks = {
  _lastRunAt: 0,

  init() {
    this._lastRunAt = Date.now();
    const quoteLinks = document.querySelectorAll('.quoteLink');
    const backlinkMap = new Map();
    const youKeys = new Set();
    const postMap = new Map();

    document.querySelectorAll(POST_CONTAINER_SELECTOR).forEach((post) => {
      if (post.closest?.('.post-inline')) return;
      const key = `${post.getAttribute('data-board')}/${post.getAttribute('data-thread-id')}/${post.getAttribute('data-post-id')}`;
      if (!postMap.has(key)) postMap.set(key, post);
    });

    document.querySelectorAll('.name.youName').forEach((nameElement) => {
      const post = nameElement.closest('[data-post-id]');
      if (post) youKeys.add(`${post.getAttribute('data-board')}/${post.getAttribute('data-post-id')}`);
    });

    quoteLinks.forEach((link) => {
      const fullUrl = link.getAttribute('href');
      const sourcePost = link.closest('[data-post-id]');
      if (!sourcePost || !fullUrl) return;

      if (isCrossboardQuote(link)) return;

      if (link.closest('.post-inline')) return;

      const target = tooltips.parseQuoteUrl(fullUrl);
      if (!target) return;

      const sourceId = sourcePost.getAttribute('data-post-id');
      const targetKey = `${target.boardUri}/${target.threadId}/${target.postId}`;

      if (youKeys.has(`${target.boardUri}/${target.postId}`) && !link.classList.contains('you')) {
        link.classList.add('you');
      }
      if (target.postId === target.threadId && !link.classList.contains('opReply')) {
        link.classList.add('opReply');
      }

      if (!backlinkMap.has(targetKey)) backlinkMap.set(targetKey, { target, sources: new Map() });
      backlinkMap.get(targetKey).sources.set(sourceId, fullUrl.split('#')[0]);
    });

    postMap.forEach((quotedPost, targetKey) => {
      const backlinksDiv = quotedPost.querySelector('.backlinks');
      if (!backlinksDiv) return;

      const entry = backlinkMap.get(targetKey);
      const entries = entry ? Array.from(entry.sources.entries()) : [];
      const sig = entries
        .map(([id]) => {
          const you = youKeys.has(`${entry.target.boardUri}/${id}`) ? 1 : 0;
          const op = String(id) === String(entry.target.threadId) ? 1 : 0;
          return `${id}:${you}:${op}`;
        })
        .join(',');

      const hasChildren = (backlinksDiv.childNodes ? backlinksDiv.childNodes.length : backlinksDiv.children?.length || 0) > 0;
      if (backlinksDiv.dataset.backlinksSig === sig && (sig === '' ? !hasChildren : hasChildren)) {
        return;
      }

      backlinksDiv.dataset.backlinksSig = sig;
      backlinksDiv.textContent = '';

      if (!entries.length) return;

      const { target } = entry;
      const frag = document.createDocumentFragment ? document.createDocumentFragment() : backlinksDiv;
      entries.forEach(([id, baseUrl], i) => {
        const classes = ['backlink'];
        if (youKeys.has(`${target.boardUri}/${id}`)) classes.push('you');
        if (String(id) === String(target.threadId)) classes.push('opReply');
        const a = document.createElement('a');
        a.className = classes.join(' ');
        a.href = `${baseUrl}#${id}`;
        a.textContent = `>>${id}`;
        if (i) frag.appendChild(document.createTextNode(' '));
        frag.appendChild(a);
        tooltips.processQuote(a);
      });
      if (frag !== backlinksDiv) backlinksDiv.appendChild(frag);
    });
  }
};

const pendingAdded = new Set();
let pendingNeedsBacklinks = false;
let pendingQueuedAt = 0;

const observer = new MutationObserver((mutations) => {
  let matched = false;
  for (const mutation of mutations) {
    if (isIgnoredMutationTarget(mutation.target)) continue;
    for (const node of mutation.addedNodes || []) {
      if (!hasPostElement(node)) continue;
      pendingAdded.add(node);
      pendingNeedsBacklinks = true;
      matched = true;
    }
    for (const node of mutation.removedNodes || []) {
      if (!hasPostElement(node)) continue;
      pendingNeedsBacklinks = true;
      matched = true;
    }
  }
  if (!matched && !pendingAdded.size && !pendingNeedsBacklinks) return;

  pendingQueuedAt = Date.now();
  clearTimeout(observer.timeout);
  observer.timeout = setTimeout(() => {
    const nodes = [...pendingAdded];
    const needsBacklinks = pendingNeedsBacklinks;
    const queuedAt = pendingQueuedAt;
    pendingAdded.clear();
    pendingNeedsBacklinks = false;

    for (const node of nodes) {
      tooltips.refreshQuotes(node);
    }
    if (needsBacklinks && (backlinks._lastRunAt || 0) < queuedAt) {
      backlinks.init();
    }
  }, 250);
});

document.addEventListener('DOMContentLoaded', () => {
  tooltips.init();
  backlinks.init();

  document.addEventListener('mousemove', (event) => {
    tooltips.lastPointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });

  window.addEventListener('scroll', () => tooltips.dismiss(), { passive: true, capture: true });

  const thread = document.querySelector('.thread');
  if (thread) {
    observer.observe(thread.parentNode, { childList: true, subtree: true });
  }
});

window.tooltips = tooltips;
window.backlinks = backlinks;

function getPostPasswords() {
  try {
    const storedPasswords = localStorage.getItem('postingPasswords');
    if (storedPasswords) return JSON.parse(storedPasswords);
  } catch (e) {
    console.error('Error getting passwords from localStorage:', e);
  }
  return {};
}

function savePostPasswords(passwords) {
  try {
    localStorage.setItem('postingPasswords', JSON.stringify(passwords));
  } catch (e) {
    console.error('Error saving passwords to localStorage:', e);
  }
}
