let markedPosting = null;

function markPost(id) {
  id = Number(id);
  if (isNaN(id)) return;

  if (markedPosting) {
    markedPosting.classList.remove('highlight');
    markedPosting = null;
  }

  if (document.querySelector(`.op[data-post-id="${id}"]`)) return;

  const container = document.querySelector(`.reply[data-post-id="${id}"]`);
  if (!container) return;

  container.classList.add('highlight');
  markedPosting = container;
}

function scrollToHash() {
  const hash = window.location.hash;
  if (!hash || hash.startsWith('#q')) return;
  const postId = hash.slice(1);
  if (!/^\d+$/.test(postId)) return;
  const el =
    document.querySelector(`.reply[data-post-id="${postId}"], .op[data-post-id="${postId}"]`) ||
    document.getElementById('p' + postId);
  if (el) {
    markPost(postId);
    el.scrollIntoView();
  }
}

window.markPost = markPost;
scrollToHash();
window.addEventListener('hashchange', scrollToHash);

let unreadCount = 0;
let originalTitle = document.title;
let lastPostedId = null;
let lastReplyId = 0;

function getRepliesContainer() {
  return document.getElementById('replies') || document.querySelector('.replies');
}

function isTextBoardPage() {
  return document.body.classList.contains('textboard');
}

function getLastReplyIdFromDom() {
  let max = 0;
  document.querySelectorAll('.reply[data-post-id]').forEach((el) => {
    const id = parseInt(el.dataset.postId, 10);
    if (id > max) max = id;
  });
  return max;
}

function nextReplyNumber() {
  const count = document.querySelectorAll('.reply[data-post-id]').length;
  return isTextBoardPage() ? count + 2 : count + 1;
}

function postIdOfElement(el) {
  if (!el) return 0;
  const postEl = el.matches?.('[data-post-id]') ? el : el.querySelector?.('[data-post-id]');
  const id = parseInt(postEl?.getAttribute('data-post-id') || '', 10);
  return Number.isFinite(id) ? id : 0;
}

function hasReplyInDom(threadReplies, postId) {
  return Boolean(threadReplies && threadReplies.querySelector(`.reply[data-post-id="${Number(postId)}"]`));
}

function insertReplyInOrder(threadReplies, replyEl, postId) {
  const targetId = Number(postId) || postIdOfElement(replyEl);
  if (targetId && hasReplyInDom(threadReplies, targetId)) return { inserted: false, outOfOrder: false };

  let before = null;
  for (let cursor = threadReplies.lastElementChild; cursor; cursor = cursor.previousElementSibling) {
    const existingId = postIdOfElement(cursor);
    if (!existingId) continue;
    if (existingId <= targetId) break;
    before = cursor;
  }

  if (before) {
    threadReplies.insertBefore(replyEl, before);
    return { inserted: true, outOfOrder: true };
  }
  threadReplies.appendChild(replyEl);
  return { inserted: true, outOfOrder: false };
}

function linksToPostHere(anchor, postId) {
  const href = anchor.getAttribute('href') || '';
  const [path, hash] = href.split('#');
  if (hash !== String(postId)) return false;
  if (!path) return true;
  return new RegExp(`/thread/${threadAutoRefresh.threadId}(?:\\.html)?$`).test(path);
}

function dropQuoteReferencesTo(postId) {
  document.querySelectorAll('a.quoteLink, a.backlink').forEach((anchor) => {
    if (linksToPostHere(anchor, postId)) anchor.remove();
  });
}

function markPostDeleted(post) {
  if (post.dataset.deleted === '1') return false;
  post.dataset.deleted = '1';
  post.classList.add('deleted-post');

  const nameBlock = post.querySelector('.post-info .name-block') || post.querySelector('.name-block');
  if (!nameBlock || !nameBlock.parentNode) return false;

  const label = document.createElement('span');
  label.className = 'deleted-label';
  label.textContent = '[DELETED]';
  nameBlock.parentNode.insertBefore(label, nameBlock);
  return true;
}

function renumberReplies() {
  const start = isTextBoardPage() ? 2 : 1;
  document.querySelectorAll('.reply[data-post-id]').forEach((reply, index) => {
    const number = String(index + start);
    reply.setAttribute('data-reply-number', number);
    const label = reply.querySelector('.reply-number');
    if (label) label.textContent = number;
  });
}

const threadAutoRefresh = {
  autoRefresh: true,
  refreshTimer: null,
  refreshing: false,
  pendingRefresh: false,
  manualRefresh: false,
  lastRefresh: 5,
  currentRefresh: 5,
  boardUri: null,
  threadId: null,
  isArchive: false,
  refreshLabel: null,
  refreshButton: null,
  autoCheckbox: null,
  sound: null,

  init() {
    const threadElement = document.querySelector('.thread');
    if (!threadElement || !document.getElementById('thread-refresh-btn')) return;

    this.boardUri = location.pathname.split('/')[1];
    this.threadId = threadElement.id;
    this.isArchive = location.pathname.includes('/archive/');
    lastReplyId = getLastReplyIdFromDom();

    this.refreshLabel = document.getElementById('thread-refresh-label');
    this.refreshButton = document.getElementById('thread-refresh-btn');
    this.autoCheckbox = document.getElementById('thread-auto-refresh');

    const savedAuto = localStorage.getItem('threadAutoRefresh');
    if (savedAuto === 'false') {
      this.autoCheckbox.checked = false;
    }

    this.refreshButton.onclick = () => this.refreshPosts(true);
    this.autoCheckbox.onchange = () => this.changeRefresh();

    this.changeRefresh();
  },

  startTimer(time) {
    if (time > 600) time = 600;
    this.currentRefresh = time;
    this.lastRefresh = time;
    if (this.refreshLabel) this.refreshLabel.textContent = String(this.currentRefresh);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      this.currentRefresh--;
      if (!this.currentRefresh) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
        if (this.refreshLabel) this.refreshLabel.textContent = '';
        this.refreshPosts();
      } else if (this.refreshLabel) {
        this.refreshLabel.textContent = String(this.currentRefresh);
      }
    }, 1000);
  },

  changeRefresh() {
    this.autoRefresh = this.autoCheckbox.checked;
    localStorage.setItem('threadAutoRefresh', this.autoRefresh ? 'true' : 'false');
    if (!this.autoRefresh) {
      if (this.refreshLabel) this.refreshLabel.textContent = '';
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
      return;
    }
    this.startTimer(5);
  },

  scheduleNextTimer(foundPosts) {
    if (!this.autoRefresh) return;
    this.startTimer(this.manualRefresh || foundPosts ? 5 : this.lastRefresh * 2);
  },

  applyDeletedPosts(liveIds) {
    const mark = window.deletedPostDisplay === 'mark';
    let handled = 0;

    document.querySelectorAll('.post[data-post-id]').forEach((post) => {
      const id = post.getAttribute('data-post-id');
      if (!id || liveIds.has(String(id))) return;

      if (mark) {
        if (markPostDeleted(post)) handled += 1;
        return;
      }

      const container = post.closest('.post-container') || post;
      const { bottom, height } = container.getBoundingClientRect();
      const aboveViewport = bottom < 0;

      container.remove();
      dropQuoteReferencesTo(id);
      if (aboveViewport) window.scrollBy(0, -height);
      handled += 1;
    });

    if (!handled || mark) return handled;
    renumberReplies();
    if (window.backlinks?.init) window.backlinks.init();
    return handled;
  },

  refreshPosts(manual) {
    if (this.refreshing) {
      if (manual) this.pendingRefresh = true;
      return Promise.resolve();
    }
    this.manualRefresh = !!manual;
    if (this.autoRefresh && manual && this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.refreshing = true;
    if (this.refreshButton) this.refreshButton.disabled = true;

    return fetch(`/${this.boardUri}/thread/${this.threadId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('refresh failed');
        return r.json();
      })
      .then((data) => {
        const posts = (data.posts || []).slice().sort((a, b) => Number(a.postId) - Number(b.postId));

        const liveIds = new Set([
          String(data.threadId ?? data.thread?.threadId ?? this.threadId),
          ...posts.map((post) => String(post.postId))
        ]);
        this.applyDeletedPosts(liveIds);

        const threadReplies = getRepliesContainer();
        const newPosts = posts.filter((post) => {
          const id = Number(post.postId);
          return id > lastReplyId && !hasReplyInDom(threadReplies, id);
        });

        return this.appendPosts(newPosts).then(({ insertedCount, insertedOthers }) => {
          if (insertedOthers && !manual) this.playNewPostSound();
          if (!this.pendingRefresh) this.scheduleNextTimer(insertedCount > 0);
        });
      })
      .catch((err) => {
        console.error('Thread refresh error:', err);
        if (!this.pendingRefresh) this.scheduleNextTimer(false);
      })
      .finally(() => {
        this.refreshing = false;
        if (this.refreshButton) this.refreshButton.disabled = false;
        this.manualRefresh = false;
        if (this.pendingRefresh) {
          this.pendingRefresh = false;
          this.refreshPosts(true);
        }
      });
  },

  playNewPostSound() {
    if (localStorage.getItem('newPostSound') !== 'true') return;
    if (!this.sound) this.sound = new Audio('/sound/new-post.mp3');
    this.sound.currentTime = 0;
    const played = this.sound.play();
    if (played && played.catch) played.catch(() => {});
  },

  async fetchReplyCells(posts, startReplyNumber) {
    const thread = { threadId: this.threadId, boardUri: this.boardUri };
    if (isTextBoardPage()) {
      return Promise.all(
        posts.map((post, idx) =>
          fetch(`/${this.boardUri}/cells/textreply`, {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              reply: { ...post, sage: Boolean(post.sage) },
              thread,
              replyNumber: startReplyNumber + idx,
              isArchive: this.isArchive
            })
          })
            .then((response) => {
              if (!response.ok) throw response;
              return response.text();
            })
            .then((replyHtml) => {
              const temp = document.createElement('div');
              temp.innerHTML = replyHtml.trim();
              return { post, element: temp.firstElementChild };
            })
        )
      );
    }

    const CHUNK_SIZE = 250;
    const chunks = [];
    for (let offset = 0; offset < posts.length; offset += CHUNK_SIZE) {
      chunks.push({ slice: posts.slice(offset, offset + CHUNK_SIZE), offset });
    }

    const chunkResults = await Promise.all(
      chunks.map(({ slice, offset }) =>
        fetch(`/${this.boardUri}/cells/replies`, {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            replies: slice.map((post) => ({ ...post, sage: Boolean(post.sage) })),
            thread,
            replyNumbers: slice.map((_, idx) => startReplyNumber + offset + idx),
            isArchive: this.isArchive
          })
        })
          .then((response) => {
            if (!response.ok) throw response;
            return response.text();
          })
          .then((html) => {
            const temp = document.createElement('div');
            temp.innerHTML = html.trim();
            const children = Array.from(temp.children);
            const byId = new Map();
            for (const el of children) {
              const id = postIdOfElement(el);
              if (id && !byId.has(id)) byId.set(id, el);
            }
            return slice.map((post, idx) => ({
              post,
              element: byId.get(Number(post.postId)) || children[idx] || null
            }));
          })
      )
    );
    return chunkResults.flat();
  },

  async appendPosts(newPosts, startReplyNumber = nextReplyNumber()) {
    const threadReplies = getRepliesContainer();
    if (!threadReplies || !Array.isArray(newPosts) || !newPosts.length) {
      return { insertedCount: 0, insertedOthers: false, insertedOwn: false };
    }

    const rendered = await this.fetchReplyCells(newPosts, startReplyNumber);
    const wasAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;

    const insertedElements = [];
    let outOfOrder = false;
    let insertedOthers = false;
    let insertedOwn = false;
    let unreadDelta = 0;

    for (const { post, element } of rendered) {
      if (!element) continue;
      const postId = Number(post.postId) || postIdOfElement(element);
      const res = insertReplyInOrder(threadReplies, element, postId);
      if (!res.inserted) continue;

      insertedElements.push(element);
      if (res.outOfOrder) outOfOrder = true;
      if (postId > lastReplyId) lastReplyId = postId;

      if (postId === lastPostedId) {
        insertedOwn = true;
      } else {
        insertedOthers = true;
        unreadDelta++;
      }
    }

    if (insertedElements.length > 0) {
      if (outOfOrder) renumberReplies();
      document.dispatchEvent(new CustomEvent('contentAdded'));
      if (window.backlinks?.init) window.backlinks.init();
      if (window.initializeThumbnails) window.initializeThumbnails();
      for (const el of insertedElements) {
        if (window.initializePostMenus) window.initializePostMenus(el);
      }
      if (window.initializePolls) window.initializePolls();
      if (window.settings?.applyFilters) window.settings.applyFilters();

      if (!wasAtBottom && unreadDelta > 0) {
        unreadCount += unreadDelta;
        updateTitle();
      }
      if (insertedOwn) {
        window.scrollTo(0, document.documentElement.scrollHeight);
      }
    }

    return { insertedCount: insertedElements.length, insertedOthers, insertedOwn };
  },

  appendPost(post, replyNumber) {
    return this.appendPosts([post], replyNumber);
  }
};

window.threadAutoRefresh = threadAutoRefresh;

function getPostPasswords() {
  try {
    const storedPasswords = localStorage.getItem('postingPasswords');
    if (storedPasswords) {
      return JSON.parse(storedPasswords);
    }
  } catch (e) {
    console.error('Error parsing postingPasswords from localStorage:', e);
  }
  return {};
}

function savePostPasswords(passwords) {
  try {
    localStorage.setItem('postingPasswords', JSON.stringify(passwords));
  } catch (e) {
    console.error('Error saving postingPasswords to localStorage:', e);
  }
}

function generateRandomPassword() {
  return Math.random().toString(36).substring(2, 10);
}

function updateTitle() {
  document.title = unreadCount > 0 ? `(${unreadCount}) ${originalTitle}` : originalTitle;
}


document.addEventListener('DOMContentLoaded', () => {
  threadAutoRefresh.init();
});

document.addEventListener('DOMContentLoaded', () => {
  const mainReplyForm = document.getElementById('reply-form');

  if (mainReplyForm) {
    let replyInFlight = false;
    mainReplyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (replyInFlight) return;
      replyInFlight = true;
      const submitButtons = [...mainReplyForm.querySelectorAll('button[type="submit"], input[type="submit"]')];
      submitButtons.forEach((button) => {
        button.disabled = true;
      });

      const fileInput = document.getElementById('image');
      if (window.updateFileInput && typeof window.updateFileInput === 'function') {
        window.updateFileInput();
      }

      const formData = new FormData(mainReplyForm);

      const postPassword = window.postPassword
        ? window.postPassword.ensure()
        : String(formData.get('post-password') || '').trim() || generateRandomPassword();
      formData.set('post-password', postPassword);

      formData.delete('image');
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          formData.append('image', fileInput.files[i]);
        }
      }

      try {
        const response = await fetch(mainReplyForm.action, {
          method: 'POST',
          body: formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin'
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();

          if (result.success) {
            mainReplyForm.reset();

            globalFormState = {
              name: '',
              sage: false,
              message: '',
              files: []
            };

            const fileInput = document.getElementById('image');
            const previewContainer = document.getElementById('preview-container');
            const previewContainer_QR = document.getElementById('qr-preview-container');

            if (previewContainer) previewContainer.innerHTML = '';
            if (previewContainer_QR) previewContainer_QR.innerHTML = '';

            if (fileInput) {
              const dt = new DataTransfer();
              fileInput.files = dt.files;
            }

            if (window.currentFiles !== undefined) {
              window.currentFiles = [];
            }

            if (result.post.nonoko) {
              try {
                const postKey = `${result.post.boardUri}/${result.post.threadId}/${result.post.postId}`;
                const postPasswords = getPostPasswords();
                postPasswords[postKey] = result.postPassword || postPassword;
                savePostPasswords(postPasswords);
              } catch (e) {
                console.error('Error directly saving to localStorage:', e);
              }

              window.location.href = `/${result.post.boardUri}/`;
              return;
            }

            if (result.postPassword && result.postKey) {
              const postPasswords = getPostPasswords();
              postPasswords[result.postKey] = result.postPassword;
              savePostPasswords(postPasswords);

              try {
                const savedPasswords = JSON.parse(localStorage.getItem('postingPasswords') || '{}');
              } catch (e) {
                console.error('Error directly saving to localStorage:', e);
              }
            }

            lastPostedId = result.post.postId;
            threadAutoRefresh.refreshPosts(true);
            if (typeof watchedThreads !== 'undefined') {
              try {
                watchedThreads.autoWatchThread(result.post.threadId, result.post.boardUri, result.post.subject, result.post.message);
              } catch (e) {
                console.error('Could not update watched threads:', e);
              }
            }
          } else if (result.error) {
            if (result.error === 'captcha') {
              const msg = result.message || 'Solve the captcha before posting.';
              window.captchaWidget?.expire({ open: true, notice: msg });
              alert(msg);
            } else if (result.error === 'flood') {
              alert(result.message || 'Posting too quickly. Please wait a moment.');
            } else if (result.error === 'banned') {
              if (result.redirectUrl) {
                window.location.href = result.redirectUrl;
              } else {
                alert('You are banned from posting.');
              }
            } else {
              const errorMsg = result.error.message || result.message || result.error || 'Unknown error';
              alert(errorMsg);
            }
          }
        } else if (!response.ok) {
          const errorText = await response.text();

          if (errorText.includes('/banned?id=')) {
            const banIdMatch = errorText.match(/\/banned\?id=([a-f0-9]+)/i);
            if (banIdMatch && banIdMatch[1]) {
              window.location.href = `/banned?id=${banIdMatch[1]}`;
              return;
            }
          }

          let errorMessage = errorText;

          if (response.status === 429) {
            errorMessage = 'Posting too quickly. Please wait a moment.';
          } else if (response.status === 403) {
            errorMessage = 'Your post was blocked. This may be due to spam prevention measures.';
          } else if (errorText.includes('Posting Restricted') || errorText.includes('Posting not allowed')) {
            const errorMatch = errorText.match(/<p[^>]*>(.*?)<\/p>/i);
            if (errorMatch && errorMatch[1]) {
              errorMessage = errorMatch[1].replace(/<[^>]*>/g, '');
            } else {
              errorMessage = 'Posting is restricted from your IP address due to spam prevention measures.';
            }
          } else {
            const errorMatch =
              errorText.match(/<p[^>]*>(.*?)<\/p>/i) ||
              errorText.match(/<div[^>]*>(.*?)<\/div>/i) ||
              errorText.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
            if (errorMatch && errorMatch[1]) {
              errorMessage = errorMatch[1].replace(/<[^>]*>/g, '').trim();
            }
            if (!errorMessage || errorMessage.length === 0) {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          }

          alert(errorMessage);
        }
      } catch (error) {
        console.error('Error posting reply:', error);
        alert(error.message || error.toString() || 'Unknown error');
      } finally {
        replyInFlight = false;
        submitButtons.forEach((button) => {
          button.disabled = false;
        });
      }
    });
  }
});

window.addEventListener('scroll', () => {
  const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
  if (isAtBottom) {
    unreadCount = 0;
    updateTitle();
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const quoteButton = document.createElement('button');
  quoteButton.textContent = 'Quote';
  quoteButton.className = 'quote-button';
  quoteButton.style.cssText = `
    position: absolute;
    display: none;
    z-index: 1000;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(quoteButton);

  document.addEventListener('mouseup', function (e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const x = e.pageX;
      const y = e.pageY - 40;

      quoteButton.style.left = `${x}px`;
      quoteButton.style.top = `${y}px`;
      quoteButton.style.display = 'block';

      quoteButton.onclick = function () {
        const messageBox = document.getElementById('message');
        if (messageBox) {
          const quotedText = selectedText
            .split('\n')
            .map((line) => `>${line}`)
            .join('\n');

          const currentText = messageBox.value;
          const cursorPos = messageBox.selectionStart;

          const beforeCursor = currentText.substring(0, cursorPos);
          const afterCursor = currentText.substring(cursorPos);

          messageBox.value =
            beforeCursor +
            (beforeCursor && !beforeCursor.endsWith('\n') ? '\n' : '') +
            quotedText +
            (!afterCursor.startsWith('\n') ? '\n' : '') +
            afterCursor;

          quoteButton.style.display = 'none';

          messageBox.focus();
        }
      };
    } else {
      quoteButton.style.display = 'none';
    }
  });

  document.addEventListener('mousedown', function (e) {
    if (e.target !== quoteButton) {
      quoteButton.style.display = 'none';
    }
  });
});
