document.addEventListener('DOMContentLoaded', function () {
  const deleteForm = document.getElementById('delete-form');

  if (deleteForm) {
    deleteForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const selectedCheckboxes = document.querySelectorAll('.post-checkbox:checked');
      if (selectedCheckboxes.length === 0) {
        alert('No posts selected for deletion');
        return;
      }

      let storedPasswords = {};
      try {
        storedPasswords = JSON.parse(localStorage.getItem('postingPasswords') || '{}') || {};
      } catch {
        storedPasswords = {};
      }
      const boardUri = window.location.pathname.split('/')[1];

      let missingPasswords = [];
      let postPasswords = {};

      selectedCheckboxes.forEach((checkbox) => {
        const [postId, isThreadStr] = checkbox.value.split('-');
        const isThread = isThreadStr === 'true';

        let passwordFound = false;

        if (isThread) {
          const key = `${boardUri}/${postId}`;
          if (storedPasswords[key]) {
            postPasswords[postId] = storedPasswords[key];
            passwordFound = true;
          }
        } else {
          const pathParts = window.location.pathname.split('/');
          if (pathParts.length >= 4 && pathParts[2] === 'thread') {
            const threadId = pathParts[3];
            const key = `${boardUri}/${threadId}/${postId}`;
            if (storedPasswords[key]) {
              postPasswords[postId] = storedPasswords[key];
              passwordFound = true;
            }
          } else {
            const replyElement = document.querySelector(`.reply[data-post-id="${postId}"]`);
            if (replyElement) {
              const threadElement = replyElement.closest('.thread');
              if (threadElement) {
                const threadId = threadElement.id || threadElement.dataset.postId;
                if (threadId) {
                  const key = `${boardUri}/${threadId}/${postId}`;
                  if (storedPasswords[key]) {
                    postPasswords[postId] = storedPasswords[key];
                    passwordFound = true;
                  }
                }
              }
            }
          }
        }

        if (!passwordFound) {
          missingPasswords.push(postId);
        }
      });

      const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]*)/);
      let liveCsrf = '';
      if (match) {
        try {
          liveCsrf = decodeURIComponent(match[1]);
        } catch {
          liveCsrf = match[1];
        }
      }
      if (!liveCsrf && typeof window.refreshCsrfToken === 'function') {
        liveCsrf = (await window.refreshCsrfToken()) || '';
      }
      if (!liveCsrf) {
        liveCsrf = deleteForm.querySelector('input[name="_csrf"]')?.value || '';
      }

      if (missingPasswords.length > 0) {
        const password = prompt(`Enter password for post(s): ${missingPasswords.join(', ')}`);
        if (!password) return;

        const formData = new FormData(deleteForm);
        formData.append('password', password);
        if (liveCsrf) formData.set('_csrf', liveCsrf);

        const formAction = deleteForm.getAttribute('action');
        fetch(formAction, {
          method: 'POST',
          body: new URLSearchParams(formData)
        })
          .then((response) => {
            if (response.redirected) {
              window.location.href = response.url;
            } else {
              return response.text();
            }
          })
          .then((html) => {
            if (html) {
              document.open();
              document.write(html);
              document.close();
            }
          })
          .catch((error) => {
            console.error('Error:', error);
            alert('An error occurred while deleting posts');
          });
      } else {
        const newForm = document.createElement('form');
        newForm.method = 'POST';
        newForm.action = deleteForm.getAttribute('action');

        if (liveCsrf) {
          const csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = '_csrf';
          csrfInput.value = liveCsrf;
          newForm.appendChild(csrfInput);
        }

        const fileOnlyCheckbox = deleteForm.querySelector('input[name="fileOnly"]');
        if (fileOnlyCheckbox && fileOnlyCheckbox.checked) {
          const fileOnlyInput = document.createElement('input');
          fileOnlyInput.type = 'hidden';
          fileOnlyInput.name = 'fileOnly';
          fileOnlyInput.value = 'true';
          newForm.appendChild(fileOnlyInput);
        }

        selectedCheckboxes.forEach((checkbox) => {
          const [postId, isThreadStr] = checkbox.value.split('-');

          const postInput = document.createElement('input');
          postInput.type = 'hidden';
          postInput.name = 'posts';
          postInput.value = checkbox.value;
          newForm.appendChild(postInput);

          const passwordInput = document.createElement('input');
          passwordInput.type = 'hidden';
          passwordInput.name = `password_${postId}`;
          passwordInput.value = postPasswords[postId];
          newForm.appendChild(passwordInput);
        });

        const mainPasswordInput = document.createElement('input');
        mainPasswordInput.type = 'hidden';
        mainPasswordInput.name = 'password';
        mainPasswordInput.value = 'dummy';
        newForm.appendChild(mainPasswordInput);

        document.body.appendChild(newForm);
        newForm.submit();
      }
    });
  }
});
