exports.handler = async function(event, context) {
    const { url } = event.queryStringParameters;

    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing URL parameter" })
        };
    }

    try {
        let deckListText = "";
        let deckName = "";

        // ---------------------------------------------------------
        // Moxfield Handler
        // ---------------------------------------------------------
        if (url.includes("moxfield.com")) {
            // Extract ID: https://www.moxfield.com/decks/gFV123... -> gFV123...
            const match = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9\-_]+)/);
            if (!match) throw new Error("Invalid Moxfield URL format");
            
            const deckId = match[1];
            const apiUrl = `https://api.moxfield.com/v2/decks/all/${deckId}`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) throw new Error(`Moxfield API error: ${response.status}`);
            
            const data = await response.json();
            deckName = data.name;

            // Process Mainboard
            if (data.mainboard) {
                Object.entries(data.mainboard).forEach(([cardName, details]) => {
                    deckListText += `${details.quantity} ${cardName}\n`;
                });
            }
            
            // Optional: Process Commanders (Command Zone) - adding to list for completeness
            if (data.commanders) {
                Object.entries(data.commanders).forEach(([cardName, details]) => {
                     deckListText += `${details.quantity} ${cardName}\n`;
                });
            }
        }
        
        // ---------------------------------------------------------
        // Archidekt Handler
        // ---------------------------------------------------------
        else if (url.includes("archidekt.com")) {
             // Extract ID: https://archidekt.com/decks/123456... -> 123456
            const match = url.match(/archidekt\.com\/decks\/(\d+)/);
            if (!match) throw new Error("Invalid Archidekt URL format");
            
            const deckId = match[1];
            const apiUrl = `https://archidekt.com/api/decks/${deckId}/`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Archidekt API error: ${response.status}`);
            
            const data = await response.json();
            deckName = data.name;

            if (data.cards) {
                data.cards.forEach(cardEntry => {
                    // Check if category is Mainboard or Commander (categories can be custom, but usually "Mainboard" is standard)
                    // Archidekt categories are user-defined strings usually. 
                    // We'll just grab everything that isn't explicitly "Sideboard" or "Maybeboard".
                    const category = cardEntry.categories?.[0] || ""; // Simplified category check
                    if (!["Sideboard", "Maybeboard"].includes(category)) {
                         deckListText += `${cardEntry.quantity} ${cardEntry.card.oracleCard.name}\n`;
                    }
                });
            }
        }
        
        // ---------------------------------------------------------
        // Unsupported / Generic Fallback
        // ---------------------------------------------------------
        else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Unsupported site. Currently supports Moxfield and Archidekt." })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                name: deckName,
                list: deckListText 
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};