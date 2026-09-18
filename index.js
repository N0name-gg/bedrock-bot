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
const USERNAME = 'MintCompanion';
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
    console.log('📝 Available Commands:');
    console.log('    !cmd welcome');
    console.log('    !cmd /afk');
    console.log('    !cmd /home (or /home1, /home2, etc.)');
    console.log('    !cmd /shard pay <player> <amount>');
    console.log('    !cmd <any message>');
});

discordClient.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if message starts with !cmd
    if (message.content.startsWith('!cmd ')) {
        const fullArg = message.content.slice(5).trim();
        
        if (!fullArg) {
            return message.reply('❌ Usage: `!cmd <message or command>`');
        }

        console.log(`\n[Discord] ${message.author.username}: !cmd ${fullArg}`);

        // Check if Minecraft bot is connected
        if (!mcClient) {
            return message.reply('❌ Minecraft bot is offline. Try again later.');
        }

        // Process the command/message routing cleanly
        const commandToSend = processCommand(fullArg);
        console.log(`[Sending to MC]: "${commandToSend}"`);

        try {
            // Send the exact text/command to Minecraft server chat
            mcClient.queue('text', {
                type: 'chat',
                needs_translation: false,
                source_name: USERNAME,
                xuid: '',
                platform_chat_id: '',
                message: commandToSend
            });

            message.react('✅');
            console.log(`✅ Successfully processed: ${commandToSend}`);

        } catch (err) {
            console.error('❌ Error sending to MC:', err.message);
            message.reply('❌ Failed to execute command in-game.');
            message.react('❌');
        }
    }
});

/**
 * Process commands and apply precise routing rules without fallbacks
 */
function processCommand(input) {
    const lowerInput = input.toLowerCase().trim();

    // !cmd welcome -> custom chat greeting
    if (lowerInput === 'welcome') {
        return 'Welcome to the server everyone!';
    }
    
    // !cmd afk, home, or shard pay -> ensure they have a leading slash
    if (lowerInput === 'afk' || lowerInput.startsWith('home') || lowerInput.startsWith('shard pay')) {
        return input.startsWith('/') ? input : `/${input}`;
    }

    // If the user manually typed a slash command, pass it directly
    if (input.startsWith('/')) {
        return input;
    }

    // Otherwise, return normal text verbatim
    return input;
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
        // Suppress harmless NBT block entity and packet noise errors
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
