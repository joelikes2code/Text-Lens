const { pipeline } = require('@xenova/transformers');

let extractor = null;

/**
 * Initializes the embeddings pipeline.
 * Uses Xenova/all-MiniLM-L6-v2, which is lightweight (~90MB)
 * and ideal for sentence similarity and local vector search.
 */
async function initSemanticEngine() {
  if (!extractor) {
    console.log('Initializing local semantic model (Xenova/all-MiniLM-L6-v2)...');
    // Disable local model loading warning & cache checks where applicable
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Semantic embedding model loaded.');
  }
}

/**
 * Generates an embedding vector for a given text.
 * @param {string} text 
 * @returns {Promise<number[]>} A 384-dimensional float array.
 */
async function getEmbedding(text) {
  await initSemanticEngine();
  const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 1000); // chunking/truncating for safety
  if (!cleanText) return new Array(384).fill(0);

  const output = await extractor(cleanText, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Computes the cosine similarity between two vectors.
 * Since the vectors are normalized by the transformer pipeline,
 * cosine similarity is simply the dot product.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

module.exports = {
  initSemanticEngine,
  getEmbedding,
  cosineSimilarity
};
