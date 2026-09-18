const { createClient } = require('bedrock-protocol');
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ==========================================
// EXPRESS WEB SERVER (for Railway health check)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('MintBot and Discord bridge are running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Web server listening on port ${PORT}`);
});

// ==========================================
// CONFIGURATION
// ==========================================
const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'welcome'; // Renamed username to welcome as requested
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

let mcClient = null;

// ==========================================
// DISCORD BOT INITIALIZATION
// ==========================================
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

discordClient.once('ready', () => {
    console.log(`✅ Discord bot logged in as ${discordClient.user.tag}`);
    console.log('📝 Focused Mode: Shard Pay & General Commands Ready');
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!cmd ')) {
        const fullArg = message.content.slice(5).trim();
        
        if (!fullArg) {
            return message.reply('❌ Usage: `!cmd /shard pay <player> <amount>`');
        }

        console.log(`\n[Discord] ${message.author.username}: !cmd ${fullArg}`);

        if (!mcClient) {
            return message.reply('❌ Minecraft bot is offline. Try again later.');
        }

        // Dedicated processing for shard pay and commands
        const commandToSend = processShardCommand(fullArg);
        console.log(`[Sending to MC]: "${commandToSend}"`);

        try {
            mcClient.queue('text', {
                type: 'chat',
                needs_translation: false,
                source_name: USERNAME,
                xuid: '',
                platform_chat_id: '',
                message: commandToSend
            });

            message.react('✅');
            console.log(`✅ Successfully executed: ${commandToSend}`);

        } catch (err) {
            console.error('❌ Error sending to MC:', err.message);
            message.reply('❌ Failed to execute command in-game.');
            message.react('❌');
        }
    }
});

/**
 * Foolproof command parser focused entirely on shard pay and direct routing
 */
function processShardCommand(input) {
    const cleanInput = input.trim();
    const lowerInput = cleanInput.toLowerCase();

    // If the user types shard pay (with or without leading slash)
    if (lowerInput.startsWith('shard pay') || lowerInput.startsWith('/shard pay')) {
        return cleanInput.startsWith('/') ? cleanInput : `/${cleanInput}`;
    }

    // If it's another command starting with a slash, pass it straight through
    if (cleanInput.startsWith('/')) {
        return cleanInput;
    }

    // Default fallback pass-through
    return cleanInput;
}

discordClient.login(DISCORD_TOKEN);

// ==========================================
// MINECRAFT BEDROCK BOT
// ==========================================
function startBedrockBot() {
    console.log('\n🎮 Creating Bedrock client...');

    mcClient = createClient({
        host: HOST,
        port: MC_PORT,
        username: USERNAME,
        offline: false,
        connectTimeout: 120000,
        profilesFolder: './',
        onMsaCode: (data) => {
            console.log('\n==========================================');
            console.log('🔑 MICROSOFT LOGIN REQUIRED');
            console.log('==========================================');
            console.log('Open: ' + data.verification_uri);
            console.log('User Code: ' + data.user_code);
            console.log('==========================================\n');
        }
    });

    mcClient.on('spawn', () => {
        console.log('\n✅ BOT SPAWNED SUCCESSFULLY ON MINTSMP!\n');
    });

    mcClient.on('text', (packet) => {
        if (packet.type === 'chat' || packet.type === 'say') {
            console.log(`[In-Game] ${packet.source_name}: ${packet.message}`);
        }
    });

    mcClient.on('close', (reason) => {
        console.log(`\n❌ Disconnected: ${reason}`);
        mcClient = null;
        console.log('🔄 Reconnecting in 15 seconds...\n');
        setTimeout(startBedrockBot, 15000);
    });

    mcClient.on('error', (err) => {
        if (!err.message.includes('Invalid tag') && !err.message.includes('Read error for undefined')) {
            console.error('❌ Error:', err.message);
        }
    });
}

startBedrockBot();

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    if (mcClient) mcClient.close();
    discordClient.destroy();
    process.exit(0);
});
