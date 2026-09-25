document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('catalog-search-input');
  const threadContainer = document.getElementById('thread-container');
  const sortSelect = document.getElementById('sort-select');

  searchInput.addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const threads = threadContainer.getElementsByClassName('catalog-thread');

    Array.from(threads).forEach((thread) => {
      const subject = thread.querySelector('.thread-subject')?.innerText.toLowerCase() || '';
      const text = thread.querySelector('.thread-text')?.innerText.toLowerCase() || '';
      const shouldShow = subject.includes(searchTerm) || text.includes(searchTerm);
      thread.style.display = shouldShow ? '' : 'none';
    });
  });

  function sortThreads(sortBy) {
    const threads = Array.from(threadContainer.getElementsByClassName('catalog-thread'));

    threads.sort((a, b) => {
      const aPinned = a.dataset.pinned === 'true';
      const bPinned = b.dataset.pinned === 'true';
      if (aPinned !== bPinned) return bPinned ? 1 : -1;

      switch (sortBy) {
        case 'bump':
          return new Date(b.dataset.bump) - new Date(a.dataset.bump);
        case 'reply':
          return parseInt(b.dataset.replies) - parseInt(a.dataset.replies);
        case 'creation':
          return new Date(b.dataset.creation) - new Date(a.dataset.creation);
        default:
          return 0;
      }
    });

    threads.forEach((thread) => threadContainer.appendChild(thread));
  }

  sortSelect.addEventListener('change', function () {
    sortThreads(this.value);
  });

  sortThreads('bump');
});
