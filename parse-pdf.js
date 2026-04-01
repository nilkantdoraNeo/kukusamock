const fs = require('fs');
const pdfModule = require('C:/Users/Client/Desktop/Quiz/backend/node_modules/pdf-parse');
const pdf = pdfModule.default || pdfModule;
const pdfPath = 'C:/Users/Client/Downloads/php/hehe.pdf';
const outPath = 'C:/Users/Client/Desktop/Quiz/hehe.txt';
(async () => {
  const data = fs.readFileSync(pdfPath);
  const result = await pdf(data);
  fs.writeFileSync(outPath, result.text || '', 'utf8');
  console.log('chars', (result.text || '').length);
})();
