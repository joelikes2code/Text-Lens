const fs = require('fs');
const path = require('path');

class Indexer {
  constructor() {
    this.dbPath = path.join(__dirname, 'db.json');
    this.invertedIndex = new Map(); // token -> Map<docId, number[]> (list of word positions)
    this.documents = new Map();     // docId -> docObject
    this.docLengths = new Map();    // docId -> total token count (for TF normalization)
    this.embeddings = new Map();    // docId -> vector embedding
  }

  /**
   * Adds a document, its positional tokens, and embedding vector to the index.
   * @param {Object} doc - Document object, must contain {id, text}
   * @param {Array<{term: string, position: number}>} positionalTokens - Token array with positions
   * @param {number[]} embedding - Array of floats representing the document's vector embedding
   */
  addDocument(doc, positionalTokens, embedding = null) {
    if (!doc.id || !doc.text) return;

    // Store the document, its token length, and embedding
    this.documents.set(doc.id, doc);
    this.docLengths.set(doc.id, positionalTokens.length);
    if (embedding) {
      this.embeddings.set(doc.id, embedding);
    }

    // Update the inverted index with positions
    for (const { term, position } of positionalTokens) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Map());
      }
      const postings = this.invertedIndex.get(term);
      if (!postings.has(doc.id)) {
        postings.set(doc.id, []);
      }
      postings.get(doc.id).push(position);
    }
  }

  /**
   * Retrieves the posting list for a given term.
   * @param {string} term 
   * @returns {Map<string, number[]>} A map of docId to positions array, or empty map if term not found.
   */
  getPostingList(term) {
    return this.invertedIndex.get(term) || new Map();
  }

  /**
   * Retrieve a document by its ID.
   * @param {string} docId 
   * @returns {Object|undefined} The document object or undefined.
   */
  getDocument(docId) {
    return this.documents.get(docId);
  }

  getTotalDocuments() {
    return this.documents.size;
  }

  /**
   * Returns the total token count for a given document (used for TF normalization).
   * @param {string} docId
   * @returns {number}
   */
  getDocLength(docId) {
    return this.docLengths.get(docId) || 1;
  }

  getEmbedding(docId) {
    return this.embeddings.get(docId);
  }

  getAllEmbeddings() {
    return this.embeddings;
  }

  /**
   * Returns all unique vocabulary terms indexed.
   * @returns {string[]}
   */
  getVocabulary() {
    return Array.from(this.invertedIndex.keys());
  }

  /**
   * Returns the inverted index as a plain object mapping
   * each word to an array of document IDs.
   * @returns {Object} e.g. { "node": ["1", "2"], "express": ["2"] }
   */
  getIndex() {
    const result = {};
    for (const [term, postings] of this.invertedIndex.entries()) {
      result[term] = Array.from(postings.keys());
    }
    return result;
  }

  /**
   * Serializes the in-memory database to a file.
   */
  save() {
    try {
      const data = {
        invertedIndex: Array.from(this.invertedIndex.entries()).map(([term, postings]) => [
          term,
          Array.from(postings.entries())
        ]),
        documents: Array.from(this.documents.entries()),
        docLengths: Array.from(this.docLengths.entries()),
        embeddings: Array.from(this.embeddings.entries())
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
      console.log('Database successfully saved to db.json');
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  /**
   * Deserializes the database from a file if it exists.
   */
  load() {
    if (!fs.existsSync(this.dbPath)) {
      console.log('No existing db.json found. Starting with empty database.');
      return;
    }
    try {
      const raw = fs.readFileSync(this.dbPath, 'utf8');
      const data = JSON.parse(raw);

      this.invertedIndex = new Map(
        data.invertedIndex.map(([term, postings]) => [
          term,
          new Map(postings)
        ])
      );
      this.documents = new Map(data.documents);
      this.docLengths = new Map(data.docLengths);
      this.embeddings = new Map(data.embeddings);
      console.log(`Database loaded from db.json. Total documents: ${this.documents.size}`);
    } catch (err) {
      console.error('Error loading database from file:', err);
    }
  }
}

// Export as singleton so the whole app shares the same index
const indexerInstance = new Indexer();
indexerInstance.load();

module.exports = indexerInstance;
