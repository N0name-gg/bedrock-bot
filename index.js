const { createClient } = require('bedrock-protocol');
const express = require('express');

// Setup minimal web server to satisfy Railway's health checks and port bindings
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Headless Bedrock Bot is active and running.');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

function startHeadlessBot() {
    console.log('Initializing headless bot session for MintBot_60...');

    const client = createClient({
        host: 'mintsmp.net',
        port: 25125,
        offline: false,
        raknetBackend: 'jsp-raknet',
        version: '1.21.50',          // Matches protocol version 26.51 required by mintsmp.net
        connectTimeout: 120000,      // Extended timeout for cloud handshakes
        profilesFolder: './',        // Caches Microsoft auth tokens locally so you only log in once
        onMsaCode: (data) => {
            console.log('==================================================');
            console.log('🔑 MICROSOFT LOGIN REQUIRED (FIRST RUN ONLY)');
            console.log(`1. Open link: ${data.verification_uri}`);
            console.log(`2. Enter code: ${data.user_code}`);
            console.log('==================================================');
        }
    });

    let idleLoop = null;

    client.on('spawn', () => {
        console.log('SUCCESS: MintBot_60 successfully spawned into the server!');

        // Human-like idle behavior loop to prevent anti-cheat kicks
        idleLoop = setInterval(() => {
            try {
                const randomYaw = Math.floor(Math.random() * 360);
                const randomPitch = Math.floor(Math.random() * 30) - 15;

                client.queue('move_player', {
                    runtime_entity_id: 0n,
                    position: { x: 0, y: 0, z: 0 },
                    pitch: randomPitch,
                    yaw: randomYaw,
                    head_yaw: randomYaw,
                    mode: 'normal',
                    on_ground: true,
                    ridden_runtime_id: 0n,
                    tick: 0n
                });
            } catch (err) {
                // Suppress minor packet race conditions during idle shifts
            }
        }, 20000); // Shifts head position every 20 seconds
    });

    client.on('close', (reason) => {
        console.log('Connection closed. Reason:', reason);
        if (idleLoop) clearInterval(idleLoop);
        console.log('Reconnecting in 15 seconds...');
        setTimeout(startHeadlessBot, 15000);
    });

    client.on('error', (err) => {
        console.log('Bot network error:', err.message);
    });
}

// Start the bot sequence
startHeadlessBot();

// Keep Node event loop active permanently
setInterval(() => {}, 10000);
