const { PDFParse } = require('pdf-parse');
console.log('PDFParse type:', typeof PDFParse);
try {
  console.log('PDFParse keys:', Object.keys(PDFParse));
  console.log('PDFParse prototype keys:', Object.getOwnPropertyNames(PDFParse.prototype));
} catch (e) {
  console.error(e);
}
