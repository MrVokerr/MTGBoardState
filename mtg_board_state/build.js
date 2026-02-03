// Build script for MTG Board State Manager
// Copies all necessary files to the dist folder

const fs = require('fs');
const path = require('path');

console.log('Building project...\n');

// Clean and create dist directory
const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// Files to copy to dist root
const staticFiles = [
    'index.html',
    'style.css',
    'script.js',
    'card-names-data.js',
    'card-names.json',
    '_routes.json'
];

// Copy static files
console.log('Copying static files...');
staticFiles.forEach(file => {
    fs.copyFileSync(
        path.join(__dirname, file),
        path.join(distDir, file)
    );
    console.log(`  ✓ ${file}`);
});

// Note: Cloudflare Pages Functions are picked up from the root 'functions' folder automatically.
// We do not need to copy them to 'dist'.

console.log('\n✓ Build complete! Files are ready in the dist folder.\n');
