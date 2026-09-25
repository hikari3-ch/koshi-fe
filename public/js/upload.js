const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('image');
const previewContainer = document.getElementById('preview-container');
const form =
  document.getElementById('post-form') ||
  document.getElementById('submit-form') ||
  document.getElementById('reply-form') ||
  document.getElementById('quick-reply-form');

const maxFilesLimit = Math.max(
  1,
  parseInt(
    form?.getAttribute('data-max-files') ||
      document.getElementById('quick-reply-form')?.getAttribute('data-max-files') ||
      '3',
    10
  ) || 3
);

// Only set up QR drop zone if we're on a thread page (check for QR element)
const isThreadPage = document.getElementById('quick-reply') !== null;
const dropZone_QR = isThreadPage ? document.getElementById('qr-drop-zone') : null;
const previewContainer_QR = isThreadPage ? document.getElementById('qr-preview-container') : null;

let currentFiles = [];

Object.defineProperty(window, 'currentFiles', {
  get: function () {
    return currentFiles;
  },
  set: function (value) {
    currentFiles = value;
  }
});

fileInput.removeAttribute('required');
fileInput.setAttribute('multiple', 'true');
fileInput.setAttribute('max', String(maxFilesLimit));

// Set up main drop zone
dropZone.addEventListener('click', () => {
  fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = 'var(--small-button)';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.backgroundColor = 'var(--background-gradient)';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = 'var(--background-gradient)';
  const files = Array.from(e.dataTransfer.files);
  handleFilesUpload(files);
});

// Set up QR drop zone only if it exists
if (dropZone_QR) {
  dropZone_QR.addEventListener('click', () => {
    fileInput.click();
  });

  dropZone_QR.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = 'var(--small-button)';
  });

  dropZone_QR.addEventListener('dragleave', () => {
    dropZone.style.backgroundColor = 'var(--background-gradient)';
  });

  dropZone_QR.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = 'var(--background-gradient)';
    const files = Array.from(e.dataTransfer.files);
    handleFilesUpload(files);
  });
}

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  window.currentFiles = [];
  const previewItems = previewContainer.querySelectorAll('.preview-item');
  previewItems.forEach((item) => item.remove());
  if (previewContainer_QR) {
    const qrPreviews = previewContainer_QR.querySelectorAll('.preview-text');
    qrPreviews.forEach((item) => item.remove());
  }
  handleFilesUpload(files);
  updateFileInput();
});

document.addEventListener('paste', (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  const files = [];
  let hasFiles = false;

  for (const item of items) {
    if (item.kind === 'file') {
      hasFiles = true;
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  if (hasFiles) {
    e.preventDefault();
    handleFilesUpload(files);
  }
});

function isTegakiReplayFile(file) {
  return file.type === 'tegaki/replay' || (file.name || '').toLowerCase().endsWith('.tgkr');
}

function visibleFileCount() {
  return currentFiles.filter((f) => !isTegakiReplayFile(f)).length;
}

function handleFilesUpload(files) {
  const incomingVisible = Array.from(files).filter((f) => !isTegakiReplayFile(f)).length;
  if (visibleFileCount() + incomingVisible > maxFilesLimit) {
    alert(`Maximum ${maxFilesLimit} files allowed`);
    return;
  }

  files.forEach((file) => {
    if (isTegakiReplayFile(file)) {
      currentFiles.push(file);
      window.currentFiles = currentFiles;
      updateFileInput();
      return;
    }

    if (visibleFileCount() >= maxFilesLimit) return;

    const reader = new FileReader();
    const previewDiv = document.createElement('div');
    previewDiv.className = 'preview-item';

    const previewImage = document.createElement('img');
    const fileInfo = document.createElement('div');
    fileInfo.className = 'preview-text';
    const removeButton = document.createElement('button');
    removeButton.textContent = '×';
    removeButton.className = 'remove-file';
    removeButton.type = 'button';

    reader.onload = function (e) {
      if (file.type.startsWith('image/')) {
        previewImage.src = e.target.result;
      } else {
        previewImage.src = '/genericThumb.webp';
      }
    };

    reader.readAsDataURL(file);

    fileInfo.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

    const spoilerLabel = document.createElement('label');
    spoilerLabel.style.marginTop = '5px';
    spoilerLabel.style.display = 'block';
    spoilerLabel.style.color = 'var(--file-info-color)';
    spoilerLabel.innerHTML = `
      <input type="checkbox" name="spoiler" value="${currentFiles.length}">
      Spoiler
    `;

    previewDiv.appendChild(previewImage);
    previewDiv.appendChild(fileInfo);
    previewDiv.appendChild(spoilerLabel);
    previewDiv.appendChild(removeButton);
    previewContainer.appendChild(previewDiv);

    if (previewContainer_QR) {
      const qrAppend = document.createElement('div');
      qrAppend.className = 'preview-text';
      qrAppend.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      previewContainer_QR.appendChild(qrAppend);
    }

    currentFiles.push(file);
    window.currentFiles = currentFiles;

    removeButton.addEventListener('click', () => {
      previewDiv.remove();
      if (previewContainer_QR) {
        const qrPreviews = previewContainer_QR.querySelectorAll('.preview-text');
        qrPreviews[currentFiles.filter((f) => !isTegakiReplayFile(f)).indexOf(file)]?.remove();
      }
      const removeSet = new Set([file]);
      if ((file.name || '').endsWith('-tegaki.png')) {
        const stem = file.name.slice(0, -3);
        currentFiles.forEach((f) => {
          if (isTegakiReplayFile(f) && f.name.slice(0, -4) === stem) removeSet.add(f);
        });
      }
      currentFiles = currentFiles.filter((f) => !removeSet.has(f));
      window.currentFiles = currentFiles;
      updateFileInput();
    });

    updateFileInput();
  });
}

function updateFileInput() {
  const dataTransfer = new DataTransfer();
  currentFiles.forEach((file) => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;
}

window.updateFileInput = updateFileInput;

if (form) {
  form.addEventListener('submit', (e) => {
  // Skip validation if the clicked button has data-no-upload-check="true"
  if (e.submitter && e.submitter.getAttribute('data-no-upload-check') === 'true') {
    return; // Allow the form to submit without validation
  }

  updateFileInput();

  const requiresFile =
    form.id !== 'reply-form' &&
    form.id !== 'quick-reply-form' &&
    form.getAttribute('data-requires-file') !== 'false';

  if (!fileInput.files.length && requiresFile) {
    e.preventDefault();
    alert('Please select at least one file before submitting.');
    return;
  }

  // Get all checked spoiler checkboxes
  const checkedSpoilers = Array.from(document.querySelectorAll('input[name="spoiler"]:checked')).map((checkbox) => checkbox.value);

  // Create hidden input for spoiler information
  if (checkedSpoilers.length > 0) {
    let existingSpoilerInput = form.querySelector('input[name="spoilers"]');
    if (existingSpoilerInput) {
      existingSpoilerInput.remove();
    }
    const spoilerInput = document.createElement('input');
    spoilerInput.type = 'hidden';
    spoilerInput.name = 'spoiler';
    spoilerInput.value = JSON.stringify(checkedSpoilers);
    form.appendChild(spoilerInput);
  }
  });
}
