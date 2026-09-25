document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('archive-search-input');
  const sortSelect = document.getElementById('sort-select');
  const threadContainer = document.getElementById('thread-container');

  searchInput.addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const threads = threadContainer.getElementsByClassName('archive-thread');

    Array.from(threads).forEach((thread) => {
      const text = thread.querySelector('.archive-col-content')?.innerText.toLowerCase() || '';
      const shouldShow = text.includes(searchTerm);
      thread.style.display = shouldShow ? '' : 'none';
    });
  });

  function sortThreads(sortBy) {
    const threads = Array.from(threadContainer.getElementsByClassName('archive-thread'));

    threads.sort((a, b) => {
      switch (sortBy) {
        case 'threadId':
          return parseInt(b.dataset.id) - parseInt(a.dataset.id);
        case 'creation':
          return new Date(b.dataset.creation) - new Date(a.dataset.creation);
        case 'bump':
          return new Date(b.dataset.bump) - new Date(a.dataset.bump);
        case 'reply':
          return parseInt(b.dataset.replies) - parseInt(a.dataset.replies);
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

  function formatDate() {
    const threads = Array.from(threadContainer.getElementsByClassName('archive-thread'));

    threads.forEach((thread) => {
      const date = new Date(thread.dataset.creation);
      const formattedDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const dateSpan = thread.querySelector('.archived-thread-date');
      dateSpan.textContent = formattedDate;
    });

    threads.forEach((thread) => {
      const date = new Date(thread.dataset.expiration);
      const formattedDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const dateSpan = thread.querySelector('.archived-thread-expiration-date');
      if (formattedDate == 'Invalid Date') {
        dateSpan.textContent = 'Never';
      } else {
        dateSpan.textContent = formattedDate;
      }
    });
  }

  formatDate();
});
