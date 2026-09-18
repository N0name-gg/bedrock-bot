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
const USERNAME = 'MintBot'; // Change this to a unique bot name
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
    console.log('📝 Commands ready: !cmd <message or command>');
});

discordClient.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if message starts with !cmd
    if (message.content.startsWith('!cmd ')) {
        const fullArg = message.content.slice(5).trim();
        
        if (!fullArg) {
            return message.reply('❌ Please provide a message or command. Usage: `!cmd <message>`');
        }

        console.log(`\n[Discord Command Triggered]: "${fullArg}" from ${message.author.username}`);

        // Check if Minecraft bot is connected
        if (!mcClient) {
            return message.reply('❌ Minecraft bot is currently offline or reconnecting.');
        }

        // Process the command
        let commandToSend = processCommand(fullArg);

        try {
            console.log(`[Sending to MC]: "${commandToSend}"`);

            // Send message to Minecraft server using write() method
            mcClient.write('text', {
                type: 'chat',
                needs_translation: false,
                source_name: USERNAME,
                xuid: '',
                platform_chat_id: '',
                message: commandToSend
            });

            // React with checkmark
            message.react('✅');
            console.log(`✅ Successfully sent to Minecraft server`);

        } catch (err) {
            console.error('❌ Failed to send message to Minecraft:', err.message);
            message.reply('❌ Failed to execute command in-game.');
            message.react('❌');
        }
    }
});

/**
 * Process commands and apply custom routing rules
 * @param {string} input - The user input after !cmd
 * @returns {string} - The processed command to send to Minecraft
 */
function processCommand(input) {
    const lowerInput = input.toLowerCase();

    // Custom shortcuts and routing rules
    if (lowerInput === 'welcome') {
        return 'Welcome to the server everyone!';
    } 
    else if (lowerInput === 'afk') {
        return '/afk';
    } 
    else if (lowerInput.startsWith('shard pay ')) {
        // Convert "shard pay Name 100" to "/shard pay Name 100"
        return `/${input}`;
    } 
    else if (lowerInput.startsWith('home')) {
        // Convert "home1" to "/home1"
        return `/${input}`;
    }
    else if (lowerInput.startsWith('/')) {
        // If it already starts with /, send as-is
        return input;
    }
    else {
        // Default: send as regular chat message
        return input;
    }
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

    // Bot spawned successfully
    mcClient.on('spawn', () => {
        console.log('\n==========================================');
        console.log('✅ BOT SPAWNED SUCCESSFULLY ON MINTSMP!');
        console.log('✅ Bot is ready to relay messages from Discord');
        console.log('==========================================\n');
    });

    // Receive text messages from the server
    mcClient.on('text', (packet) => {
        if (packet.type === 'chat' || packet.type === 'say') {
            console.log(`[In-Game] ${packet.source_name}: ${packet.message}`);
        }
    });

    // Connection closed - reconnect
    mcClient.on('close', (reason) => {
        console.log(`\n❌ CONNECTION CLOSED: ${reason}`);
        mcClient = null;
        console.log('🔄 Reconnecting in 15 seconds...\n');
        setTimeout(startBedrockBot, 15000);
    });

    // Handle errors
    mcClient.on('error', (err) => {
        console.error('❌ CLIENT ERROR:', err.message);
    });

    // Handle disconnection
    mcClient.on('disconnect', (reason) => {
        console.log(`⚠️ Disconnected: ${reason}`);
        mcClient = null;
    });
}

// Start the bot
startBedrockBot();

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    if (mcClient) {
        mcClient.close();
    }
    discordClient.destroy();
    process.exit(0);
});
