const searchInput = document.getElementById('search-input');
const resultsList = document.getElementById('results-list');
const resultCount = document.getElementById('result-count');
const seedBtn = document.getElementById('seed-btn');
const toast = document.getElementById('toast');

const modeKeywordBtn = document.getElementById('mode-keyword-btn');
const modeSemanticBtn = document.getElementById('mode-semantic-btn');

let currentMode = 'keyword';
let debounceTimer;

// Sample documents to populate the search engine
const sampleData = {
    documents: [
        { id: "NODE.txt", text: "Node.js is an open-source, cross-platform, JavaScript runtime environment that executes core logic on the server." },
        { id: "JS.txt", text: "JavaScript (JS) is a lightweight, interpreted programming language with first-class functions that powers the web." },
        { id: "EXPRESS.docx", text: "Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications." },
        { id: "SEARCH.pdf", text: "A search engine is a software system that is designed to carry out web searches, which means to search for information." },
        { id: "TFIDF.txt", text: "TF-IDF stands for Term Frequency-Inverse Document Frequency. It is a numerical statistic used in information retrieval." },
        { id: "NATURE.docx", text: "Deep in the forest, the ancient trees whisper as the wind dances through their emerald leaves." },
        { id: "HISTORY.pdf", text: "The ancient library of Alexandria was once the center of knowledge and culture in the Mediterranean world." },
        { id: "AI.txt", text: "Artificial Intelligence is the simulation of human intelligence processes by machines, especially computer systems." },
        { id: "CHESS.txt", text: "Chess is a strategy game for two players, played on a checkered board with sixty-four squares arranged in an 8x8 grid." }
    ]
};

// --- Core Search Logic ---

async function performSearch(query) {
    if (!query.trim()) {
        renderResults([], "");
        return;
    }

    try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}&mode=${currentMode}`);
        const data = await response.json();
        
        renderResults(data.results, query);
        resultCount.textContent = `${data.hits} result${data.hits !== 1 ? 's' : ''} found`;
    } catch (err) {
        console.error('Search failed:', err);
    }
}

// --- Highlighting Logic ---

function highlightText(text, query) {
    const terms = query.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 0 && t.length > 2); // Filter out very short parts

    if (terms.length === 0) return text;

    let highlighted = text;
    const sortedTerms = [...new Set(terms)].sort((a,b) => b.length - a.length);

    sortedTerms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>');
    });

    return highlighted;
}

// --- UI Rendering ---

function renderResults(results, query) {
    resultsList.innerHTML = '';
    
    if (results.length === 0) {
        resultsList.innerHTML = `
            <div class="empty-state">
                ${query ? 'No matching documents found.' : 'Start typing to see results instantly...'}
            </div>`;
        resultCount.textContent = '';
        return;
    }

    results.forEach(result => {
        const li = document.createElement('li');
        li.className = 'result-card';
        
        // Extract extension label if present
        const extMatch = result.docId.match(/\.([a-zA-Z0-9]+)$/);
        const extBadge = extMatch ? `<span class="doc-ext">${extMatch[1]}</span>` : '';
        const cleanDocId = extMatch ? result.docId.slice(0, -(extMatch[1].length + 1)) : result.docId;
        
        const highlightedText = highlightText(result.snippet || '', query);
        
        const scoreLabel = currentMode === 'semantic' ? 'Similarity' : 'TF-IDF';
        
        li.innerHTML = `
            <span class="score">${scoreLabel}: ${result.score.toFixed(4)}</span>
            <div class="doc-id">${cleanDocId}${extBadge}</div>
            <p>${highlightedText}</p>
        `;
        resultsList.appendChild(li);
    });
}

// --- Event Listeners ---

searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        performSearch(query);
    }, 300);
});

// Mode selector controls
modeKeywordBtn.addEventListener('click', () => {
    if (currentMode === 'keyword') return;
    currentMode = 'keyword';
    modeKeywordBtn.classList.add('active');
    modeSemanticBtn.classList.remove('active');
    if (searchInput.value.trim()) performSearch(searchInput.value);
});

modeSemanticBtn.addEventListener('click', () => {
    if (currentMode === 'semantic') return;
    currentMode = 'semantic';
    modeSemanticBtn.classList.add('active');
    modeKeywordBtn.classList.remove('active');
    if (searchInput.value.trim()) performSearch(searchInput.value);
});

seedBtn.addEventListener('click', async () => {
    seedBtn.textContent = 'Model loading / Indexing...';
    seedBtn.disabled = true;
    try {
        const response = await fetch('/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sampleData)
        });
        
        if (response.ok) {
            showToast('Sample documents successfully indexed!');
            if (searchInput.value) performSearch(searchInput.value);
        }
    } catch (err) {
        console.error('Indexing failed:', err);
    } finally {
        seedBtn.textContent = 'Index Sample Data';
        seedBtn.disabled = false;
    }
});

// --- Entry Panel Logic ---

const togglePanelBtn = document.getElementById('toggle-panel-btn');
const entryPanel = document.getElementById('entry-panel');
const addDocBtn = document.getElementById('add-doc-btn');
const docIdInput = document.getElementById('doc-id-input');
const docTextInput = document.getElementById('doc-text-input');

const scanDirBtn = document.getElementById('scan-dir-btn');
const dirPathInput = document.getElementById('dir-path-input');

togglePanelBtn.addEventListener('click', () => {
    entryPanel.classList.toggle('hidden');
    togglePanelBtn.textContent = entryPanel.classList.contains('hidden') ? 'Add New Document' : 'Close Panel';
});

addDocBtn.addEventListener('click', async () => {
    const id = docIdInput.value.trim();
    const text = docTextInput.value.trim();

    if (!id || !text) {
        alert('Please provide both an ID and content for the document.');
        return;
    }

    addDocBtn.textContent = 'Indexing...';
    addDocBtn.disabled = true;

    try {
        const response = await fetch('/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documents: [{ id, text }]
            })
        });

        if (response.ok) {
            showToast('Document successfully indexed!');
            docIdInput.value = '';
            docTextInput.value = '';
            entryPanel.classList.add('hidden');
            togglePanelBtn.textContent = 'Add New Document';
            
            if (searchInput.value) performSearch(searchInput.value);
        }
    } catch (err) {
        console.error('Manual indexing failed:', err);
    } finally {
        addDocBtn.textContent = 'Index Document';
        addDocBtn.disabled = false;
    }
});

scanDirBtn.addEventListener('click', async () => {
    const directoryPath = dirPathInput.value.trim();

    if (!directoryPath) {
        alert('Please provide an absolute directory path.');
        return;
    }

    scanDirBtn.textContent = 'Scanning / Embedding...';
    scanDirBtn.disabled = true;

    try {
        const response = await fetch('/index/dir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ directoryPath })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message);
            dirPathInput.value = '';
            entryPanel.classList.add('hidden');
            togglePanelBtn.textContent = 'Add New Document';
            if (searchInput.value) performSearch(searchInput.value);
        } else {
            alert(data.error || 'Failed to scan directory.');
        }
    } catch (err) {
        console.error('Directory scan failed:', err);
    } finally {
        scanDirBtn.textContent = 'Scan & Index Folder';
        scanDirBtn.disabled = false;
    }
});

// --- File Upload Logic ---

const dropZone = document.getElementById('drop-zone');
const fileUploadInput = document.getElementById('file-upload-input');
const selectedFilesList = document.getElementById('selected-files-list');
const uploadFilesBtn = document.getElementById('upload-files-btn');

let filesToUpload = [];

function updateSelectedFilesUI() {
    selectedFilesList.innerHTML = '';
    filesToUpload.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'selected-file-item';
        
        // Human readable file size
        const sizeKB = (file.size / 1024).toFixed(1);
        
        item.innerHTML = `
            <span>${file.name} (${sizeKB} KB)</span>
            <button class="remove-file" data-index="${index}">Remove</button>
        `;
        selectedFilesList.appendChild(item);
    });

    uploadFilesBtn.disabled = filesToUpload.length === 0;
}

// Drag & drop handlers
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    handleNewFiles(files);
});

fileUploadInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleNewFiles(files);
});

function handleNewFiles(files) {
    const allowedExtensions = ['txt', 'pdf', 'docx', 'md'];
    
    files.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            alert(`Unsupported file format: .${ext}. Only .txt, .pdf, .docx, and .md files are supported.`);
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Max allowed size is 5MB.`);
            return;
        }

        // Avoid adding duplicates
        if (!filesToUpload.some(f => f.name === file.name && f.size === file.size)) {
            filesToUpload.push(file);
        }
    });

    updateSelectedFilesUI();
}

selectedFilesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-file')) {
        const index = parseInt(e.target.getAttribute('data-index'), 10);
        filesToUpload.splice(index, 1);
        updateSelectedFilesUI();
    }
});

uploadFilesBtn.addEventListener('click', async () => {
    if (filesToUpload.length === 0) return;

    uploadFilesBtn.textContent = 'Uploading & Indexing...';
    uploadFilesBtn.disabled = true;

    const formData = new FormData();
    filesToUpload.forEach(file => {
        formData.append('files', file);
    });

    try {
        const response = await fetch('/index/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message || 'Files successfully indexed!');
            filesToUpload = [];
            fileUploadInput.value = '';
            updateSelectedFilesUI();
            
            // Auto close panel
            entryPanel.classList.add('hidden');
            togglePanelBtn.textContent = 'Add New Document';
            
            // Re-run search if a search query is active
            if (searchInput.value) performSearch(searchInput.value);
        } else {
            alert(data.error || 'Failed to index uploaded files.');
        }
    } catch (err) {
        console.error('File upload failed:', err);
        alert('An error occurred during file upload.');
    } finally {
        uploadFilesBtn.textContent = 'Index Uploaded Files';
        uploadFilesBtn.disabled = filesToUpload.length === 0;
    }
});

function showToast(message) {
    if (message) toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
