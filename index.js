const { createClient } = require('bedrock-protocol');

const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'MintBot_60';

console.log('==========================================');
console.log('Starting ' + USERNAME);
console.log('Server: ' + HOST + ':' + MC_PORT);
console.log('==========================================');

console.log('Creating Bedrock client...');

const client = createClient({
    host: HOST,
    port: MC_PORT,
    username: USERNAME,
    offline: false,
    connectTimeout: 120000,
    profilesFolder: './', // Crucial: Saves your Microsoft login token locally so it doesn't freeze/hang
    onMsaCode: (data) => {
        console.log('');
        console.log('==========================================');
        console.log('MICROSOFT LOGIN REQUIRED');
        console.log('==========================================');
        console.log('Open: ' + data.verification_uri);
        console.log('Code: ' + data.user_code);
        console.log('==========================================');
        console.log('Waiting for Microsoft login...');
    }
});

console.log('Client created.');
console.log('Waiting for connection...');

client.on('connect', () => {
    console.log('RakNet connection established.');
});

client.on('session', () => {
    console.log('Microsoft authentication successful!');
    console.log('Session established.');
});

client.on('join', () => {
    console.log('Joined MintSMP!');
});

client.on('spawn', () => {
    console.log('');
    console.log('==========================================');
    console.log('BOT SPAWNED SUCCESSFULLY!');
    console.log('==========================================');
    console.log(USERNAME + ' is now on MintSMP!');
    console.log('==========================================');
});

client.on('kick', (packet) => {
    console.log('');
    console.log('SERVER KICK');
    console.log(packet);
});

client.on('error', (err) => {
    console.error('');
    console.error('CLIENT ERROR');
    console.error(err);
});

client.on('close', (reason) => {
    console.log('');
    console.log('CONNECTION CLOSED');
    console.log('Reason:', reason);
});
