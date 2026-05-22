const { cosineSimilarity } = require('./semanticEngine');

/**
 * Ranks documents based on positional TF-IDF.
 * 
 * @param {Map<string, Map<string, number[]>>} termPostings - term mapping to (docId -> positions array)
 * @param {object} indexer - The indexer instance
 * @param {Set<string>} docFilter - Optional Set of allowed document IDs (from boolean logic)
 * @returns {Array<{id: string, score: number}>} Sorted array of documents by score (descending).
 */
function rankDocuments(termPostings, indexer, docFilter = null) {
  const documentScores = new Map();
  const totalDocs = indexer.getTotalDocuments();

  for (const [term, postings] of termPostings.entries()) {
    const docFrequency = postings.size;
    if (docFrequency === 0) continue;

    // Calculate Inverse Document Frequency (IDF)
    // Using standard log10(N/df)
    const idf = Math.log10(totalDocs / docFrequency);

    for (const [docId, positions] of postings.entries()) {
      // If a document filter is active (e.g. from boolean queries), skip docs not in filter
      if (docFilter && !docFilter.has(docId)) continue;

      // Calculate Term Frequency (TF) normalized by total tokens in the document
      const tf = positions.length / indexer.getDocLength(docId);
      const tfIdf = tf * idf;

      const currentScore = documentScores.get(docId) || 0;
      documentScores.set(docId, currentScore + tfIdf);
    }
  }

  // Ensure documents that passed boolean filters but have 0 weight (e.g., matching phrases with only stop words) are still present
  if (docFilter) {
    for (const docId of docFilter) {
      if (!documentScores.has(docId)) {
        documentScores.set(docId, 0.0001); // tiny baseline score
      }
    }
  }

  // Convert the scores map to an array of objects
  const results = Array.from(documentScores.entries()).map(([id, score]) => ({ id, score }));
  
  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Ranks documents based on Cosine Similarity of their embeddings.
 * 
 * @param {number[]} queryEmbedding - The embedding vector of the search query
 * @param {object} indexer - The indexer instance
 * @returns {Array<{id: string, score: number}>} Sorted array of documents by similarity (descending).
 */
function rankSemantically(queryEmbedding, indexer) {
  const allEmbeddings = indexer.getAllEmbeddings();
  const results = [];

  for (const [docId, docEmbedding] of allEmbeddings.entries()) {
    const score = cosineSimilarity(queryEmbedding, docEmbedding);
    results.push({ id: docId, score });
  }

  // Sort descending by similarity score
  results.sort((a, b) => b.score - a.score);

  return results;
}

module.exports = {
  rankDocuments,
  rankSemantically
};
