const { tokenize } = require('./utils');

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for spelling correction and fuzzy matching.
 */
function getLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Returns terms from the index vocabulary that are within a given edit distance.
 */
function findFuzzyTerms(term, vocabulary, maxDistance = 2) {
  const matches = [];
  for (const vocabTerm of vocabulary) {
    // Optimization: check length difference first
    if (Math.abs(vocabTerm.length - term.length) > maxDistance) continue;
    
    const dist = getLevenshteinDistance(term, vocabTerm);
    if (dist <= maxDistance) {
      matches.push({ term: vocabTerm, distance: dist });
    }
  }
  // Sort closest matches first
  return matches.sort((a, b) => a.distance - b.distance).map(m => m.term);
}

/**
 * Checks if a specific document contains the exact sequence of phrase tokens.
 */
function matchPhrase(docId, phraseTokens, indexer) {
  if (phraseTokens.length === 0) return false;
  if (phraseTokens.length === 1) {
    return indexer.getPostingList(phraseTokens[0]).has(docId);
  }

  // Get postings lists for all terms in the phrase
  const postings = phraseTokens.map(term => indexer.getPostingList(term).get(docId));
  
  // If any term doesn't appear in the document, it's not a match
  if (postings.some(p => !p)) return false;

  // Check positions: t1 at pos p, t2 at pos p + 1, etc.
  const firstTermPositions = postings[0];
  for (const startPos of firstTermPositions) {
    let match = true;
    for (let i = 1; i < phraseTokens.length; i++) {
      const nextTermPositions = postings[i];
      if (!nextTermPositions.includes(startPos + i)) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/**
 * Tokenizes a query string into operations (AND, OR, NOT, TERM, PHRASE).
 */
function parseQuery(queryString) {
  // Regex to split on spaces but keep phrases in double quotes
  const regex = /[^\s"]+|"([^"]*)"/gi;
  const tokens = [];
  let match;

  while ((match = regex.exec(queryString)) !== null) {
    if (match[1] !== undefined) {
      // Found a double quoted phrase
      if (match[1].trim().length > 0) {
        tokens.push({ type: 'PHRASE', value: match[1].trim() });
      }
    } else {
      const val = match[0].toUpperCase();
      if (val === 'AND' || val === 'OR' || val === 'NOT') {
        tokens.push({ type: 'OPERATOR', value: val });
      } else {
        tokens.push({ type: 'TERM', value: match[0] });
      }
    }
  }
  return tokens;
}

/**
 * Resolves a single term or phrase token to a set of matching document IDs.
 */
function getMatchingDocs(token, indexer) {
  const matchingDocs = new Set();
  const allDocs = new Set(Array.from(indexer.documents.keys()));

  if (token.type === 'TERM') {
    const cleanTerm = tokenize(token.value)[0]; // normalize
    if (!cleanTerm) return matchingDocs;

    const postings = indexer.getPostingList(cleanTerm);
    if (postings.size > 0) {
      for (const docId of postings.keys()) {
        matchingDocs.add(docId);
      }
    } else {
      // Spell check / Fuzzy search fallback
      const vocabulary = indexer.getVocabulary();
      const fuzzyMatches = findFuzzyTerms(cleanTerm, vocabulary, 1); // threshold distance of 1 for high precision
      for (const altTerm of fuzzyMatches) {
        const altPostings = indexer.getPostingList(altTerm);
        for (const docId of altPostings.keys()) {
          matchingDocs.add(docId);
        }
      }
    }
  } else if (token.type === 'PHRASE') {
    const phraseTerms = tokenize(token.value);
    if (phraseTerms.length === 0) return matchingDocs;

    for (const docId of allDocs) {
      if (matchPhrase(docId, phraseTerms, indexer)) {
        matchingDocs.add(docId);
      }
    }
  }

  return matchingDocs;
}

/**
 * Evaluates parsed query tokens and returns a Set of matching document IDs.
 */
function evaluateBooleanQuery(tokens, indexer) {
  const allDocs = new Set(Array.from(indexer.documents.keys()));
  
  if (tokens.length === 0) return new Set();

  // If there are no operators, perform a standard union (OR) of all terms/phrases
  const hasOperators = tokens.some(t => t.type === 'OPERATOR');
  if (!hasOperators) {
    const resultSet = new Set();
    for (const token of tokens) {
      const docs = getMatchingDocs(token, indexer);
      for (const id of docs) resultSet.add(id);
    }
    return resultSet;
  }

  // Expression evaluation: Standard left-to-right parsing for boolean retrieval
  let currentResults = null;
  let nextOperator = 'OR'; // Default operator to combine terms

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'OPERATOR') {
      nextOperator = token.value;
      continue;
    }

    const termDocs = getMatchingDocs(token, indexer);

    if (currentResults === null) {
      // First operand
      if (nextOperator === 'NOT') {
        currentResults = new Set([...allDocs].filter(x => !termDocs.has(x)));
      } else {
        currentResults = new Set(termDocs);
      }
      nextOperator = 'OR'; // Reset
      continue;
    }

    if (nextOperator === 'AND') {
      currentResults = new Set([...currentResults].filter(x => termDocs.has(x)));
    } else if (nextOperator === 'OR') {
      for (const id of termDocs) {
        currentResults.add(id);
      }
    } else if (nextOperator === 'NOT') {
      currentResults = new Set([...currentResults].filter(x => !termDocs.has(x)));
    }

    nextOperator = 'OR'; // Default combine
  }

  return currentResults || new Set();
}

module.exports = {
  parseQuery,
  evaluateBooleanQuery,
  matchPhrase,
  findFuzzyTerms
};
