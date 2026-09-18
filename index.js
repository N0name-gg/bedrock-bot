const { createClient } = require('bedrock-protocol');
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ================================
// RAILWAY WEB SERVER
// ================================

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
res.send('MintBot and Discord bridge are running!');
});

app.listen(PORT, '0.0.0.0', () => {
console.log('Web server listening on port ' + PORT);
});

// ================================
// MINECRAFT SETTINGS
// ================================

const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'MintBot_60';

// ================================
// DISCORD SETTINGS
// ================================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TARGET_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

let discordChannel = null;
let mcClient = null;

// ================================
// CHECK DISCORD VARIABLES
// ================================

if (!DISCORD_TOKEN) {
console.error('❌ DISCORD_TOKEN is missing from Railway Variables!');
}

if (!TARGET_CHANNEL_ID) {
console.error('❌ DISCORD_CHANNEL_ID is missing from Railway Variables!');
}

// ================================
// DISCORD BOT
// ================================

const discordClient = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

discordClient.once('ready', async () => {
console.log('Discord bot logged in as ' + discordClient.user.tag + '!');

```
if (!TARGET_CHANNEL_ID) {
    console.error('❌ No Discord channel ID configured.');
    return;
}

try {
    discordChannel = await discordClient.channels.fetch(TARGET_CHANNEL_ID);

    if (!discordChannel) {
        console.error('❌ Discord channel was not found.');
        return;
    }

    console.log('Successfully hooked into Discord channel: ' + discordChannel.name);
} catch (err) {
    console.error('❌ Could not fetch Discord channel.');
    console.error(err);
}
```

});

// ================================
// DISCORD → MINECRAFT
// ================================

discordClient.on('messageCreate', async (message) => {
if (message.author.bot) return;

```
if (!discordChannel) return;

if (message.channel.id !== discordChannel.id) return;

if (!message.content.startsWith('!cmd ')) return;

const commandOrText = message.content.slice(5).trim();

if (!commandOrText) {
    await message.reply('❌ Please enter a command or message.');
    return;
}

console.log('[Discord → Minecraft] ' + commandOrText);

if (!mcClient) {
    await message.reply('❌ Minecraft bot is currently offline.');
    return;
}

try {
    mcClient.queue('text', {
        type: 'chat',
        needs_translation: false,
        source_name: USERNAME,
        xuid: '',
        platform_chat_id: '',
        message: commandOrText
    });

    await message.react('✅');

    console.log('✅ Sent to Minecraft: ' + commandOrText);

} catch (err) {
    console.error('❌ Failed to send message to Minecraft:', err);

    await message.reply('❌ Failed to send the message to Minecraft.');
}
```

});

// ================================
// LOGIN TO DISCORD
// ================================

if (DISCORD_TOKEN) {
discordClient.login(DISCORD_TOKEN);
}

// ================================
// MINECRAFT BEDROCK BOT
// ================================

function startBedrockBot() {

```
console.log('==========================================');
console.log('Creating Minecraft Bedrock client...');
console.log('==========================================');

mcClient = createClient({
    host: HOST,
    port: MC_PORT,
    username: USERNAME,

    offline: false,

    connectTimeout: 120000,

    profilesFolder: './',

    onMsaCode: (data) => {
        console.log('');
        console.log('==========================================');
        console.log('🔑 MICROSOFT LOGIN REQUIRED');
        console.log('==========================================');
        console.log('Open: ' + data.verification_uri);
        console.log('Code: ' + data.user_code);
        console.log('==========================================');
    }
});

mcClient.on('connect', () => {
    console.log('✅ Minecraft connection established.');
});

mcClient.on('session', () => {
    console.log('✅ Minecraft authentication successful.');
});

mcClient.on('join', () => {
    console.log('✅ Minecraft server accepted the bot.');
});

mcClient.on('spawn', () => {
    console.log('');
    console.log('==========================================');
    console.log('🎉 BOT SPAWNED SUCCESSFULLY ON MINTSMP!');
    console.log('==========================================');
});

// ================================
// MINECRAFT → DISCORD
// ================================

mcClient.on('text', (packet) => {

    if (
        packet.type !== 'chat' &&
        packet.type !== 'say'
    ) {
        return;
    }

    const playerName = packet.source_name || 'Server';
    const message = packet.message || '';

    const cleanMessage =
        '[In-Game] **' +
        playerName +
        '**: ' +
        message;

    console.log(cleanMessage);

    if (discordChannel) {
        discordChannel.send(cleanMessage).catch((err) => {
            console.error('❌ Could not send Minecraft message to Discord.');
            console.error(err.message);
        });
    }
});

// ================================
// MINECRAFT CONNECTION CLOSED
// ================================

mcClient.on('close', (reason) => {

    console.log('');
    console.log('🔴 Minecraft connection closed.');
    console.log('Reason:', reason);

    mcClient = null;

    console.log('Reconnecting in 15 seconds...');

    setTimeout(startBedrockBot, 15000);
});

// ================================
// MINECRAFT ERROR
// ================================

mcClient.on('error', (err) => {
    console.error('');
    console.error('❌ MINECRAFT CLIENT ERROR');
    console.error(err);
});
```

}

// ================================
// START MINECRAFT BOT
// ================================

startBedrockBot();
