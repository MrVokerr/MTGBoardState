document.addEventListener('DOMContentLoaded', () => {
    // State
    let deckCards = new Set(); // Stores unique card names for autocomplete
    const state = {
        'zone-hand': [],
        'zone-lands': [],
        'zone-battlefield': [],
        'zone-graveyard': [],
        'zone-exile': []
    };
    const tokens = []; // Array of { name: "Goblin", count: 3 }

    // DOM Elements
    const deckNameInput = document.getElementById('deckName');
    const deckInput = document.getElementById('deckInput');
    const importBtn = document.getElementById('importBtn');
    const clearBtn = document.getElementById('clearBtn');
    const importStatus = document.getElementById('importStatus');
    const deckDatalist = document.getElementById('deck-cards');
    const outputText = document.getElementById('outputText');
    const copyBtn = document.getElementById('copyBtn');
    const copyMsg = document.getElementById('copyMsg');
    
    // Saved Decks Elements
    const savedDecksDropdown = document.getElementById('savedDecksDropdown');
    const loadDeckBtn = document.getElementById('loadDeckBtn');
    const deleteDeckBtn = document.getElementById('deleteDeckBtn');

    // Commander Elements
    const commanderList = document.getElementById('commanderList');
    const addCommanderBtn = document.getElementById('addCommanderBtn');

    // Life Element
    const currentLifeInput = document.getElementById('currentLife');

    // Mana Elements
    const manaIds = ['w', 'u', 'b', 'r', 'g', 'c'];
    const manaInputs = {};
    manaIds.forEach(id => {
        manaInputs[id] = document.getElementById(`mana-${id}`);
    });

    // Token Elements
    const tokenCountInput = document.getElementById('tokenCount');
    const tokenNameInput = document.getElementById('tokenName');
    const addTokenBtn = document.getElementById('addTokenBtn');
    const tokenList = document.getElementById('tokenList');

    // Opponent Elements
    const opponentInput = document.getElementById('opponentInput');

    // Output Elements
    const addPromptCheckbox = document.getElementById('addPromptCheckbox');
    const includeDecklistCheckbox = document.getElementById('includeDecklistCheckbox');
    const advSettingsCheckbox = document.getElementById('advSettingsCheckbox');

    // Tooltip Element
    const tooltip = document.getElementById('card-tooltip');
    const tooltipImg = tooltip.querySelector('img');

    // ---------------------------------------------------------
    // Initialization
    // ---------------------------------------------------------
    loadSavedDecksToDropdown();
    addCommanderRow(false); // Add first row (non-deletable)

    // ---------------------------------------------------------
    // Event Listeners
    // ---------------------------------------------------------
    
    addPromptCheckbox.addEventListener('change', updateOutput);
    includeDecklistCheckbox.addEventListener('change', updateOutput);
    currentLifeInput.addEventListener('input', updateOutput);
    opponentInput.addEventListener('input', updateOutput);

    // Re-render zones when Advanced Settings toggled
    advSettingsCheckbox.addEventListener('change', () => {
        for (const zoneId in state) {
            renderZone(zoneId);
        }
    });

    addCommanderBtn.addEventListener('click', () => {
        addCommanderRow(true);
        updateOutput();
    });

    // Mana listeners
    manaIds.forEach(id => {
        manaInputs[id].addEventListener('input', updateOutput);
    });

    // Token Listeners
    addTokenBtn.addEventListener('click', addToken);
    tokenNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addToken();
    });

    importBtn.addEventListener('click', async () => {
        const text = deckInput.value.trim();
        const name = deckNameInput.value.trim();

        if (!text) {
            showStatus('Please paste a decklist or URL first.', 'error');
            return;
        }

        // Check if input is a URL
        if (text.startsWith('http://') || text.startsWith('https://')) {
            showStatus('Fetching deck...', 'normal');
            importBtn.disabled = true;
            importBtn.textContent = 'Fetching...';
            
            // Clear existing name to ensure we use the new one from the URL
            deckNameInput.value = '';

            try {
                let deckData = null;

                // ---------------------------------------------------------
                // 1. Attempt Client-Side Fetch via CORS Proxy (Bypasses IP blocks)
                // ---------------------------------------------------------
                try {
                    let apiUrl = '';
                    if (text.includes("moxfield.com")) {
                        const match = text.match(/moxfield\.com\/decks\/([a-zA-Z0-9\-_]+)/);
                        if (match) apiUrl = `https://api.moxfield.com/v2/decks/all/${match[1]}`;
                    } else if (text.includes("archidekt.com")) {
                        const match = text.match(/archidekt\.com\/decks\/(\d+)/);
                        if (match) apiUrl = `https://archidekt.com/api/decks/${match[1]}/`;
                    }

                    if (apiUrl) {
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
                        const response = await fetch(proxyUrl);
                        if (response.ok) {
                            const jsonData = await response.json();
                            
                            // Parse Locally
                            let list = "";
                            let dName = jsonData.name;

                            if (text.includes("moxfield.com")) {
                                if (jsonData.mainboard) Object.entries(jsonData.mainboard).forEach(([k, v]) => list += `${v.quantity} ${k}\n`);
                                if (jsonData.commanders) Object.entries(jsonData.commanders).forEach(([k, v]) => list += `${v.quantity} ${k}\n`);
                            } else if (text.includes("archidekt.com")) {
                                if (jsonData.cards) {
                                    jsonData.cards.forEach(c => {
                                        const cat = c.categories?.[0] || "";
                                        if (!["Sideboard", "Maybeboard"].includes(cat)) {
                                            list += `${c.quantity} ${c.card.oracleCard.name}\n`;
                                        }
                                    });
                                }
                            }

                            deckData = { name: dName, list: list };
                        }
                    }
                } catch (proxyErr) {
                    console.warn("Proxy fetch failed, falling back to server function...", proxyErr);
                }

                // ---------------------------------------------------------
                // 2. Fallback to Server Function (if Proxy failed)
                // ---------------------------------------------------------
                if (!deckData) {
                    // Check for local file execution only if we reach this fallback
                    if (window.location.protocol === 'file:') {
                        alert("URL Import requires a server!\n\nTo use this feature locally:\n1. Open your terminal in this folder.\n2. Run: node local_server.js\n3. Go to: http://localhost:3000\n\nAlternatively, deploy to Netlify to use it online.");
                        throw new Error("Local file protocol restriction");
                    }

                    const response = await fetch(`/.netlify/functions/fetch-deck?url=${encodeURIComponent(text)}`);
                    if (!response.ok) {
                        if (response.status === 404) throw new Error('Netlify Function not found.');
                        const errJson = await response.json().catch(() => ({}));
                        throw new Error(errJson.error || `Server Error: ${response.status}`);
                    }
                    deckData = await response.json();
                }

                // ---------------------------------------------------------
                // Success Processing
                // ---------------------------------------------------------
                deckInput.value = deckData.list; 
                
                let finalName = name;
                if (!finalName && deckData.name) {
                    deckNameInput.value = deckData.name;
                    finalName = deckData.name;
                }

                if (finalName) {
                    finalName = saveDeck(finalName, deckData.list);
                    deckNameInput.value = finalName;
                    loadSavedDecksToDropdown();
                    savedDecksDropdown.value = finalName;
                }

                const counts = processDeckList(deckData.list);
                
                let details = `${counts.unique} Unique`;
                if (counts.duplicatesSummary) {
                    details += `, ${counts.duplicatesSummary}`;
                }
                
                showStatus(finalName ? `Fetched & saved as "${finalName}" - Imported ${counts.total} cards (${details}).` : `Fetched ${counts.total} cards (${details}).`, 'success');
                updateOutput(); 

            } catch (err) {
                console.error(err);
                showStatus(`Error: ${err.message}`, 'error');
            } finally {
                importBtn.disabled = false;
                importBtn.textContent = 'Save & Import Deck';
            }
            return;
        }

        // Normal Text Import
        const counts = processDeckList(text);
        let savedName = name;
        if (name) {
            savedName = saveDeck(name, text);
            deckNameInput.value = savedName;
            loadSavedDecksToDropdown(); // Refresh dropdown
            savedDecksDropdown.value = savedName; // Select the just-saved deck
        }

        let details = `${counts.unique} Unique`;
        if (counts.duplicatesSummary) {
            details += `, ${counts.duplicatesSummary}`;
        }

        showStatus(name ? `Saved as "${savedName}" - Imported ${counts.total} cards (${details}).` : `Imported ${counts.total} cards (${details}).`, 'success');
        updateOutput();
    });

    clearBtn.addEventListener('click', () => {
        deckInput.value = '';
        deckNameInput.value = '';
        deckCards.clear();
        
        // Clear all commander rows and keep only one
        commanderList.innerHTML = '';
        addCommanderRow(false);
        
        // Clear mana and life
        manaIds.forEach(id => manaInputs[id].value = 0);
        currentLifeInput.value = 40;

        // Clear Tokens
        tokens.length = 0;
        renderTokens();
        tokenNameInput.value = '';
        tokenCountInput.value = 1;

        // Clear Opponent
        opponentInput.value = '';

        resetZones();
        populateDatalist();
        showStatus('Cleared all data.', 'success');
    });

    loadDeckBtn.addEventListener('click', () => {
        const selectedDeckName = savedDecksDropdown.value;
        if (!selectedDeckName) return;

        const deckText = localStorage.getItem(`mtg_deck_${selectedDeckName}`);
        if (deckText) {
            deckNameInput.value = selectedDeckName;
            deckInput.value = deckText;
            const counts = processDeckList(deckText);
            
            let details = `${counts.unique} Unique`;
            if (counts.duplicatesSummary) {
                details += `, ${counts.duplicatesSummary}`;
            }
            
            showStatus(`Loaded "${selectedDeckName}" - ${counts.total} cards (${details}).`, 'success');
            updateOutput();
        }
    });

    deleteDeckBtn.addEventListener('click', () => {
        const selectedDeckName = savedDecksDropdown.value;
        if (!selectedDeckName) return;

        if (confirm(`Are you sure you want to delete "${selectedDeckName}"?`)) {
            localStorage.removeItem(`mtg_deck_${selectedDeckName}`);
            loadSavedDecksToDropdown();
            deckNameInput.value = '';
            deckInput.value = '';
            showStatus(`Deleted "${selectedDeckName}".`, 'success');
            updateOutput();
        }
    });

    // ---------------------------------------------------------
    // Scryfall Hover Logic (Debounced)
    // ---------------------------------------------------------
    let hoverTimeout;
    
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'SPAN' && e.target.closest('.card-list')) {
            const cardName = e.target.textContent.trim();
            if (!cardName) return;
            
            // Clean simple count prefix "3x Name" -> "Name"
            const cleanName = cardName.replace(/^\d+x\s+/, '');

            // Debounce: Wait 200ms before showing to prevent lag when scrolling/moving fast
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                showTooltip(cleanName, e.clientX, e.clientY);
            }, 200);
        }
    });

    document.body.addEventListener('mousemove', (e) => {
        if (!tooltip.classList.contains('hidden')) {
            moveTooltip(e.clientX, e.clientY);
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        if (e.target.tagName === 'SPAN' && e.target.closest('.card-list')) {
            clearTimeout(hoverTimeout); // Cancel pending show
            hideTooltip();
        }
    });

    function showTooltip(cardName, x, y) {
        // Prevent re-fetching if it's the same card (optional optimization)
        const newSrc = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`;
        if (tooltipImg.src !== newSrc) {
             tooltipImg.src = newSrc;
        }
        
        moveTooltip(x, y);
        tooltip.classList.remove('hidden');
    }

    function moveTooltip(x, y) {
        // Offset slightly
        const offsetX = 20;
        const offsetY = 20;
        
        let top = y + offsetY;
        let left = x + offsetX;

        // Keep on screen (basic check)
        if (left + 240 > window.innerWidth) {
            left = x - 260;
        }
        if (top + 340 > window.innerHeight) {
            top = y - 340; 
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    function hideTooltip() {
        tooltip.classList.add('hidden');
        tooltipImg.src = ''; // Cancel loading
    }


    // ---------------------------------------------------------
    // Tab Cycling Logic
    // ---------------------------------------------------------
    const inputStates = new WeakMap();

    function setupTabCycle(inputEl, callback) {
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const currentVal = inputEl.value;
                // If empty or no deck loaded, let default tab occur
                if (!currentVal || deckCards.size === 0) return;

                let state = inputStates.get(inputEl);

                if (!state) {
                    // Start new cycle
                    const query = currentVal.toLowerCase();
                    const allCards = Array.from(deckCards).sort();
                    
                    // Find matches starting with query
                    const matches = allCards.filter(c => c.toLowerCase().startsWith(query));

                    if (matches.length > 0) {
                        e.preventDefault(); // Stop focus from moving
                        state = { matches: matches, index: 0 };
                        inputStates.set(inputEl, state);
                        
                        inputEl.value = matches[0]; // Set first match
                        if (callback) callback();
                    }
                } else {
                    // Continue cycling
                    e.preventDefault();
                    state.index = (state.index + 1) % state.matches.length;
                    inputEl.value = state.matches[state.index];
                    if (callback) callback();
                }
            }
        });

        // Reset cycle state if user types manually
        inputEl.addEventListener('input', () => {
            inputStates.delete(inputEl);
        });
    }

    // Setup Zone Listeners
    const zones = ['zone-hand', 'zone-lands', 'zone-battlefield', 'zone-graveyard', 'zone-exile'];
    zones.forEach(zoneId => {
        const zoneEl = document.getElementById(zoneId);
        const input = zoneEl.querySelector('.card-input');
        const addBtn = zoneEl.querySelector('.add-btn');

        // Apply Tab Cycle
        setupTabCycle(input);

        // Add button click
        addBtn.addEventListener('click', () => addCardToZone(zoneId, input));

        // Enter key in input
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addCardToZone(zoneId, input);
            }
        });
    });

    copyBtn.addEventListener('click', () => {
        outputText.select();
        navigator.clipboard.writeText(outputText.value).then(() => {
            copyMsg.classList.add('visible');
            setTimeout(() => copyMsg.classList.remove('visible'), 2000);
        });
    });

    // ---------------------------------------------------------
    // Functions
    // ---------------------------------------------------------

    function addToken() {
        const name = tokenNameInput.value.trim();
        const count = parseInt(tokenCountInput.value) || 1;
        
        if (!name) return;

        tokens.push({ name, count });
        tokenNameInput.value = '';
        tokenCountInput.value = 1;
        tokenNameInput.focus();

        renderTokens();
        updateOutput();
    }

    function removeToken(index) {
        tokens.splice(index, 1);
        renderTokens();
        updateOutput();
    }

    function renderTokens() {
        tokenList.innerHTML = '';
        tokens.forEach((t, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="token-item-info">
                    <input type="number" class="token-qty-input" value="${t.count}" min="0">
                    <span>${t.name}</span>
                </div>
                <button class="delete-btn" title="Remove">×</button>
            `;
            
            const qtyInput = li.querySelector('.token-qty-input');
            qtyInput.addEventListener('input', () => {
                const newQty = parseInt(qtyInput.value);
                // We allow 0, but if it's NaN (empty), we don't update yet to allow typing
                if (!isNaN(newQty)) {
                    tokens[index].count = newQty;
                    updateOutput();
                }
            });

            li.querySelector('.delete-btn').addEventListener('click', () => removeToken(index));
            tokenList.appendChild(li);
        });
    }

    function addCommanderRow(canDelete = true) {
        const row = document.createElement('div');
        row.className = 'commander-row';
        row.innerHTML = `
            <div class="input-wrapper">
                <label>Name:</label>
                <input type="text" list="deck-cards" placeholder="Search Commander..." class="card-input cmd-name">
            </div>
            
            <div class="checkbox-wrapper">
                <input type="checkbox" class="cmd-in-play">
                <label>In Play?</label>
            </div>

            <div class="tax-wrapper">
                <label>Tax:</label>
                <input type="number" min="0" step="2" value="0" class="cmd-tax">
            </div>

            ${canDelete ? '<button class="remove-commander-btn secondary-btn" title="Remove">×</button>' : '<div style="width:38px"></div>'}
        `;

        const nameInput = row.querySelector('.cmd-name');
        const inPlayCheck = row.querySelector('.cmd-in-play');
        const taxInput = row.querySelector('.cmd-tax');
        const removeBtn = row.querySelector('.remove-commander-btn');

        // Listeners for output update
        [nameInput, inPlayCheck, taxInput].forEach(el => {
            el.addEventListener('input', updateOutput);
            el.addEventListener('change', updateOutput);
        });

        // Tab cycle for name
        setupTabCycle(nameInput, updateOutput);

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                row.remove();
                updateOutput();
            });
        }

        commanderList.appendChild(row);
    }

    function saveDeck(name, text) {
        let finalName = name;
        let counter = 1;
        
        // Check for collision
        while (localStorage.getItem(`mtg_deck_${finalName}`)) {
            finalName = `${name} ${counter}`;
            counter++;
        }
        
        localStorage.setItem(`mtg_deck_${finalName}`, text);
        return finalName;
    }

    function loadSavedDecksToDropdown() {
        savedDecksDropdown.innerHTML = '<option value="">-- Load a saved deck --</option>';
        const keys = Object.keys(localStorage);
        const deckNames = keys
            .filter(k => k.startsWith('mtg_deck_'))
            .map(k => k.replace('mtg_deck_', ''))
            .sort();

        deckNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            savedDecksDropdown.appendChild(option);
        });
    }

    function processDeckList(text) {
        deckCards.clear();
        const lines = text.split('\n');
        let totalCount = 0;
        const cardCounts = new Map();

        // Regex to match "4 Lightning Bolt" or "Lightning Bolt" or "1x Lightning Bolt"
        const cardRegex = /^(?:(\d+)[x\s]*)?([^(\n\r]+)(?:.*)?$/;

        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('//') || line.toLowerCase().startsWith('sideboard')) return;

            const match = line.match(cardRegex);
            if (match) {
                const qty = parseInt(match[1]) || 1;
                const name = match[2].trim();
                if (name) {
                    deckCards.add(name);
                    totalCount += qty;
                    
                    const current = cardCounts.get(name) || 0;
                    cardCounts.set(name, current + qty);
                }
            }
        });

        populateDatalist();
        
        // Generate summary of duplicates
        const duplicates = [];
        cardCounts.forEach((count, name) => {
            if (count > 1) {
                duplicates.push(`${count}x ${name}`);
            }
        });

        return {
            total: totalCount,
            unique: deckCards.size,
            duplicatesSummary: duplicates.join(', ')
        };
    }

    function populateDatalist() {
        deckDatalist.innerHTML = '';
        const sortedCards = Array.from(deckCards).sort();
        sortedCards.forEach(cardName => {
            const option = document.createElement('option');
            option.value = cardName;
            deckDatalist.appendChild(option);
        });
    }

    function addCardToZone(zoneId, inputEl) {
        const cardName = inputEl.value.trim();
        if (!cardName) return;

        state[zoneId].push(cardName);
        inputEl.value = ''; // Clear input
        inputEl.focus(); // Keep focus for rapid entry

        renderZone(zoneId);
        updateOutput();
    }

    function removeCardFromZone(zoneId, index) {
        state[zoneId].splice(index, 1);
        renderZone(zoneId);
        updateOutput();
    }

    function moveCard(fromZoneId, index, toZoneId) {
        if (fromZoneId === toZoneId) return;

        const card = state[fromZoneId][index];
        state[fromZoneId].splice(index, 1);
        state[toZoneId].push(card);

        renderZone(fromZoneId);
        renderZone(toZoneId);
        updateOutput();
    }

    function resetZones() {
        for (const zoneId in state) {
            state[zoneId] = [];
            renderZone(zoneId);
        }
        updateOutput();
    }

    function renderZone(zoneId) {
        const zoneEl = document.getElementById(zoneId);
        const listEl = zoneEl.querySelector('.card-list');
        const countEl = zoneEl.querySelector('.count');

        listEl.innerHTML = '';
        
        state[zoneId].forEach((card, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${card}</span>`;
            
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'card-controls';

            // Add Move Button if Advanced Settings checked
            if (advSettingsCheckbox.checked) {
                const moveBtn = document.createElement('button');
                moveBtn.className = 'send-btn';
                moveBtn.textContent = 'Send';
                moveBtn.title = 'Move to another zone';
                
                // Create Context Menu Logic
                moveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Remove existing open menus
                    document.querySelectorAll('.move-menu').forEach(m => m.remove());

                    const menu = document.createElement('div');
                    menu.className = 'move-menu';
                    
                    const targets = [
                        { id: 'zone-hand', label: 'Hand' },
                        { id: 'zone-battlefield', label: 'Battlefield' },
                        { id: 'zone-graveyard', label: 'Graveyard' },
                        { id: 'zone-exile', label: 'Exile' },
                        { id: 'zone-lands', label: 'Lands' }
                    ];

                    targets.forEach(tgt => {
                        if (tgt.id === zoneId) return; // Don't show current zone
                        const btn = document.createElement('button');
                        btn.textContent = tgt.label;
                        btn.addEventListener('click', () => {
                            moveCard(zoneId, index, tgt.id);
                            menu.remove();
                        });
                        menu.appendChild(btn);
                    });

                    controlsDiv.appendChild(menu);
                    
                    // Close menu when clicking elsewhere
                    const closeMenu = () => {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                    };
                    setTimeout(() => document.addEventListener('click', closeMenu), 0);
                });

                controlsDiv.appendChild(moveBtn);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Remove';
            deleteBtn.addEventListener('click', () => {
                removeCardFromZone(zoneId, index);
            });
            controlsDiv.appendChild(deleteBtn);

            li.appendChild(controlsDiv);
            listEl.appendChild(li);
        });

        countEl.textContent = state[zoneId].length;
    }

    function updateOutput() {
        let text = "";

        // Prepend Decklist if checked
        if (includeDecklistCheckbox.checked) {
            const deckContent = deckInput.value.trim();
            if (deckContent && !deckContent.startsWith('http')) {
                text += `--- FULL DECKLIST ---\n${deckContent}\n----------------------\n\n`;
            }
        }

        // Life Total Output
        const life = currentLifeInput.value;
        text += `Current Life: ${life}\n`;

        // Commander Section Output
        const commanderRows = document.querySelectorAll('.commander-row');
        let commanderText = "";
        commanderRows.forEach(row => {
            const name = row.querySelector('.cmd-name').value.trim();
            if (name) {
                const inPlay = row.querySelector('.cmd-in-play').checked ? "In Play" : "Command Zone";
                const tax = row.querySelector('.cmd-tax').value;
                commanderText += `Commander: ${name} (${inPlay}, Tax: ${tax})\n`;
            }
        });

        if (commanderText) {
            text += commanderText;
        }
        text += "\n";

        // Floating Mana Output
        let manaText = "";
        manaIds.forEach(id => {
            const val = parseInt(manaInputs[id].value) || 0;
            if (val > 0) {
                manaText += `${val} ${id.toUpperCase()}, `; 
            }
        });
        if (manaText) {
            text += `Floating Mana: ${manaText.slice(0, -2)}\n\n`;
        }
        
        const formatSection = (title, zoneId) => {
            const cards = state[zoneId];
            if (cards.length === 0) return "";
            
            let sectionText = `${title} (${cards.length}):\n`;
            cards.forEach(card => {
                sectionText += `- ${card}\n`;
            });
            sectionText += "\n";
            return sectionText;
        };

        text += formatSection("Hand", "zone-hand");
        text += formatSection("Battlefield", "zone-battlefield");
        text += formatSection("Lands", "zone-lands");
        text += formatSection("Graveyard", "zone-graveyard");
        text += formatSection("Exile", "zone-exile");

        // Token Output
        if (tokens.length > 0) {
            text += `Tokens (${tokens.length} types):\n`;
            tokens.forEach(t => {
                text += `- ${t.count}x ${t.name}\n`;
            });
            text += "\n";
        }

        // Opponent Output
        const oppBoard = opponentInput.value.trim();
        if (oppBoard && oppBoard.toLowerCase() !== 'empty') {
            text += `Opponent's Board:\n${oppBoard}\n`;
        } else if (oppBoard.toLowerCase() === 'empty') {
            text += `Opponent's Board: (Empty)\n`;
        }

        if (text.trim() === `Current Life: ${life}`) {
            text = "Board state is empty.";
        }

        if (addPromptCheckbox.checked && text !== "Board state is empty.") {
            text += "\n--------------------------------------------------\n";
            text += "**AI Analysis Request:**\n";
            text += "Based on the Magic: The Gathering board state provided above, please analyze the situation and provide the following:\n\n";
            text += "1. **Best Lines of Play:** Identify the 2 best lines of play available right now and for the next turn.\n";
            text += "2. **Goal & Strategy:** Explain the specific goal of each line (e.g., lethal damage, board control, value engine) and how it advances the game state.\n";
            text += "3. **Combos & Synergies:** Highlight any specific card interactions, combos, or strong synergies present in the hand/board/graveyard.\n";
            text += "4. **Recommendation:** Which line offers the best optimal outcome and why?\n";
        }

        outputText.value = text.trim();
    }

    function showStatus(msg, type) {
        importStatus.textContent = msg;
        importStatus.style.color = type === 'error' ? '#ef5350' : '#66bb6a';
    }
});