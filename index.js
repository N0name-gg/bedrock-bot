const { createClient } = require('bedrock-protocol');

const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'MintBot_60';

console.log('==========================================');
console.log('Starting MintBot_60');
console.log('Server: ' + HOST + ':' + MC_PORT);
console.log('==========================================');

console.log('[1] Creating Bedrock client...');

const client = createClient({
host: HOST,
port: MC_PORT,
username: USERNAME,

offline: false,

version: '1.21.130',

connectTimeout: 120000,

profilesFolder: './profiles',

onMsaCode: (data) => {
    console.log('');
    console.log('==========================================');
    console.log('MICROSOFT LOGIN REQUIRED');
    console.log('==========================================');
    console.log('Open: ' + data.verification_uri);
    console.log('Code: ' + data.user_code);
    console.log('==========================================');
    console.log('Waiting for Microsoft authentication...');
}

});

console.log('[2] Bedrock client created.');
console.log('[3] Waiting for connection...');

client.on('connect', () => {
console.log('[4] RakNet connection established.');
});

client.on('session', () => {
console.log('[5] Microsoft authentication successful.');
console.log('[5] Session established.');
});

client.on('join', () => {
console.log('[6] Server accepted the player.');
});

client.on('spawn', () => {
console.log('');
console.log('==========================================');
console.log('🎉 BOT SPAWNED SUCCESSFULLY 🎉');
console.log('==========================================');
console.log(USERNAME + ' is now on MintSMP!');
console.log('==========================================');
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

process.on('uncaughtException', (err) => {
console.error('');
console.error('==========================================');
console.error('❌ UNCAUGHT EXCEPTION');
console.error('==========================================');
console.error(err);
});

process.on('unhandledRejection', (err) => {
console.error('');
console.error('==========================================');
console.error('❌ UNHANDLED REJECTION');
console.error('==========================================');
console.error(err);
});
