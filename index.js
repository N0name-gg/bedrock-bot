const { createClient } = require('bedrock-protocol');

const HOST = 'mintsmp.net';
const PORT = 25125;
const USERNAME = 'MintBot_60';

console.log(`Attempting to connect ${USERNAME} to ${HOST}:${PORT}...`);

const client = createClient({
    host: HOST,
    port: PORT,
    username: USERNAME,
    offline: true
});

client.on('connect', () => {
    console.log('Connected to the Minecraft server!');
});

client.on('spawn', () => {
    console.log(`Successfully spawned as ${USERNAME}!`);
});

client.on('text', (packet) => {
    console.log('[CHAT]', packet.message);
});

client.on('close', (reason) => {
    console.log('Connection closed.');
    console.log('Reason:', reason);
});

client.on('error', (err) => {
    console.error('Minecraft error:', err);
});
