const fs = require('fs');
const path = require('path');

const root = __dirname;
const tracks = [];

function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const relPath = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (e.name === 'vendor' || e.name === 'node_modules' || e.name === '.git') continue;
      walk(full, relPath);
    } else if (/\.mp3$/i.test(e.name)) {
      const stat = fs.statSync(full);
      const baseName = e.name.replace(/\.mp3$/i, '');
      tracks.push({
        id: relPath + '::' + stat.size,
        name: baseName,
        url: './' + relPath.replace(/\\/g, '/')
      });
    }
  }
}
walk(root, '');

const jsArray = JSON.stringify(tracks);
const scriptTag = `<script>window.__EMBEDDED_SONGS__ = ${jsArray};</script>`;

for (const file of ['index.html', 'music-player.html']) {
  const fp = path.join(root, file);
  if (!fs.existsSync(fp)) { console.log('Skipping ' + file + ' (not found)'); continue; }
  let html = fs.readFileSync(fp, 'utf8');
  html = html.replace(/<script>window\.__EMBEDDED_SONGS__\s*=.*?<\/script>/g, '');
  html = html.replace('</head>', scriptTag + '\n</head>');
  fs.writeFileSync(fp, html, 'utf8');
  console.log('Embedded ' + tracks.length + ' songs into ' + file);
}
