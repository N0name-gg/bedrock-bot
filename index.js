const { createClient } = require('bedrock-protocol');
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ==========================================
// EXPRESS WEB SERVER
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('MintBot running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Web server listening on port ${PORT}`);
});

// ==========================================
// CONFIGURATION
// ==========================================
const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'MintBot';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

let mcClient = null;

// ==========================================
// DISCORD BOT
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
    console.log('\n📝 Commands:');
    console.log('  !cmd welcome');
    console.log('  !cmd /afk');
    console.log('  !cmd /home');
    console.log('  !cmd /shard pay <player> <amount>\n');
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!cmd ')) {
        const fullArg = message.content.slice(5).trim();
        
        if (!fullArg) {
            return message.reply('❌ Usage: `!cmd <message>`');
        }

        console.log(`\n[Discord] ${message.author.username}: !cmd ${fullArg}`);

        if (!mcClient) {
            return message.reply('❌ Minecraft bot offline.');
        }

        const commandToSend = processCommand(fullArg);
        console.log(`[Processing]: "${commandToSend}"`);

        try {
            sendToMinecraft(commandToSend);
            message.react('✅');
            console.log(`✅ Sent`);

        } catch (err) {
            console.error('❌ Error:', err.message);
            message.react('❌');
        }
    }
});

function processCommand(input) {
    const lowerInput = input.toLowerCase();

    if (lowerInput === 'welcome') return 'welcome';
    if (lowerInput === '/afk') return '/afk';
    if (lowerInput === '/home') return '/home';
    if (lowerInput.startsWith('/shard pay ')) return input;
    if (lowerInput.startsWith('shard pay ')) return `/${input}`;
    if (input.startsWith('/')) return input;
    
    return input;
}

function sendToMinecraft(message) {
    console.log(`[Method Attempt] Trying to send: "${message}"`);

    // METHOD 1: Standard text packet
    try {
        console.log('[Trying] text packet with queue');
        mcClient.queue('text', {
            type: 'chat',
            needs_translation: false,
            source_name: USERNAME,
            xuid: '',
            platform_chat_id: '',
            message: message
        });
        console.log('[✓] Sent via text packet');
        return;
    } catch (e) {
        console.log('[✗] Text packet failed:', e.message);
    }

    // METHOD 2: Direct write with text packet
    try {
        console.log('[Trying] text packet with write');
        mcClient.write('text', {
            type: 'chat',
            needs_translation: false,
            source_name: USERNAME,
            message: message
        });
        console.log('[✓] Sent via write');
        return;
    } catch (e) {
        console.log('[✗] Write failed:', e.message);
    }

    // METHOD 3: Command packet for commands starting with /
    if (message.startsWith('/')) {
        try {
            console.log('[Trying] command_request packet');
            mcClient.queue('command_request', {
                command: message.substring(1),
                version: 1,
                origin: {
                    type: 'player'
                }
            });
            console.log('[✓] Sent via command_request');
            return;
        } catch (e) {
            console.log('[✗] Command request failed:', e.message);
        }
    }

    // METHOD 4: Try emote packet (some servers use this for chat)
    try {
        console.log('[Trying] emote packet');
        mcClient.queue('emote', {
            source_name: USERNAME,
            emote_id: '',
            flags: 0,
            xuid: '',
            platform_chat_id: '',
            message: message
        });
        console.log('[✓] Sent via emote');
        return;
    } catch (e) {
        console.log('[✗] Emote failed:', e.message);
    }

    console.error('[✗] All methods failed');
}

discordClient.login(DISCORD_TOKEN);

// ==========================================
// MINECRAFT BOT
// ==========================================
function startBedrockBot() {
    console.log('\n🎮 Connecting to Bedrock server...\n');

    mcClient = createClient({
        host: HOST,
        port: MC_PORT,
        username: USERNAME,
        offline: false,
        connectTimeout: 120000,
        profilesFolder: './',
        onMsaCode: (data) => {
            console.log('\n🔑 Login required at: ' + data.verification_uri);
            console.log('Code: ' + data.user_code + '\n');
        }
    });

    mcClient.on('spawn', () => {
        console.log('✅ Bot spawned! Ready to relay Discord messages.\n');
    });

    mcClient.on('text', (packet) => {
        if (packet.type === 'chat' || packet.type === 'say') {
            console.log(`[Chat] ${packet.source_name}: ${packet.message}`);
        }
    });

    mcClient.on('close', () => {
        console.log('\n❌ Disconnected');
        mcClient = null;
        console.log('🔄 Reconnecting in 15 seconds...\n');
        setTimeout(startBedrockBot, 15000);
    });

    mcClient.on('error', (err) => {
        // Suppress NBT errors
        if (!err.message.includes('Invalid tag') && !err.message.includes('block_entity')) {
            console.error('Error:', err.message);
        }
    });
}

startBedrockBot();

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down');
    if (mcClient) mcClient.close();
    discordClient.destroy();
    process.exit(0);
});
