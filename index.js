```js
const { createClient } = require('bedrock-protocol');

const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'MintBot_60';

// Server is currently accepting Bedrock 26.51.
// This corresponds to the current Bedrock 1.21.130 protocol family.
const BEDROCK_VERSION = '1.21.130';

function startBot() {
    console.log('');
    console.log('==========================================');
    console.log(`Starting ${USERNAME}`);
    console.log(`Server: ${HOST}:${MC_PORT}`);
    console.log(`Bedrock Version: ${BEDROCK_VERSION}`);
    console.log('==========================================');

    const client = createClient({
        host: HOST,
        port: MC_PORT,

        username: USERNAME,

        // Microsoft/Xbox authentication
        offline: false,

        // IMPORTANT:
        // Do NOT use 1.21.50 here.
        version: BEDROCK_VERSION,

        // Give Microsoft authentication and connection
        // plenty of time.
        connectTimeout: 120000,

        // Store Microsoft authentication data locally.
        profilesFolder: './profiles',

        // Microsoft device-code authentication
        onMsaCode: (data) => {
            console.log('');
            console.log('==========================================');
            console.log('MICROSOFT LOGIN REQUIRED');
            console.log('==========================================');
            console.log(`Open: ${data.verification_uri}`);
            console.log(`Code: ${data.user_code}`);
            console.log('==========================================');
        }
    });

    client.on('connect', () => {
        console.log('✅ RakNet connection established.');
    });

    client.on('session', () => {
        console.log('✅ Authenticated session established.');
    });

    client.on('join', () => {
        console.log('✅ Joined the Minecraft server.');
    });

    client.on('spawn', () => {
        console.log('');
        console.log('==========================================');
        console.log('🎉 SUCCESS 🎉');
        console.log('==========================================');
        console.log(`${USERNAME} has spawned into MintSMP!`);
        console.log('');
    });

    client.on('status', (status) => {
        console.log('[STATUS]', status);
    });

    client.on('kick', (packet) => {
        console.log('');
        console.log('==========================================');
        console.log('❌ SERVER KICK');
        console.log('==========================================');
        console.log(packet);
    });

    client.on('error', (err) => {
        console.error('');
        console.error('==========================================');
        console.error('❌ CLIENT ERROR');
        console.error('==========================================');
        console.error(err);
    });

    client.on('close', (reason) => {
        console.log('');
        console.log('==========================================');
        console.log('🔴 CONNECTION CLOSED');
        console.log('==========================================');
        console.log('Reason:', reason);
    });
}

startBot();
```
