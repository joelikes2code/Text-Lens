const { PDFParse } = require('pdf-parse');
const parser = new PDFParse();
console.log('load signature:', parser.load.toString());
console.log('getText signature:', parser.getText.toString());
