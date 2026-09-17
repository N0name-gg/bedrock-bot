const { createClient } = require('bedrock-protocol');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot container is running!'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

console.log('Initializing bot authentication flow...');

const client = createClient({
    host: 'mintsmp.net',
    port: 25125,
    // When offline is false, it triggers the Microsoft device login flow
    offline: false, 
    raknetBackend: 'jsp-raknet',
    version: '1.21.50',
    // This catches the Microsoft login link and user code when it generates
    onMsaCode: (data) => {
        console.log('==================================================');
        console.log('🔑 MICROSOFT LOGIN REQUIRED FOR MINTBOT_60');
        console.log(`1. Open this link: ${data.verification_uri}`);
        console.log(`2. Enter this code: ${data.user_code}`);
        console.log('==================================================');
    }
});

client.on('spawn', () => {
    console.log('SUCCESS: MintBot_60 successfully authenticated and spawned!');
});

client.on('close', (reason) => {
    console.log('Connection closed:', reason);
});

client.on('error', (err) => {
    console.log('Bot error:', err.message);
});
