const { createClient } = require('bedrock-protocol');
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('MintBot and Discord bridge are running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Web server listening on port ' + PORT);
});

const HOST = 'mintsmp.net';
const MC_PORT = 25125;
const USERNAME = 'MintBot_60';

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

discordClient.once('clientReady', () => {
    console.log('Discord bot logged in as ' + discordClient.user.tag + '!');
});

discordClient.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    if (!message.content.startsWith('!cmd ')) return;

    const commandOrText = message.content.slice(5).trim();

    console.log('[Discord Command] ' + commandOrText);

    if (!mcClient) {
        await message.reply('Minecraft bot is currently offline or reconnecting.');
        return;
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

        await message.react('✅');

        console.log('Sent to Minecraft: ' + commandOrText);

    } catch (err) {

        console.error('Failed to send message to Minecraft:', err);

        await message.reply('Failed to send message to Minecraft.');

    }

});

if (DISCORD_TOKEN) {

    discordClient.login(DISCORD_TOKEN);

} else {

    console.error('DISCORD_TOKEN is missing from Railway Variables!');

}

// ==========================================
// MINECRAFT BEDROCK BOT
// ==========================================

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

    // ==========================================
    // MINECRAFT CHAT -> DISCORD
    // ==========================================

    mcClient.on('text', (packet) => {

        if (packet.type !== 'chat' && packet.type !== 'say') {
            return;
        }

        const sender = packet.source_name || 'Server';

        const cleanMessage =
            '[In-Game] **' +
            sender +
            '**: ' +
            packet.message;

        console.log(cleanMessage);

        discordClient.guilds.cache.forEach((guild) => {

            guild.channels.cache.forEach((channel) => {

                if (
                    channel.isTextBased() &&
                    !channel.isDMBased()
                ) {

                    channel.send(cleanMessage).catch(() => {});

                }

            });

        });

    });

    // ==========================================
    // MINECRAFT CONNECTION CLOSED
    // ==========================================

    mcClient.on('close', (reason) => {

        console.log('CONNECTION CLOSED:', reason);

        mcClient = null;

        console.log('Reconnecting in 15 seconds...');

        setTimeout(startBedrockBot, 15000);

    });

    // ==========================================
    // MINECRAFT ERROR
    // ==========================================

    mcClient.on('error', (err) => {

        console.error('CLIENT ERROR:', err);

    });

}

// ==========================================
// START MINECRAFT BOT
// ==========================================

startBedrockBot();
