const fs = require('fs');
const { PDFParse } = require('C:/Users/Client/Desktop/Quiz/backend/node_modules/pdf-parse');
const pdfPath = 'C:/Users/Client/Downloads/php/paper 1.pdf';
const outPath = 'C:/Users/Client/Desktop/Quiz/paper1.txt';

(async () => {
  const data = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  await parser.destroy();
  fs.writeFileSync(outPath, result.text || '', 'utf8');
  console.log('chars', (result.text || '').length);
})();
