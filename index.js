const { createClient } = require('bedrock-protocol');
const express = require('express');

// Express Dashboard Setup (Required for Railway health checks)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🌐 Bedrock AFK Bots are Running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Express Dashboard running on port ${PORT}`);
});

// Bot Configuration for mintsmp.net
const START_ACCOUNT = 60;
const END_ACCOUNT = 69;
const HOST = 'mintsmp.net';
const PORT_MC = 25125;

const bots = {};

function startBot(accountNumber) {
    const botId = accountNumber - 50; 
    
    console.log(`[Bot ${botId}] Attempting to connect account ${accountNumber}...`);

    try {
        const client = createClient({
            host: HOST,
            port: PORT_MC,
            username: `MintBot_${accountNumber}`,
            offline: true
        });

        client.on('spawn', () => {
            console.log(`[Bot ${botId}] Successfully spawned into mintsmp.net as MintBot_${accountNumber}.`);
        });

        client.on('close', () => {
            console.log(`[Bot ${botId}] Disconnected. Reconnecting in 15 seconds...`);
            setTimeout(() => startBot(accountNumber), 15000);
        });

        client.on('error', (err) => {
            console.log(`[Bot ${botId}] Error: ${err.message}`);
        });

        bots[botId] = client;
    } catch (err) {
        console.error(`[Bot ${botId}] Failed to initialize:`, err.message);
    }
}

// Delay launching bots by 8 seconds so Railway's web health check passes safely first
setTimeout(() => {
    let delay = 0;
    for (let acc = START_ACCOUNT; acc <= END_ACCOUNT; acc++) {
        setTimeout(() => startBot(acc), delay);
        delay += 3000; // Stagger connection attempts by 3 seconds each
    }
}, 8000);
