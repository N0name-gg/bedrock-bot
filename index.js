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
const USERNAME = 'hello';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
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
    console.log(`Discord bot logged in as ${discordClient.user.tag}! Ready for custom commands.`);
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Checks if your message starts with !cmd
    if (message.content.startsWith('!cmd ')) {
        const fullArg = message.content.slice(5).trim();
        console.log(`[Discord Command Triggered]: "${fullArg}"`);

        if (!mcClient) {
            return message.reply('❌ Minecraft bot is currently offline or reconnecting.');
        }

        let commandToSend = fullArg;

        // Custom routing rules for your shortcuts
        if (fullArg.toLowerCase() === 'welcome') {
            commandToSend = 'Welcome to the server everyone!';
        } else if (fullArg.toLowerCase() === 'afk') {
            commandToSend = '/afk';
        } else if (fullArg.toLowerCase().startsWith('shard pay')) {
            // e.g. !cmd shard pay Name 100 becomes /shard pay Name 100
            commandToSend = `/${fullArg}`;
        } else if (fullArg.toLowerCase().startsWith('home')) {
            // e.g. !cmd home1 becomes /home1
            commandToSend = `/${fullArg}`;
        }

        try {
            // Sends the final formatted command/text into the Minecraft server
            mcClient.queue('text', {
                type: 'chat',
                needs_translation: false,
                source_name: USERNAME,
                xuid: '',
                platform_chat_id: '',
                message: commandToSend
            });

            message.react('✅');
            console.log(`✅ Sent to Minecraft server: ${commandToSend}`);
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

    mcClient.on('text', (packet) => {
        if (packet.type === 'chat' || packet.type === 'say') {
            console.log(`[In-Game] ${packet.source_name}: ${packet.message}`);
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
