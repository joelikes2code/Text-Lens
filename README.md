# Text Lens

**Text Lens** is a lightweight, self‑contained search engine that lets you index and query plain‑text (`.txt`), PDF (`.pdf`), and Word (`.docx`) documents.

It supports:

- **Keyword search** (TF‑IDF ranking)
- **Phrase search** ("exact phrase")
- **Boolean operators** (`AND`, `OR`, `NOT`)
- **Fuzzy matching** (Levenshtein distance ≤ 1)
- **Semantic search** (vector embeddings via the `all‑MiniLM‑L6‑v2` model)

All data is persisted locally in a simple `db.json` file, meaning no external databases or cloud services are required.

---

## 🚀 Quick Start

1. **Clone / download** this repo.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the server:
   ```bash
   node server.js
   ```
4. Open a browser at `http://localhost:3000` and start indexing/searching.

### Adding Documents

- **Upload** `.txt`, `.pdf`, or `.docx` files via the UI.
- **Scan a folder** (e.g., `C:\Notes`) using the “Scan & Index Folder” button.
- **Manual entry** – type an ID and paste text.

### Export / Import Index

- **Export**: `GET /export` downloads `db.json`.
- **Import**: `POST /import` with a `db.json` file reloads the index.

---

## 🛠️ Tech Stack

- **Node.js** (runtime) + **Express** (HTTP server)  
- **Multer** (in‑memory file uploads)  
- **pdf‑parse**, **docx** (document parsing)  
- **@xenova/transformers** (semantic embeddings)  
- **Vanilla HTML/CSS/JS** – the UI lives in `public/`  
- **JSON persistence** (`db.json`)

---

## 📂 Project Structure

```
/public
   index.html      – UI
   style.css       – dark glass‑morphism theme
   app.js          – front‑end logic
/server.js          – Express routes, upload, persistence
/documentParser.js  – buffer‑based parsers (txt, pdf, docx)
/indexer.js         – inverted index, embeddings storage
/queryParser.js     – tokenization, boolean/phrase/fuzzy parsing
/queryProcessor.js – search orchestration (TF‑IDF & semantic)
/ranker.js          – TF‑IDF and cosine similarity ranking
```

---

## 🤝 Contributing

1. Fork the repo.
2. Create a feature branch.
3. Submit a pull request with a clear description.

Feel free to open issues for bugs or suggestions.

---

## 📄 License

MIT – see the `LICENSE` file for details.

---

### 🎉 Enjoy searching with Text Lens!
