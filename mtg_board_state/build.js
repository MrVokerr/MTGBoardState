// Build script for MTG Board State Manager
// Copies all necessary files to the dist folder AND generates _worker.js for Drag & Drop support

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
    '_routes.json' // We keep this to help routing, though _worker.js takes precedence
];

// Copy static files
console.log('Copying static files...');
staticFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        fs.copyFileSync(
            path.join(__dirname, file),
            path.join(distDir, file)
        );
        console.log(`  ✓ ${file}`);
    } else {
        console.warn(`  ⚠️ Missing file: ${file}`);
    }
});

// ----------------------------------------------------------------
// GENERATE _worker.js (The Magic Fix for Drag & Drop)
// ----------------------------------------------------------------
console.log('\nGenerating _worker.js for Drag & Drop support...');

const workerContent = `
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ---------------------------------------------------------
    // API Route: /api/fetch-deck
    // ---------------------------------------------------------
    if (url.pathname === '/api/fetch-deck') {
       const corsHeaders = {
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        const deckUrl = url.searchParams.get('url');

        if (!deckUrl) {
            return new Response(JSON.stringify({ error: "Missing URL parameter" }), {
                status: 400,
                headers: corsHeaders
            });
        }

        try {
            let deckListText = "";
            let deckName = "";

            // Moxfield Handler
            if (deckUrl.includes("moxfield.com")) {
                const match = deckUrl.match(/moxfield\\.com\\/decks\\/([a-zA-Z0-9\\-_]+)/);
                if (!match) throw new Error("Invalid Moxfield URL format");
                
                const deckId = match[1];
                const apiUrl = \`https://api.moxfield.com/v2/decks/all/\${deckId}\`;
                
                const response = await fetch(apiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://www.moxfield.com/',
                        'Accept': 'application/json'
                    }
                });
                if (!response.ok) throw new Error(\`Moxfield API error: \${response.status}\`);
                
                const data = await response.json();
                deckName = data.name;

                if (data.mainboard) {
                    Object.entries(data.mainboard).forEach(([cardName, details]) => {
                        deckListText += \`\${details.quantity} \${cardName}\\n\`;
                    });
                }
                if (data.commanders) {
                    Object.entries(data.commanders).forEach(([cardName, details]) => {
                         deckListText += \`\${details.quantity} \${cardName}\\n\`;
                    });
                }
            }
            // Archidekt Handler
            else if (deckUrl.includes("archidekt.com")) {
                const match = deckUrl.match(/archidekt\\.com\\/decks\\/(\\d+)/);
                if (!match) throw new Error("Invalid Archidekt URL format");
                
                const deckId = match[1];
                const apiUrl = \`https://archidekt.com/api/decks/\${deckId}/\`;
                
                const response = await fetch(apiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://archidekt.com/',
                        'Accept': 'application/json'
                    }
                });
                if (!response.ok) throw new Error(\`Archidekt API error: \${response.status}\`);
                
                const data = await response.json();
                deckName = data.name;

                if (data.cards) {
                    data.cards.forEach(cardEntry => {
                        const category = cardEntry.categories?.[0] || "";
                        if (!["Sideboard", "Maybeboard"].includes(category)) {
                             deckListText += \`\${cardEntry.quantity} \${cardEntry.card.oracleCard.name}\\n\`;
                        }
                    });
                }
            }
            else {
                return new Response(JSON.stringify({ error: "Unsupported site. Currently supports Moxfield and Archidekt." }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            return new Response(JSON.stringify({ 
                name: deckName,
                list: deckListText 
            }), {
                status: 200,
                headers: corsHeaders
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    }

    // ---------------------------------------------------------
    // Fallback: Serve Static Assets (index.html, etc.)
    // ---------------------------------------------------------
    // env.ASSETS is provided by Cloudflare Pages to fetch static files
    return env.ASSETS.fetch(request);
  }
};
`;

fs.writeFileSync(path.join(distDir, '_worker.js'), workerContent);
console.log('  ✓ _worker.js created (Advanced Mode enabled)');

console.log('\n✓ Build complete! You can now drag the "upload_me" folder to Cloudflare.');

