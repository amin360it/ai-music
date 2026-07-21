const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const GENRE_ORDER = [
  'Blazing','Cosmic','Ethereal','Dark','Folk','Epic','Cinematic','Futuristic',
  'Nostalgic','Mutation','Dreamwave','Trap','Indie','Poetry','Orchestra','Ballad',
  'Electropop','Female','Male','Duet','Rock','Pop','Remix','House','Rabindra',
  'Robindro','Rabindro','Bw-pop','Boly-pop','Blue Rocker','Korean OST'
];

function detectLang(name) {
  if (!name || typeof name !== 'string') return 'EN';
  if (/[\u0980-\u09FF]/.test(name)) return 'BN';
  if (/[\u0900-\u097F]/.test(name)) return 'HI';
  if (/[\u0600-\u06FF]/.test(name)) return 'AR';
  if (/[\u4E00-\u9FFF]/.test(name)) return 'ZH';
  if (/[\u3040-\u309F]/.test(name) || /[\u30A0-\u30FF]/.test(name)) return 'JA';
  if (/[\uAC00-\uD7AF]/.test(name)) return 'KO';
  if (/[\u0400-\u04FF]/.test(name)) return 'RU';
  return 'EN';
}

function detectGenre(name) {
  const n = name.toLowerCase().replace(/\.mp3$/, '');
  for (const g of GENRE_ORDER) {
    if (n.includes(g.toLowerCase())) {
      if (g === 'Rabindra' || g === 'Robindro' || g === 'Rabindro') return 'Rabindra';
      if (g === 'Electropop') return 'Electropop';
      return g;
    }
  }
  const lang = detectLang(name);
  if (lang === 'BN') return 'Ballad';
  if (lang === 'HI') return 'Ballad';
  if (lang === 'KO') return 'Korean OST';
  if (lang === 'ZH' || lang === 'JA') return 'Pop';
  return 'Pop';
}

const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'vendor' || e.name === 'node_modules') continue;
      walk(full);
    } else if (/\.mp3$/i.test(e.name)) {
      files.push({ name: e.name, full, dir });
    }
  }
}

walk(ROOT);

console.log(`Found ${files.length} MP3 files\n`);

const genreCounts = {};
files.forEach(f => {
  const g = detectGenre(f.name);
  genreCounts[g] = (genreCounts[g] || 0) + 1;
});

console.log('Genre distribution:');
Object.keys(genreCounts).sort().forEach(g => {
  console.log(`  ${g}: ${genreCounts[g]}`);
});

console.log('\n---');

const mode = process.argv[2] || 'dry';

if (mode === 'rename') {
  console.log('Renaming files to include genre...');
  files.forEach(f => {
    const g = detectGenre(f.name);
    const base = f.name.replace(/\.mp3$/i, '');
    // Only add genre if not already present (case-insensitive)
    if (base.toLowerCase().includes(g.toLowerCase())) return;
    const newName = `${base} (${g}).mp3`;
    const oldPath = f.full;
    const newPath = path.join(f.dir, newName);
    if (oldPath !== newPath) {
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`  ${f.name} -> ${newName}`);
      } catch (e) {
        console.log(`  FAIL: ${f.name} -> ${newName} (${e.message})`);
      }
    }
  });
  console.log('Done.');
} else if (mode === 'organize') {
  console.log('Organizing into genre folders...');
  files.forEach(f => {
    const g = detectGenre(f.name);
    const genreDir = path.join(ROOT, g);
    if (!fs.existsSync(genreDir)) fs.mkdirSync(genreDir, { recursive: true });
    const dest = path.join(genreDir, f.name);
    if (f.full !== dest) {
      try {
        fs.renameSync(f.full, dest);
        console.log(`  ${f.name} -> ${g}/`);
      } catch (e) {
        console.log(`  FAIL: ${f.name} (${e.message})`);
      }
    }
  });
  console.log('Done.');
} else {
  console.log('Usage:');
  console.log('  node categorize.js          — dry run (show stats only)');
  console.log('  node categorize.js rename   — append genre to filenames');
  console.log('  node categorize.js organize — move files into genre folders\n');
  console.log('Dry-run: files without genre in name:');
  files.filter(f => {
    const base = f.name.replace(/\.mp3$/i, '');
    const g = detectGenre(f.name);
    return !base.toLowerCase().includes(g.toLowerCase());
  }).forEach(f => {
    console.log(`  ${f.name} -> ${detectGenre(f.name)}`);
  });
}
