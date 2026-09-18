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

// Hardcoded channel ID from your screenshot to guarantee it matches instantly
const DISCORD_CHANNEL_ID = '1550417730296094750'; // <-- Wait, let's inject your actual ID below or via env
const DISCORD_TOKEN = process.env.MTU0NDMzMzg3NjQ4MTEwNTkzMA.G63Irz.ZSRmI8zsX4gtfMv-hBlknaMcvcROsNN_GKb0x0;

let discordChannel = null;
let mcClient = null;

// --- Initialize Discord Bot ---
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

discordClient.once('ready', async () => {
    console.log(`Discord bot logged in as ${discordClient.user.tag}!`);
    try {
        // Fetch channel directly by ID from environment or fallback
        const targetId = process.env.DISCORD_CHANNEL_ID || DISCORD_CHANNEL_ID;
        discordChannel = await discordClient.channels.fetch(targetId);
        console.log(`Successfully hooked into Discord channel: ${discordChannel.name}`);
    } catch (err) {
        console.error('Could not fetch Discord channel. Check your DISCORD_CHANNEL_ID!', err);
    }
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!discordChannel || message.channel.id !== discordChannel.id) return;

    if (message.content.startsWith('!cmd ')) {
        const commandOrText = message.content.slice(5).trim();
        console.log(`[Discord Command Triggered]: "${commandOrText}"`);

        if (!mcClient) {
            return message.reply('❌ Minecraft bot is currently offline or reconnecting.');
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

            message.react('✅');
            console.log(`✅ Sent to Minecraft server: ${commandOrText}`);
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
        profilesFolder: './',
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
        if (packet.type === 'chat' || packet.type === 'say') {
            const cleanMessage = `[In-Game] **${packet.source_name}**: ${packet.message}`;
            console.log(cleanMessage);
            
            // Automatically mirror in-game chat straight into your Discord channel!
            if (discordChannel) {
                discordChannel.send(cleanMessage).catch(() => {});
            }
        }
    });

    mcClient.on('close', (reason) => {
        console.log('CONNECTION CLOSED:', reason);
        mcClient = null;
        setTimeout(startBedrockBot, 15000);
    });

    mcClient.on('error', (err) => {
        console.error('CLIENT ERROR:', err);
    });
}

startBedrockBot();
