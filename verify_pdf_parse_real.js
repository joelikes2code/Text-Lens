const { PDFParse } = require('pdf-parse');

async function test() {
  console.log('Testing PDFParse instantiation and parsing...');
  try {
    // Create an empty PDF-like structure or just pass a minimal buffer
    // To see if it initializes without throwing "Cannot read properties of undefined (reading 'verbosity')"
    const buffer = Buffer.from('%PDF-1.4 ...');
    const parser = new PDFParse({ data: buffer });
    console.log('Parser instantiated successfully!');
    
    // We expect getText() to throw or fail due to invalid PDF data, but the instantiation should work.
    try {
      await parser.getText();
    } catch (e) {
      console.log('getText expectedly failed on mock pdf data:', e.message);
    }
  } catch (err) {
    console.error('Instantiation failed:', err);
  }
}

test();
