const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts raw text from a PDF buffer.
 * @param {Buffer} dataBuffer 
 * @returns {Promise<string>}
 */
async function parsePDFBuffer(dataBuffer) {
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  await parser.destroy();
  return data.text || '';
}

/**
 * Extracts raw text from a DOCX buffer.
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
async function parseDOCXBuffer(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

/**
 * Parses a buffer based on its extension and returns the text content.
 * @param {Buffer} buffer 
 * @param {string} ext 
 * @returns {Promise<string>}
 */
async function parseBuffer(buffer, ext) {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  switch (cleanExt) {
    case 'txt':
    case 'md':
      return buffer.toString('utf8');
    case 'pdf':
      return await parsePDFBuffer(buffer);
    case 'docx':
      return await parseDOCXBuffer(buffer);
    default:
      throw new Error(`Unsupported file type: .${cleanExt}`);
  }
}

/**
 * Parses a file based on its extension and returns the text content.
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
async function parseFile(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const buffer = fs.readFileSync(filePath);
  return await parseBuffer(buffer, ext);
}

module.exports = {
  parseFile,
  parseBuffer
};
