// Simple verification script for boolean, phrase, fuzzy, and semantic search
// Run with: node test_search.js

const { processIndex, processSearch } = require('./queryProcessor');
const indexer = require('./indexer');

(async () => {
  // Reset index (clear any existing data)
  indexer.invertedIndex.clear();
  indexer.documents.clear();
  indexer.docLengths.clear();
  indexer.embeddings.clear();
  // Sample documents
  const docs = [
    { id: 'doc1', text: 'The quick brown fox jumps over the lazy dog' },
    { id: 'doc2', text: 'A fast brown fox leaps over a sleepy cat' },
    { id: 'doc3', text: 'Semantic search uses embeddings for similarity' },
    { id: 'doc4', text: 'Fuzzy matching tolerates misspellings like quik' },
  ];
  await processIndex(docs);

  // Boolean AND
  let res = await processSearch('quick AND fox', 'keyword');
  console.log('Boolean AND results:', res.map(r => r.docId));

  // Phrase search
  res = await processSearch('"brown fox"', 'keyword');
  console.log('Phrase results:', res.map(r => r.docId));

  // Fuzzy search (misspelled term)
  res = await processSearch('quik', 'keyword');
  console.log('Fuzzy results:', res.map(r => r.docId));

  // Semantic search
  res = await processSearch('search embeddings', 'semantic');
  console.log('Semantic results:', res.map(r => r.docId));
})();
