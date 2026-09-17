const { createClient } = require('bedrock-protocol');
const express = require('express');

// Minimal web server to satisfy Railway's health check requirement
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Single Bedrock Bot is running!'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

console.log('Attempting to connect MintBot_60 to mintsmp.net:25125...');

const client = createClient({
    host: 'mintsmp.net',
    port: 25125,
    username: 'MintBot_60',
    offline: true,
    version: '1.21.70' // Matches version 26.51 requirements for the Geyser backend
});

client.on('spawn', () => {
    console.log('SUCCESS: MintBot_60 successfully spawned into mintsmp.net!');
});

client.on('close', (reason) => {
    console.log('Connection closed. Reason:', reason);
});

client.on('error', (err) => {
    console.log('Bot connection error:', err.message);
});
