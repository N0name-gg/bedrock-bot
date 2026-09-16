const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('bedrock-protocol');
const express = require('express');

// Express Dashboard Setup (Strictly using Railway's PORT environment variable)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🌐 Bedrock Bot Dashboard is Running and Healthy!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Express Dashboard running on port ${PORT}`);
});

// Bot Configuration for mintsmp.net
const START_ACCOUNT = 60;
const END_ACCOUNT = 69;
const HOST = 'mintsmp.net';
const PORT_MC = 25125;

const bots = {};

function startBot(accountNumber) {
    const botId = accountNumber - 50; 
    
    console.log(`[Bot ${botId}] Attempting to connect account ${accountNumber}...`);

    try {
        const client = createClient({
            host: HOST,
            port: PORT_MC,
            username: `MintBot_${accountNumber}`,
            offline: true
        });

        client.on('spawn', () => {
            console.log(`[Bot ${botId}] Successfully spawned into the server.`);
        });

        client.on('close', () => {
            console.log(`[Bot ${botId}] Disconnected. Reconnecting in 15 seconds...`);
            setTimeout(() => startBot(accountNumber), 15000);
        });

        client.on('error', (err) => {
            console.log(`[Bot ${botId}] Error: ${err.message}`);
        });

        bots[botId] = client;
    } delay => {
        // safety catch
    } catch (err) {
        console.error(`[Bot ${botId}] Failed to initialize:`, err.message);
    }
}

// Delay launching bots by 5 seconds so Railway's web health check passes first without triggering SIGTERM
setTimeout(() => {
    let delay = 0;
    for (let acc = START_ACCOUNT; acc <= END_ACCOUNT; acc++) {
        setTimeout(() => startBot(acc), delay);
        delay += 3000; // Stagger by 3 seconds each
    }
}, 5000);

// Discord Controller Setup
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = '!cmd';

discordClient.on('ready', () => {
    console.log(`🤖 Discord Controller logged in as ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(' ');
    const targetId = args[0]; 
    const commandText = args.slice(1).join(' ');

    if (!targetId || !commandText) {
        return message.reply('Usage: `!cmd <bot_id/all> <text or command>`');
    }

    if (targetId.toLowerCase() === 'all') {
        for (const id in bots) {
            if (bots[id]) {
                bots[id].queue('text', {
                    type: 'chat',
                    needs_translation: false,
                    source_name: bots[id].username,
                    xuid: '',
                    platform_chat_id: '',
                    filtered_message: '',
                    message: commandText
                });
            }
        }
        message.reply(`Command broadcasted to all active bots: "${commandText}"`);
    } else if (bots[targetId]) {
        bots[targetId].queue('text', {
            type: 'chat',
            needs_translation: false,
            source_name: bots[targetId].username,
            xuid: '',
            platform_chat_id: '',
            filtered_message: '',
            message: commandText
        });
        message.reply(`Sent command from Bot ${targetId}: "${commandText}"`);
    } else {
        message.reply(`Bot ID ${targetId} not found. Valid IDs are 10 to 19.`);
    }
});

discordClient.login(process.env.DISCORD_TOKEN);
