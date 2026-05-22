const pdfParse = require('pdf-parse');
console.log('pdfParse exports type:', typeof pdfParse);
console.log('pdfParse exports keys:', Object.keys(pdfParse));
if (pdfParse.default) {
  console.log('pdfParse.default type:', typeof pdfParse.default);
  console.log('pdfParse.default keys:', Object.keys(pdfParse.default));
}
