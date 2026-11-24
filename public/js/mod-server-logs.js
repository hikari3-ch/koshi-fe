(function () {
  const form = document.getElementById('server-logs-filter');
  if (!form) return;

  const fileEl = document.getElementById('log-file');
  const minLevelEl = document.getElementById('log-min-level');
  const levelEl = document.getElementById('log-level');
  const categoryEl = document.getElementById('log-category');
  const searchEl = document.getElementById('log-search');
  const limitEl = document.getElementById('log-limit');
  const refreshBtn = document.getElementById('log-refresh-btn');
  const autoRefreshEl = document.getElementById('log-auto-refresh');
  const downloadLink = document.getElementById('log-download-link');
  const prevBtn = document.getElementById('log-prev-btn');
  const nextBtn = document.getElementById('log-next-btn');
  const pageInfo = document.getElementById('log-page-info');
  const tbody = document.getElementById('server-logs-body');
  const activeFileEl = document.getElementById('log-active-file');

  let currentOffset = 0;
  let autoTimer = null;

  function csrfHeaders(extra) {
    const token = window.csrfToken ? window.csrfToken() : '';
    return Object.assign({ 'Content-Type': 'application/json', 'X-CSRF-Token': token }, extra || {});
  }

  function makeDetails(label, text) {
    const details = document.createElement('details');
    details.className = 'log-details';
    const summary = document.createElement('summary');
    summary.textContent = label;
    const pre = document.createElement('pre');
    pre.className = 'mod-code';
    pre.textContent = text;
    details.append(summary, pre);
    return details;
  }

  function renderEntries(data) {
    if (activeFileEl) activeFileEl.textContent = data.file || 'in-memory buffer';

    const stats = data.stats || {};
    ['total', 'fatal', 'error', 'warn', 'info', 'debug'].forEach((k) => {
      const el = document.getElementById('log-stat-' + k);
      if (el) el.textContent = String(stats[k] ?? 0);
    });

    if (Array.isArray(data.files)) {
      const prevFile = fileEl.value;
      fileEl.innerHTML = '';
      if (!data.files.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'In-memory buffer';
        fileEl.appendChild(opt);
      } else {
        data.files.forEach((f) => {
          const opt = document.createElement('option');
          opt.value = f.name;
          opt.textContent = `${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
          if (f.name === (prevFile || data.file)) opt.selected = true;
          fileEl.appendChild(opt);
        });
      }
    }

    if (Array.isArray(data.categories)) {
      const prevCat = categoryEl.value;
      categoryEl.innerHTML = '';
      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = 'All categories';
      categoryEl.appendChild(allOpt);
      data.categories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === prevCat) opt.selected = true;
        categoryEl.appendChild(opt);
      });
    }

    if (downloadLink) {
      if (data.file) {
        downloadLink.href = '/mod/api/server-logs/download?file=' + encodeURIComponent(data.file);
        downloadLink.style.display = '';
      } else {
        downloadLink.style.display = 'none';
      }
    }

    tbody.innerHTML = '';
    const entries = data.entries || [];
    if (!entries.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.className = 'mod-hint';
      td.textContent = 'No log entries matched the current filters.';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      entries.forEach((entry) => {
        const lvl = String(entry.level || 'info').toLowerCase();
        const tr = document.createElement('tr');
        tr.className = `log-row log-row-${lvl}`;

        const tsTd = document.createElement('td');
        tsTd.className = 'log-ts';
        const tsCode = document.createElement('code');
        tsCode.textContent = entry.ts || '-';
        tsTd.appendChild(tsCode);

        const lvlTd = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `log-level-badge log-level-${lvl}`;
        badge.textContent = lvl.toUpperCase();
        lvlTd.appendChild(badge);

        const catTd = document.createElement('td');
        const catCode = document.createElement('code');
        catCode.textContent = entry.category || 'app';
        catTd.appendChild(catCode);

        const msgTd = document.createElement('td');
        msgTd.className = 'log-msg-cell';
        const msgDiv = document.createElement('div');
        msgDiv.className = 'log-msg-text';
        msgDiv.textContent = entry.msg || '';
        msgTd.appendChild(msgDiv);
        if (entry.meta) msgTd.appendChild(makeDetails('Metadata', JSON.stringify(entry.meta, null, 2)));
        if (entry.stack) msgTd.appendChild(makeDetails('Stack Trace', String(entry.stack)));

        tr.append(tsTd, lvlTd, catTd, msgTd);
        tbody.appendChild(tr);
      });
    }

    const limit = Number(data.limit) || 100;
    const total = Number(data.total) || 0;
    const offset = Number(data.offset) || 0;
    currentOffset = offset;
    const startNum = total ? offset + 1 : 0;
    const endNum = offset + entries.length;
    pageInfo.textContent = `Showing ${startNum}-${endNum} of ${total}`;
    prevBtn.disabled = offset <= 0;
    nextBtn.disabled = offset + limit >= total;
  }

  async function fetchLogs(offset) {
    const params = new URLSearchParams();
    if (fileEl.value) params.set('file', fileEl.value);
    if (minLevelEl.value) params.set('minLevel', minLevelEl.value);
    if (levelEl.value) params.set('level', levelEl.value);
    if (categoryEl.value) params.set('category', categoryEl.value);
    if (searchEl.value.trim()) params.set('search', searchEl.value.trim());
    params.set('limit', limitEl.value || '100');
    params.set('offset', String(Math.max(0, offset)));

    const res = await fetch('/mod/api/server-logs?' + params.toString(), { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load logs');
    renderEntries(data);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    fetchLogs(0).catch((err) => alert(err.message));
  });

  [fileEl, minLevelEl, levelEl, categoryEl, limitEl].forEach((el) => {
    el.addEventListener('change', () => fetchLogs(0).catch((err) => alert(err.message)));
  });

  refreshBtn.addEventListener('click', () => fetchLogs(currentOffset).catch((err) => alert(err.message)));

  prevBtn.addEventListener('click', () => {
    const limit = Number(limitEl.value) || 100;
    fetchLogs(Math.max(0, currentOffset - limit)).catch((err) => alert(err.message));
  });

  nextBtn.addEventListener('click', () => {
    const limit = Number(limitEl.value) || 100;
    fetchLogs(currentOffset + limit).catch((err) => alert(err.message));
  });

  autoRefreshEl.addEventListener('change', () => {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    if (autoRefreshEl.checked) {
      autoTimer = setInterval(() => {
        if (!document.hidden) fetchLogs(0).catch(() => {});
      }, 5000);
    }
  });

  const cfgForm = document.getElementById('logging-settings-form');
  if (cfgForm) {
    cfgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('logging-settings-status');
      const fd = new FormData(cfgForm);
      const payload = {
        level: fd.get('level'),
        maxFileSizeMB: Number(fd.get('maxFileSizeMB')),
        maxFiles: Number(fd.get('maxFiles')),
        logRequests: Boolean(cfgForm.querySelector('input[name="logRequests"]')?.checked),
        console: Boolean(cfgForm.querySelector('input[name="console"]')?.checked),
        redactIps: Boolean(cfgForm.querySelector('input[name="redactIps"]')?.checked)
      };
      try {
        const res = await fetch('/mod/api/server-logs/settings', {
          method: 'POST',
          credentials: 'same-origin',
          headers: csrfHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save logging settings');
        if (statusEl) statusEl.textContent = 'Saved.';
        fetchLogs(0).catch(() => {});
      } catch (err) {
        if (statusEl) statusEl.textContent = err.message;
      }
    });
  }
})();
