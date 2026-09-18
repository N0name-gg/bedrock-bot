const { createClient } = require('bedrock-protocol');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const HOST = 'mintsmp.net';
const MC_PORT = 25125;

// Define 9 distinct bot configurations with isolated profile folders for token caching
const botsConfig = [
    { id: 1, username: 'welcome', folder: './profiles/bot1' },
    { id: 2, username: 'welcome', folder: './profiles/bot2' },
    { id: 3, username: 'welcome', folder: './profiles/bot3' },
    { id: 4, username: 'welcome', folder: './profiles/bot4' },
    { id: 5, username: 'welcome', folder: './profiles/bot5' },
    { id: 6, username: 'welcome', folder: './profiles/bot6' },
    { id: 7, username: 'welcome', folder: './profiles/bot7' },
    { id: 8, username: 'welcome', folder: './profiles/bot8' },
    { id: 9, username: 'welcome', folder: './profiles/bot9' },
];

// Runtime state for each bot
const botInstances = {};

botsConfig.forEach(config => {
    botInstances[config.id] = {
        id: config.id,
        username: config.username,
        folder: config.folder,
        client: null,
        status: 'Offline',
        lastCode: null,
        lastUri: null,
        manualStop: false
    };
});

// Ensure profile directories exist
botsConfig.forEach(cfg => {
    if (!fs.existsSync(cfg.folder)) {
        fs.mkdirSync(cfg.folder, { recursive: true });
    }
});

// --- Start a Specific Bot ---
function connectBot(botId) {
    const bot = botInstances[botId];
    if (!bot) return;

    if (bot.client) {
        console.log(`[Bot ${botId}] Already connected or connecting.`);
        return;
    }

    bot.manualStop = false;
    bot.status = 'Connecting...';
    console.log(`[Bot ${botId}] (${bot.username}) Connecting to ${HOST}:${MC_PORT}...`);

    try {
        bot.client = createClient({
            host: HOST,
            port: MC_PORT,
            username: bot.username,
            offline: false,
            connectTimeout: 120000,
            profilesFolder: bot.folder,
            onMsaCode: (data) => {
                bot.lastUri = data.verification_uri;
                bot.lastCode = data.user_code;
                bot.status = 'Awaiting Login';
                console.log(`\n==========================================`);
                console.log(`🔑 BOT ${botId} (${bot.username}) LOGIN REQUIRED`);
                console.log(`Open: ${data.verification_uri}`);
                console.log(`Code: ${data.user_code}`);
                console.log(`==========================================\n`);
            }
        });

        bot.client.on('spawn', () => {
            bot.status = 'Online';
            bot.lastCode = null;
            bot.lastUri = null;
            console.log(`✅ [Bot ${botId}] (${bot.username}) Spawned successfully!`);
        });

        bot.client.on('close', (reason) => {
            console.log(`❌ [Bot ${botId}] Disconnected:`, reason);
            bot.client = null;
            
            if (bot.manualStop) {
                bot.status = 'Offline';
            } else {
                bot.status = 'Reconnecting...';
                console.log(`🔄 [Bot ${botId}] Auto-reconnecting in 15 seconds...`);
                setTimeout(() => {
                    if (!bot.manualStop && !bot.client) {
                        connectBot(botId);
                    }
                }, 15000);
            }
        });

        bot.client.on('error', (err) => {
            if (!err.message.includes('Invalid tag') && !err.message.includes('Read error for undefined')) {
                console.error(`❌ [Bot ${botId}] Error:`, err.message);
            }
        });

    } catch (err) {
        console.error(`❌ [Bot ${botId}] Failed to create client:`, err.message);
        bot.status = 'Error';
        bot.client = null;
    }
}

// --- Stop a Specific Bot ---
function disconnectBot(botId) {
    const bot = botInstances[botId];
    if (!bot) return;

    bot.manualStop = true;
    bot.status = 'Offline';
    bot.lastCode = null;
    bot.lastUri = null;

    if (bot.client) {
        try {
            bot.client.close();
        } catch (e) {}
        bot.client = null;
    }
    console.log(`🛑 [Bot ${botId}] Manually disconnected.`);
}

// ==========================================
// WEB DASHBOARD UI
// ==========================================
app.get('/', (req, res) => {
    let cardsHtml = '';
    
    Object.values(botInstances).forEach(bot => {
        let statusColor = '#ff4d4d'; // Red for offline
        if (bot.status === 'Online') statusColor = '#2ecc71'; // Green
        else if (bot.status.includes('Awaiting') || bot.status.includes('Connecting')) statusColor = '#f39c12'; // Yellow

        let loginBox = '';
        if (bot.lastCode) {
            loginBox = `
                <div style="background: #1e293b; padding: 8px; margin-top: 8px; border-radius: 4px; font-size: 12px;">
                    🔗 <a href="${bot.lastUri}" target="_blank" style="color: #38bdf8;">Microsoft Link</a><br>
                    🔑 Code: <b style="color: #f43f5e; font-size: 14px;">${bot.lastCode}</b>
                </div>
            `;
        }

        cardsHtml += `
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 8px 0; color: #f8fafc;">Bot ${bot.id}</h3>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #94a3b8;">${bot.username}</p>
                    <p style="margin: 0 0 8px 0; font-size: 14px;">Status: <span style="color: ${statusColor}; font-weight: bold;">${bot.status}</span></p>
                    ${loginBox}
                </div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <form action="/connect/${bot.id}" method="POST" style="flex: 1;">
                        <button type="submit" style="width: 100%; background: #22c55e; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: bold;">Connect</button>
                    </form>
                    <form action="/disconnect/${bot.id}" method="POST" style="flex: 1;">
                        <button type="submit" style="width: 100%; background: #ef4444; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: bold;">Disconnect</button>
                    </form>
                </div>
            </div>
        `;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>MintSMP Multi-Bot Dashboard</title>
            <meta http-equiv="refresh" content="5"> <!-- Auto-refresh status every 5 seconds -->
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .container { max-width: 1200px; margin: 0 auto; }
                h1 { text-align: center; color: #38bdf8; margin-bottom: 5px; }
                .subtitle { text-align: center; color: #94a3b8; margin-bottom: 25px; }
                .global-controls { text-align: center; margin-bottom: 30px; display: flex; justify-content: center; gap: 15px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
                button:hover { opacity: 0.9; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>MintSMP Bot Dashboard</h1>
                <p class="subtitle">Managing 9 Isolated Bedrock Accounts with Auto-Reconnect</p>
                
                <div class="global-controls">
                    <form action="/connect-all" method="POST">
                        <button type="submit" style="background: #22c55e; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px;">Connect All Accounts</button>
                    </form>
                    <form action="/disconnect-all" method="POST">
                        <button type="submit" style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px;">Disconnect All Accounts</button>
                    </form>
                </div>

                <div class="grid">
                    ${cardsHtml}
                </div>
            </div>
        </body>
        </html>
    `);
});

// --- Web Endpoints ---
app.post('/connect/:id', (req, res) => {
    const id = parseInt(req.params.id);
    connectBot(id);
    res.redirect('/');
});

app.post('/disconnect/:id', (req, res) => {
    const id = parseInt(req.params.id);
    disconnectBot(id);
    res.redirect('/');
});

app.post('/connect-all', (req, res) => {
    Object.keys(botInstances).forEach(id => connectBot(parseInt(id)));
    res.redirect('/');
});

app.post('/disconnect-all', (req, res) => {
    Object.keys(botInstances).forEach(id => disconnectBot(parseInt(id)));
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Dashboard web server running on port ${PORT}`);
});
