import fs from 'fs';

async function scrape() {
  try {
    const res = await fetch('https://www.helsinki.fi/en/helsinki-collegium-advanced-studies/people/current-fellows');
    const html = await res.text();
    fs.writeFileSync('helsinki.html', html);
    console.log("HTML saved to helsinki.html");
  } catch (e) {
    console.error(e);
  }
}

scrape();
