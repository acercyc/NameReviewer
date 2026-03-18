import fs from 'fs';

const html = fs.readFileSync('fellows.html', 'utf-8');

const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/g;
let match;
const results = [];
while ((match = imgRegex.exec(html)) !== null) {
  results.push({ src: match[1], alt: match[2] });
}

fs.writeFileSync('images.json', JSON.stringify(results, null, 2));
