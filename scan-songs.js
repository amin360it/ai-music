const fs = require('fs');
const path = require('path');

const root = __dirname;
const tracks = [];

function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const relPath = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (e.name === 'vendor' || e.name === 'node_modules' || e.name === '.git' || e.name === 'user_data') continue;
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

tracks.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(path.join(root, 'songs.json'), JSON.stringify(tracks, null, 4) + '\n', 'utf8');
console.log('Scanned ' + tracks.length + ' MP3 file(s) -> songs.json');
