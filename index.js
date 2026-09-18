const { createClient } = require('bedrock-protocol');
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Keep Railway health check active
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MintBot and Discord bridge are running!'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'MintBot_60';

// Use environment variables for safety, or fill them directly here
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'YOUR_DISCORD_BOT_TOKEN';
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || 'YOUR_CHANNEL_ID';

let mcClient = null;

// --- Initialize Discord Bot ---
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

discordClient.once('ready', () => {
    console.log(`Discord bot logged in as ${discordClient.user.tag}!`);
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== DISCORD_CHANNEL_ID) return;

    // Check if message starts with !cmd
    if (message.content.startsWith('!cmd ')) {
        const commandOrText = message.content.slice(5).trim(); // Remove '!cmd '

        if (!mcClient) {
            return message.reply('❌ Minecraft bot is currently offline or reconnecting.');
        }

        try {
            // Sends either chat or command (e.g., /afk or /shard pay ...) to the game
            mcClient.queue('text', {
                type: 'chat',
                needs_translation: false,
                source_name: USERNAME,
                xuid: '',
                platform_chat_id: '',
                message: commandOrText
            });

            message.react('✅');
            console.log(`[Discord Command Executed]: ${commandOrText}`);
        } catch (err) {
            console.error('Failed to send message to Minecraft:', err);
            message.reply('❌ Failed to execute command in-game.');
        }
    }
});

discordClient.login(DISCORD_TOKEN);

// --- Initialize Minecraft Bedrock Bot ---
function startBedrockBot() {
    console.log('Creating Bedrock client...');

    mcClient = createClient({
        host: HOST,
        port: MC_PORT,
        username: USERNAME,
        offline: false,
        connectTimeout: 120000,
        profilesFolder: './', // Keeps session cached
        onMsaCode: (data) => {
            console.log('==========================================');
            console.log('MICROSOFT LOGIN REQUIRED');
            console.log('Open: ' + data.verification_uri);
            console.log('Code: ' + data.user_code);
            console.log('==========================================');
        }
    });

    mcClient.on('spawn', () => {
        console.log('==========================================');
        console.log('BOT SPAWNED SUCCESSFULLY ON MINTSMP!');
        console.log('==========================================');
    });

    mcClient.on('text', (packet) => {
        // Optional: Relay in-game chat back to the Discord channel if desired
        if (packet.type === 'chat' || packet.type === 'say') {
            console.log(`[In-Game Chat] ${packet.source_name}: ${packet.message}`);
        }
    });

    mcClient.on('close', (reason) => {
        console.log('CONNECTION CLOSED:', reason);
        mcClient = null;
        console.log('Reconnecting in 15 seconds...');
        setTimeout(startBedrockBot, 15000);
    });

    mcClient.on('error', (err) => {
        console.error('CLIENT ERROR:', err);
    });
}

startBedrockBot();
