const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileNameEl = document.getElementById('fileName');
const clearBtn = document.getElementById('clearBtn');
const redactBtn = document.getElementById('redactBtn');

const sectionUpload = document.getElementById('sectionUpload');
const sectionProcessing = document.getElementById('sectionProcessing');
const sectionResults = document.getElementById('sectionResults');
const sectionError = document.getElementById('sectionError');

let selectedFile = null;

// ── Drag & drop ──────────────────────────────────────

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('drag-over');
  }
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showError('Please drop a PDF file.');
    return;
  }
  setFile(file);
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) setFile(fileInput.files[0]);
});

clearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearFile();
});

// ── File state ───────────────────────────────────────

function setFile(file) {
  selectedFile = file;
  fileNameEl.textContent = file.name;
  filePreview.classList.remove('hidden');
  redactBtn.disabled = false;
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  filePreview.classList.add('hidden');
  redactBtn.disabled = true;
}

// ── Redact action ─────────────────────────────────────

redactBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  showSection('processing');

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const response = await fetch('/redact', { method: 'POST', body: formData });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Redaction failed.');
    showResults(data);
  } catch (err) {
    showError(err.message || 'An unexpected error occurred.');
  }
});

// ── Results ───────────────────────────────────────────

function showResults(data) {
  const totalEl = document.getElementById('totalCount');
  const subtitleEl = document.getElementById('resultSubtitle');
  const grid = document.getElementById('findingsGrid');
  const downloadBtn = document.getElementById('downloadBtn');

  totalEl.textContent = `${data.total} item${data.total !== 1 ? 's' : ''} redacted`;
  subtitleEl.textContent = data.total > 0
    ? 'Sensitive data has been permanently removed.'
    : 'No PII was detected in this document.';

  grid.innerHTML = '';

  if (data.total === 0) {
    grid.innerHTML =
      '<p class="no-findings">No PII patterns matched. Unlabeled names and non-standard formats may not be detected — review the output before sharing.</p>';
  } else {
    for (const [type, count] of Object.entries(data.summary)) {
      const card = document.createElement('div');
      card.className = 'finding-card';
      card.innerHTML = `<span class="finding-type">${escHtml(type)}</span><span class="finding-count">${count}</span>`;
      grid.appendChild(card);
    }
  }

  downloadBtn.href = `/download/${data.file_id}`;
  showSection('results');
}

// ── Error ─────────────────────────────────────────────

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  showSection('error');
}

document.getElementById('retryBtn').addEventListener('click', () => {
  showSection('upload');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  clearFile();
  showSection('upload');
});

// ── Sections ─────────────────────────────────────────

function showSection(name) {
  sectionUpload.classList.toggle('hidden', name !== 'upload');
  sectionProcessing.classList.toggle('hidden', name !== 'processing');
  sectionResults.classList.toggle('hidden', name !== 'results');
  sectionError.classList.toggle('hidden', name !== 'error');
}

// ── Helpers ───────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
