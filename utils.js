const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by',
  'for', 'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of',
  'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there',
  'these', 'they', 'this', 'to', 'was', 'will', 'with'
]);

/**
 * Tokenizer function that:
 * - Converts text to lowercase
 * - Removes punctuation
 * - Splits into words
 * - Removes common stopwords
 *
 * @param {string} text - The input text to tokenize.
 * @returns {string[]} An array of tokens.
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  // Convert to lowercase
  let processedText = text.toLowerCase();

  // Remove punctuation (replace with spaces to avoid joining words incorrectly)
  processedText = processedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  // Split into words by whitespace
  const words = processedText.split(/\s+/).filter(word => word.length > 0);

  // Remove common stopwords
  const tokens = words.filter(word => !STOPWORDS.has(word));

  return tokens;
}

/**
 * Tokenizer that returns tokens along with their original word index
 * (including stopwords in the index count) to allow accurate phrase queries.
 *
 * @param {string} text
 * @returns {Array<{term: string, position: number}>}
 */
function tokenizeWithPositions(text) {
  if (!text || typeof text !== 'string') return [];

  let processedText = text.toLowerCase();
  processedText = processedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  const words = processedText.split(/\s+/).filter(word => word.length > 0);
  const tokens = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!STOPWORDS.has(word)) {
      tokens.push({ term: word, position: i });
    }
  }

  return tokens;
}

module.exports = {
  tokenize,
  tokenizeWithPositions,
  STOPWORDS
};
