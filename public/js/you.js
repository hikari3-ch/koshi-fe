function markYouPosts() {
  try {
    const postPasswords = JSON.parse(localStorage.getItem('postingPasswords') || '{}');

    const pathParts = window.location.pathname.split('/');
    const boardUri = pathParts[1];
    const isThreadPage = pathParts.length >= 4 && pathParts[2] === 'thread';
    const threadId = isThreadPage ? pathParts[3] : null;

    const nameElements = document.querySelectorAll('.name[data-post-id][data-board]');

    nameElements.forEach((nameElement) => {
      const postId = nameElement.getAttribute('data-post-id');
      const postBoard = nameElement.getAttribute('data-board');

      if (boardUri && boardUri !== 'all' && postBoard !== boardUri) return;

      let postKey;
      const isReply = nameElement.closest('.reply') !== null;

      if (isReply) {
        let replyThreadId = threadId || nameElement.getAttribute('data-thread-id');

        if (!replyThreadId) {
          const threadElement = nameElement.closest('.thread');
          if (threadElement) {
            replyThreadId = threadElement.id || threadElement.dataset.postId;
          }
        }

        if (replyThreadId) {
          postKey = `${postBoard}/${replyThreadId}/${postId}`;
        }
      } else {
        postKey = `${postBoard}/${postId}`;
      }

      if (postKey && postPasswords[postKey]) {
        nameElement.classList.add('youName');
      }
    });

    if (window.backlinks && typeof window.backlinks.init === 'function') {
      window.backlinks.init();
    }
    if (window.stylePanel && typeof window.stylePanel.annotatePosts === 'function') {
      window.stylePanel.annotatePosts();
    }
  } catch (e) {
    console.error('Error checking post ownership:', e);
  }
}

window.markYouPosts = markYouPosts;
document.addEventListener('DOMContentLoaded', markYouPosts);
document.addEventListener('contentAdded', markYouPosts);
