const { tokenize, tokenizeWithPositions } = require('./utils');
const indexer = require('./indexer');
const { rankDocuments, rankSemantically } = require('./ranker');
const { parseQuery, evaluateBooleanQuery } = require('./queryParser');
const { getEmbedding } = require('./semanticEngine');

/**
 * Extracts a contextual snippet (~150 chars) from the document text
 * centered around the first matched query word.
 */
function extractSnippet(text, queryString, searchMode) {
  if (!text) return '';
  if (text.length <= 150) return text;

  let matchIndex = -1;

  if (searchMode !== 'semantic') {
    // Parse query terms
    const queryTerms = tokenize(queryString);
    for (const term of queryTerms) {
      const idx = text.toLowerCase().indexOf(term);
      if (idx !== -1) {
        matchIndex = idx;
        break;
      }
    }
  }

  // If no match index found (or in semantic search where query terms might not exist literally),
  // return the first 150 characters.
  if (matchIndex === -1) {
    return text.slice(0, 150).trim() + '...';
  }

  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(text.length, matchIndex + 100);

  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Processes a query string to find and rank matching documents.
 * Supports both standard keyword (boolean/phrase/fuzzy) search and semantic search.
 * 
 * @param {string} queryString 
 * @param {string} searchMode - 'keyword' or 'semantic'
 * @returns {Promise<Array>} An array of matched document results with scores and snippets.
 */
async function processSearch(queryString, searchMode = 'keyword') {
  if (!queryString || typeof queryString !== 'string') return [];

  if (searchMode === 'semantic') {
    // Generate query embedding
    const queryEmbedding = await getEmbedding(queryString);
    // Rank all documents based on embedding cosine similarity
    const rankedResults = rankSemantically(queryEmbedding, indexer);
    
    return rankedResults.map(result => {
      const doc = indexer.getDocument(result.id);
      return {
        docId: result.id,
        score: result.score,
        snippet: extractSnippet(doc.text, queryString, 'semantic'),
        document: doc
      };
    });
  } else {
    // Parse and evaluate Boolean/Phrase/Fuzzy query logic
    const tokens = parseQuery(queryString);
    const matchedDocIds = evaluateBooleanQuery(tokens, indexer);
    
    if (matchedDocIds.size === 0) return [];

    // Gather postings lists only for query terms to run TF-IDF
    const queryTerms = tokenize(queryString);
    const termPostings = new Map();
    for (const term of queryTerms) {
      termPostings.set(term, indexer.getPostingList(term));
    }

    // Rank the matched document set using TF-IDF
    const rankedResults = rankDocuments(termPostings, indexer, matchedDocIds);

    return rankedResults.map(result => {
      const doc = indexer.getDocument(result.id);
      return {
        docId: result.id,
        score: result.score,
        snippet: extractSnippet(doc.text, queryString, 'keyword'),
        document: doc
      };
    });
  }
}

/**
 * Processes an array of documents to add them to the index and calculates embeddings.
 * Saves the index to db.json.
 * 
 * @param {Array<{id: string, text: string}>} documents 
 * @returns {Promise<number>} The number of documents successfully indexed.
 */
async function processIndex(documents) {
  let count = 0;
  for (const doc of documents) {
    if (doc.id && doc.text) {
      const positionalTokens = tokenizeWithPositions(doc.text);
      // Generate semantic embedding vector
      const embedding = await getEmbedding(doc.text);
      
      indexer.addDocument(doc, positionalTokens, embedding);
      count++;
    }
  }
  
  if (count > 0) {
    indexer.save(); // Save index state to db.json
  }
  
  return count;
}

module.exports = {
  processSearch,
  processIndex
};
