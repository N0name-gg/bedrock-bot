const { createClient } = require('bedrock-protocol');
const express = require('express');

// Express server to satisfy Railway container health checks
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is active'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Health check listening on port ${PORT}`);
});

console.log('Initializing bot connection to mintsmp.net:25125...');

const client = createClient({
    host: 'mintsmp.net',
    port: 25125,
    username: 'MintBot_60',
    offline: true,
    raknetBackend: 'jsp-raknet', // Forces pure JS packet handling to bypass container socket restrictions
    version: '1.21.50'         // Matches the server's protocol requirement
});

client.on('spawn', () => {
    console.log('SUCCESS: Bot successfully spawned into the server!');
});

client.on('close', (reason) => {
    console.log('Connection closed:', reason);
});

client.on('error', (err) => {
    console.log('Connection error:', err.message);
});
