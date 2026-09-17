const { createClient } = require('bedrock-protocol');
const express = require('express');

// Keep Express running independently so npm/Railway never encounters a SIGTERM crash
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Web server is alive and keeping container stable!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

function connectBot() {
    console.log('Attempting to connect MintBot_60...');

    const client = createClient({
        host: 'mintsmp.net',
        port: 25125,
        username: 'MintBot_60',
        offline: true
        // Version left completely default for now to avoid crashes
    });

    client.on('spawn', () => {
        console.log('SUCCESS: Bot spawned!');
    });

    client.on('close', (reason) => {
        console.log('Connection closed:', reason);
    });

    client.on('error', (err) => {
        console.log('Bot error (ignoring to prevent crash):', err.message);
    });
}

// Start the bot connection safely after web server initializes
setTimeout(connectBot, 3000);

// Keep the Node event loop alive permanently so npm never throws SIGTERM
setInterval(() => {}, 10000);
