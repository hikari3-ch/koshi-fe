document.addEventListener('DOMContentLoaded', function () {
  try {
    const postPasswords = JSON.parse(localStorage.getItem('postingPasswords') || '{}');

    const boardUri = window.location.pathname.split('/')[1];

    const pathParts = window.location.pathname.split('/');
    const isThreadPage = pathParts.length >= 4 && pathParts[2] === 'thread';
    const threadId = isThreadPage ? pathParts[3] : null;

    const nameElements = document.querySelectorAll('.name[data-post-id][data-board]');

    nameElements.forEach((nameElement) => {
      const postId = nameElement.getAttribute('data-post-id');
      const postBoard = nameElement.getAttribute('data-board');

      if (postBoard !== boardUri) return;

      let postKey;

      const isReply = nameElement.closest('.reply') !== null;

      if (isReply) {
        let replyThreadId = threadId;

        if (!replyThreadId) {
          const threadElement = nameElement.closest('.thread');
          if (threadElement) {
            replyThreadId = threadElement.id || threadElement.dataset.postId;
          }
        }

        if (replyThreadId) {
          postKey = `${boardUri}/${replyThreadId}/${postId}`;
        }
      } else {
        postKey = `${boardUri}/${postId}`;
      }

      if (postKey && postPasswords[postKey]) {
        nameElement.classList.add('youName');
      }
    });
  } catch (e) {
    console.error('Error checking post ownership:', e);
  }
});
