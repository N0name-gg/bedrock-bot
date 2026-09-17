const { createClient } = require('bedrock-protocol');
const express = require('express');

// Express server to satisfy Railway's health check requirement permanently
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot container is healthy!'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

function launchBot() {
    console.log('Attempting to connect MintBot_60 to mintsmp.net:25125...');

    try {
        const client = createClient({
            host: 'mintsmp.net',
            port: 25125,
            username: 'MintBot_60',
            offline: true,
            version: '1.21.50',         // Exactly matches protocol 26.51 required by mintsmp.net
            raknetBackend: 'jsp-raknet'  // Prevents cloud container socket drops
        });

        client.on('spawn', () => {
            console.log('SUCCESS: MintBot_60 successfully spawned into mintsmp.net!');
        });

        client.on('close', (reason) => {
            console.log('Connection closed. Reason:', reason);
            setTimeout(launchBot, 10000); // Auto-reconnect after 10 seconds
        });

        client.on('error', (err) => {
            console.log('Bot connection error:', err.message);
        });
    } catch (err) {
        console.error('Failed to create client:', err.message);
        setTimeout(launchBot, 10000);
    }
}

// Start the bot loop safely
launchBot();
