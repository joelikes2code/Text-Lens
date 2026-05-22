const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function testPDFParse() {
  console.log('--- Testing PDF Parsing with PDFParse class ---');
  
  // Create a minimal test by using a real PDF from the test_notes or any small real PDF  
  // Let's first test just the constructor and basic API without a file
  try {
    const parser = new PDFParse({ data: Buffer.from('%PDF-') });
    console.log('PDFParse instantiated successfully');
    const result = await parser.getText().catch(e => ({ text: `[expected error: ${e.message}]` }));
    console.log('getText result:', result.text.substring(0, 80));
    await parser.destroy();
    console.log('Parser destroyed successfully');
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

testPDFParse();
