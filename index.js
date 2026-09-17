const { createClient } = require('bedrock-protocol');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot container is running!'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

function launchBot() {
    console.log('Initializing bot authentication flow...');

    const client = createClient({
        host: 'mintsmp.net',
        port: 25125,
        offline: false, 
        raknetBackend: 'jsp-raknet',
        version: '1.21.50',
        connectTimeout: 30000, // Extends timeout to 30 seconds to allow successful handshake post-MSA login
        onMsaCode: (data) => {
            console.log('==================================================');
            console.log('🔑 MICROSOFT LOGIN REQUIRED FOR MINTBOT_60');
            console.log(`1. Open this link: ${data.verification_uri}`);
            console.log(`2. Enter this code: ${data.user_code}`);
            console.log('==================================================');
        }
    });

    client.on('spawn', () => {
        console.log('SUCCESS: MintBot_60 successfully authenticated and spawned into mintsmp.net!');
    });

    client.on('close', (reason) => {
        console.log('Connection closed:', reason);
        setTimeout(launchBot, 10000);
    });

    client.on('error', (err) => {
        console.log('Bot error:', err.message);
    });
}

launchBot();

setInterval(() => {}, 10000);
