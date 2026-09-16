const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('bedrock-protocol');
const express = require('express');

// 1. Express Dashboard Setup (Required for Railway health checks)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🌐 Bedrock Bot Dashboard & Controller are Running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Express Dashboard running on port ${PORT}`);
});

// 2. Bot Configuration for mintsmp.net
const START_ACCOUNT = 60;
const END_ACCOUNT = 69;
const HOST = 'mintsmp.net';
const PORT_MC = 25125;

const bots = {};

function startBot(accountNumber) {
    const botId = accountNumber - 50; // MintBot_60 -> Bot 10
    
    console.log(`[Bot ${botId}] Attempting to connect MintBot_${accountNumber}...`);

    try {
        const client = createClient({
            host: HOST,
            port: PORT_MC,
            username: `MintBot_${accountNumber}`,
            offline: true
        });

        client.on('spawn', () => {
            console.log(`[Bot ${botId}] Successfully spawned into mintsmp.net as MintBot_${accountNumber}.`);
        });

        client.on('close', () => {
            console.log(`[Bot ${botId}] Disconnected. Reconnecting in 15 seconds...`);
            setTimeout(() => startBot(accountNumber), 15000);
        });

        client.on('error', (err) => {
            console.log(`[Bot ${botId}] Error: ${err.message}`);
        });

        bots[botId] = client;
    } catch (err) {
        console.error(`[Bot ${botId}] Failed to initialize:`, err.message);
    }
}

// Stagger bot logins by a few seconds after the web server initializes
setTimeout(() => {
    let delay = 0;
    for (let acc = START_ACCOUNT; acc <= END_ACCOUNT; acc++) {
        setTimeout(() => startBot(acc), delay);
        delay += 3000; // 3 seconds gap between each bot connection
    }
}, 5000);

// 3. Discord Controller Setup
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
    const targetId = args[0]; // e.g., '10' for MintBot_60, or 'all'
    const commandText = args.slice(1).join(' ');

    if (!targetId || !commandText) {
        return message.reply('Usage: `!cmd <bot_id/all> <text or command>` (Valid Bot IDs: 10 to 19 for accounts 60-69)');
    }

    if (targetId.toLowerCase() === 'all') {
        let successCount = 0;
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
                successCount++;
            }
        }
        message.reply(`Command broadcasted by all ${successCount} active bots: "${commandText}"`);
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
        message.reply(`Bot ${targetId} (MintBot_${parseInt(targetId) + 50}) sent: "${commandText}"`);
    } else {
        message.reply(`Bot ID ${targetId} not found. Valid IDs are 10 to 19.`);
    }
});

// Logs in securely using your Railway variable
discordClient.login(process.env.DISCORD_TOKEN);
