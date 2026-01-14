# MTG Board State Manager

A powerful, local-first web application designed to help Magic: The Gathering players analyze their board state, find optimal lines of play, and get AI-assisted advice.

Think of it as a "Stockfish for MTG" — a tool to digitize your current game state and get strategic insights.

## Features

- **Deck Import:** Paste any text decklist or import directly from **Moxfield** and **Archidekt** URLs.
- **Smart Autocomplete:** Typing in any zone (Hand, Board, Graveyard, etc.) autocompletes cards from your imported deck.
- **Tab Cycling:** Quickly cycle through card matches by pressing `Tab`.
- **Full Board Tracking:**
  - **Zones:** Hand, Battlefield, Lands, Graveyard, and Exile.
  - **Commander:** Track multiple commanders, their "In Play" status, and tax individually.
  - **Life & Mana:** Track your Life Total and Floating Mana (WUBRGC).
  - **Tokens:** Add custom tokens (e.g., "3x Treasure") that aren't in your main decklist.
  - **Opponent's Board:** Manually list key opponent threats to include in the analysis.
- **Visuals:** Hover over any card name to see its image (via Scryfall).
- **AI Strategy Export:** One-click export that formats your entire board state into a prompt optimized for AI assistants (ChatGPT, Claude, etc.) to ask for the best lines of play.
- **Local & Secure:** Runs entirely in your browser or locally via Node.js. No data is sent to external servers except for deck fetching (Moxfield/Archidekt) and image tooltips (Scryfall).

## Quick Start (Local)

1. **Install Node.js:** Ensure you have [Node.js](https://nodejs.org/) installed.
2. **Download:** Clone or download this repository.
3. **Run:** Double-click `start_app.bat` (Windows).
   - This starts a local server to handle CORS for deck imports.
   - It automatically opens the app in your browser at `http://localhost:3000`.

## Deployment (Cloudflare Pages)

This project is ready for deployment to Cloudflare Pages via GitHub.

1. Push your repository to GitHub.
2. In Cloudflare Pages dashboard, create a new project and connect it to your GitHub repository.
3. Set build settings:
   - **Build command:** (leave empty)
   - **Build output directory:** `/` (or leave empty)
4. Deploy! The `functions/` folder will automatically be detected and deployed as Cloudflare Pages Functions.
5. Your site is live!

## Deployment (Netlify - Legacy)

For Netlify deployment, the old configuration is still available:

1. The `netlify.toml` file and `netlify/functions/` folder remain for backward compatibility.
2. Note: The app now uses Cloudflare Pages Functions by default (`/functions/fetch-deck`).

## Usage Guide

1. **Import:** Paste a decklist or URL. The app auto-saves your deck to local storage.
2. **Build State:** Use the input fields to populate your board. Use `Tab` to cycle suggestions.
3. **Analyze:** In the Output section, check **"Add AI Strategy Prompt"**.
4. **Export:** Click "Copy to Clipboard" and paste the result into your favorite AI tool to get expert gameplay advice.

## Credits

- Card images provided by [Scryfall API](https://scryfall.com/).
- Deck fetching via Moxfield and Archidekt APIs.
