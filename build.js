// Runs on Vercel at every deploy:
//  1) builds tailwind.css once (Tailwind v4 CLI) from the classes found in index.html
//  2) swaps the in-browser Tailwind compiler block in index.html for <link rel="stylesheet" href="/tailwind.css">
// If anything fails, the deploy fails and the previous working version stays online.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

execSync('npx @tailwindcss/cli -i input.css -o tailwind.css --minify', { stdio: 'inherit' });

const size = fs.statSync('tailwind.css').size;
if (size < 5000) throw new Error('tailwind.css is unexpectedly small (' + size + ' bytes)');

let html = fs.readFileSync('index.html', 'utf8');
const block = /<!-- TW-DELIVERY-START -->[\s\S]*?<!-- TW-DELIVERY-END -->/;
if (!block.test(html)) throw new Error('TW-DELIVERY markers not found in index.html');
html = html.replace(block, () => '<link rel="stylesheet" href="/tailwind.css">');
fs.writeFileSync('index.html', html);
console.log('OK: tailwind.css built (' + Math.round(size / 1024) + ' KB) and index.html now uses it.');
