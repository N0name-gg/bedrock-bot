const { createClient } = require('bedrock-protocol');
const express = require('express');

// Keep Express running for Railway container stability
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot container is running smoothly!'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

function launchBot() {
    console.log('Connecting human-like bot session to mintsmp.net...');

    const client = createClient({
        host: 'mintsmp.net',
        port: 25125,
        offline: false,
        raknetBackend: 'jsp-raknet',
        version: '1.21.50',
        connectTimeout: 120000,
        profilesFolder: './', // Uses cached Microsoft token safely
        onMsaCode: (data) => {
            console.log('==================================================');
            console.log('🔑 MICROSOFT LOGIN REQUIRED FOR MINTBOT_60');
            console.log(`1. Open this link: ${data.verification_uri}`);
            console.log(`2. Enter this code: ${data.user_code}`);
            console.log('==================================================');
        }
    });

    let humanActivityInterval = null;

    client.on('spawn', () => {
        console.log('SUCCESS: MintBot_60 successfully spawned and behaving like a player!');

        // Simulate human behavior after spawning
        humanActivityInterval = setInterval(() => {
            try {
                // Randomly shift head orientation slightly to look natural
                const randomYaw = Math.floor(Math.random() * 360);
                const randomPitch = Math.floor(Math.random() * 40) - 20; // Look slightly up or down

                client.queue('move_player', {
                    runtime_entity_id: 0n,
                    position: { x: 0, y: 0, z: 0 }, // Server corrects absolute position
                    pitch: randomPitch,
                    yaw: randomYaw,
                    head_yaw: randomYaw,
                    mode: 'normal',
                    on_ground: true,
                    ridden_runtime_id: 0n,
                    tick: 0n
                });
            } catch (e) {
                // Ignore minor packet timing issues during movement simulation
            }
        }, 15000); // Adjusts head/position every 15 seconds randomly
    });

    client.on('close', (reason) => {
        console.log('Connection closed:', reason);
        if (humanActivityInterval) clearInterval(humanActivityInterval);
        setTimeout(launchBot, 15000);
    });

    client.on('error', (err) => {
        console.log('Bot error:', err.message);
    });
}

launchBot();

setInterval(() => {}, 10000);
