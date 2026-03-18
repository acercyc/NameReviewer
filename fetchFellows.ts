import fs from 'fs';

async function fetchFellows() {
  const res = await fetch('https://www.helsinki.fi/en/helsinki-collegium-advanced-studies/people/current-fellows');
  const html = await res.text();
  fs.writeFileSync('fellows.html', html);
}

fetchFellows();
