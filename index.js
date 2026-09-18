const { createClient } = require('bedrock-protocol');
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Keep Railway health check active so the container never shuts down
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MintBot and Discord bridge are running!'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server listening on port ${PORT}`);
});

const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'MintBot_60';

// ---------------------------------------------------------------------------
// CONFIGURATION: Ensure your DISCORD_TOKEN and DISCORD_CHANNEL_ID are added 
// as Environment Variables in your Railway project dashboard.
// ---------------------------------------------------------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TARGET_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

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
        discordChannel = await discordClient.channels.fetch(TARGET_CHANNEL_ID);
        console.log(`Successfully hooked into Discord channel: ${discordChannel.name}`);
    } catch (err) {
        console.error('Could not fetch Discord channel. Check your DISCORD_CHANNEL_ID in Railway variables!', err);
    }
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!discordChannel || message.channel.id !== discordChannel.id) return;

    // Checks if your message starts with !cmd
    if (message.content.startsWith('!cmd ')) {
        const commandOrText = message.content.slice(5).trim();
        console.log(`[Discord Command Triggered]: "${commandOrText}"`);

        if (!mcClient) {
            return message.reply('❌ Minecraft bot is currently offline or reconnecting.');
        }

        try {
            // Sends the command or chat message into the Minecraft server
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
        profilesFolder: './', // Caches your Microsoft token locally so you don't re-login on restart
        onMsaCode: (data) => {
            console.log('==========================================');
            console.log('🔑 MICROSOFT LOGIN REQUIRED');
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

    // Automatically mirrors in-game chat back into your Discord channel
    mcClient.on('text', (packet) => {
        if (packet.type === 'chat' || packet.type === 'say') {
            const cleanMessage = `[In-Game] **${packet.source_name}**: ${packet.message}`;
            console.log(cleanMessage);
            
            if (discordChannel) {
                discordChannel.send(cleanMessage).catch(() => {});
            }
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
