const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { processSearch, processIndex } = require('./queryProcessor');
const { parseFile, parseBuffer } = require('./documentParser');
const { initSemanticEngine } = require('./semanticEngine');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Helper to recursively collect .txt, .pdf, and .docx files
function getFiles(dirPath, filesArray = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const name = path.join(dirPath, file);
    if (fs.statSync(name).isDirectory()) {
      // Ignore common folders to prevent permission/resource issues
      if (file !== 'node_modules' && file !== '.git' && file !== '.gemini') {
        getFiles(name, filesArray);
      }
    } else {
      const ext = file.toLowerCase().split('.').pop();
      if (ext === 'txt' || ext === 'pdf' || ext === 'docx') {
        filesArray.push(name);
      }
    }
  });
  return filesArray;
}

// Endpoint to index documents from a local directory
app.post('/index/dir', async (req, res) => {
  const { directoryPath } = req.body;

  if (!directoryPath) {
    return res.status(400).json({ error: 'directoryPath is required' });
  }

  if (!fs.existsSync(directoryPath)) {
    return res.status(404).json({ error: 'Directory does not exist' });
  }

  try {
    const targetFiles = getFiles(directoryPath);
    const documents = [];

    for (const filePath of targetFiles) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > 5 * 1024 * 1024) continue; // Skip files > 5MB for safety

        const content = await parseFile(filePath);
        if (content && content.trim().length > 0) {
          documents.push({
            id: path.basename(filePath),
            text: content,
            path: filePath // metadata
          });
        }
      } catch (err) {
        console.error(`Failed to parse file: ${filePath}`, err);
      }
    }

    const count = await processIndex(documents);
    res.status(200).json({ 
      message: `Successfully indexed ${count} files.`,
      filesFound: targetFiles.length
    });
  } catch (error) {
    console.error('Error scanning directory:', error);
    res.status(500).json({ error: 'Failed to scan directory. Check permissions.' });
  }
});

// Endpoint to upload and index documents directly via frontend upload
app.post('/index/upload', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  try {
    const documents = [];
    for (const file of req.files) {
      try {
        const ext = path.extname(file.originalname).slice(1).toLowerCase();
        if (!['txt', 'pdf', 'docx', 'md'].includes(ext)) {
          continue; // Skip unsupported extensions
        }

        const content = await parseBuffer(file.buffer, ext);
        if (content && content.trim().length > 0) {
          documents.push({
            id: file.originalname,
            text: content,
            path: `upload://${file.originalname}`
          });
        }
      } catch (err) {
        console.error(`Failed to parse uploaded file: ${file.originalname}`, err);
      }
    }

    if (documents.length === 0) {
      return res.status(400).json({ error: 'No valid or non-empty .txt, .pdf, or .docx files were processed.' });
    }

    const count = await processIndex(documents);
    res.status(200).json({
      message: `Successfully indexed ${count} uploaded files.`
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to process and index uploaded files.' });
  }
});

// Endpoint to index documents
// Request body should look like:
// { "documents": [{ "id": "doc1", "text": "Some sample text here" }] }
app.post('/index', async (req, res) => {
  const documents = req.body.documents;

  if (!documents || !Array.isArray(documents)) {
    return res.status(400).json({ error: 'Payload must contain a "documents" array.' });
  }

  try {
    const count = await processIndex(documents);
    res.status(200).json({ message: `Successfully indexed ${count} documents.` });
  } catch (error) {
    console.error('Error indexing documents:', error);
    res.status(500).json({ error: 'Internal server error during indexing.' });
  }
});

// Endpoint to search the indexed documents
// e.g. GET /search?q=what+is+node&mode=semantic
app.get('/search', async (req, res) => {
  const query = req.query.q;
  const mode = req.query.mode || 'keyword'; // 'keyword' or 'semantic'

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const results = await processSearch(query, mode);
    res.status(200).json({
      query: query,
      mode: mode,
      hits: results.length,
      results: results
    });
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: 'Internal server error during search execution.' });
  }
});

async function start() {
  try {
    // Pre-initialize semantic engine to download/cache the model at startup
    await initSemanticEngine();
  } catch (err) {
    console.error('Warning: Failed to load semantic model at startup. It will try loading on-demand.', err);
  }

  app.listen(PORT, () => {
    console.log(`Mini Search Engine running!`);
    console.log(`Try indexing at POST http://localhost:${PORT}/index`);
    console.log(`Or search at GET http://localhost:${PORT}/search?q=term`);
  });
}

start();
// -------- Persistence Endpoints --------
app.get('/export', (req, res) => {
  const dbPath = path.join(__dirname, 'db.json');
  if (fs.existsSync(dbPath)) {
    res.download(dbPath, 'db.json');
  } else {
    res.status(404).json({ error: 'Database file not found' });
  }
});

app.post('/import', upload.single('db'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No db file uploaded' });
  }
  const dbPath = path.join(__dirname, 'db.json');
  fs.writeFileSync(dbPath, req.file.buffer);
  // Reload indexer from new db
  indexer.load();
  res.json({ message: 'Database imported and index reloaded' });
});
