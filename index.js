const { createClient } = require('bedrock-protocol');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot container is running!'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

function launchBot() {
    console.log('Initializing bot connection to mintsmp.net...');

    const client = createClient({
        host: 'mintsmp.net',
        port: 25125,
        offline: false,
        raknetBackend: 'jsp-raknet',
        version: '1.21.50',
        connectTimeout: 90000, // 90-second buffer to handle cloud handshake delays post-MSA
        profilesFolder: './',   // Saves your Microsoft session token so it doesn't re-prompt
        onMsaCode: (data) => {
            console.log('==================================================');
            console.log('🔑 MICROSOFT LOGIN REQUIRED FOR MINTBOT_60');
            console.log(`1. Open this link: ${data.verification_uri}`);
            console.log(`2. Enter this code: ${data.user_code}`);
            console.log('==================================================');
        }
    });

    client.on('spawn', () => {
        console.log('SUCCESS: MintBot_60 successfully spawned into mintsmp.net!');
    });

    client.on('close', (reason) => {
        console.log('Connection closed:', reason);
        setTimeout(launchBot, 15000);
    });

    client.on('error', (err) => {
        console.log('Bot error:', err.message);
    });
}

launchBot();

setInterval(() => {}, 10000);
