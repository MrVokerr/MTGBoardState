const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);

    const parsedUrl = url.parse(req.url, true);
    
    // ---------------------------------------------------------
    // 1. Mock Function Endpoint (supports both Netlify and Cloudflare paths)
    // ---------------------------------------------------------
    if (parsedUrl.pathname === '/.netlify/functions/fetch-deck' || parsedUrl.pathname === '/functions/fetch-deck') {
        const targetUrl = parsedUrl.query.url;

        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Missing URL parameter" }));
            return;
        }

        try {
            // Determine API URL based on input
            let apiUrl = '';
            if (targetUrl.includes("moxfield.com")) {
                const match = targetUrl.match(/moxfield\.com\/decks\/([a-zA-Z0-9\-_]+)/);
                if (match) apiUrl = `https://api.moxfield.com/v2/decks/all/${match[1]}`;
            } else if (targetUrl.includes("archidekt.com")) {
                const match = targetUrl.match(/archidekt\.com\/decks\/(\d+)/);
                if (match) apiUrl = `https://archidekt.com/api/decks/${match[1]}/`;
            }

            if (!apiUrl) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Unsupported site" }));
                return;
            }

            // Use native fetch (Node 18+)
            // This often bypasses TLS fingerprinting blocks that 'https' module triggers
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.moxfield.com/',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `External API Error: ${response.status}` }));
                return;
            }

            const jsonData = await response.json();
            let deckName = jsonData.name;
            let deckListText = "";

            // Parse Moxfield
            if (targetUrl.includes("moxfield.com")) {
                if (jsonData.mainboard) Object.entries(jsonData.mainboard).forEach(([k, v]) => deckListText += `${v.quantity} ${k}\n`);
                if (jsonData.commanders) Object.entries(jsonData.commanders).forEach(([k, v]) => deckListText += `${v.quantity} ${k}\n`);
            }
            // Parse Archidekt
            else if (targetUrl.includes("archidekt.com")) {
                    if (jsonData.cards) {
                    jsonData.cards.forEach(c => {
                        const cat = c.categories?.[0] || "";
                        if (!["Sideboard", "Maybeboard"].includes(cat)) {
                            deckListText += `${c.quantity} ${c.card.oracleCard.name}\n`;
                        }
                    });
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ name: deckName, list: deckListText }));

        } catch (error) {
            console.error("Fetch Error:", error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message || "Server Error" }));
        }
        return;
    }

    // ---------------------------------------------------------
    // 2. Serve Static Files
    // ---------------------------------------------------------
    let filePath = '.' + parsedUrl.pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/
`);
    console.log(`To stop the server, press Ctrl+C`);
});