const express = require('express');
const bedrock = require('bedrock-protocol');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Automatically generate accounts gingerpatron001 through gingerpatron005 (total of 5 accounts)
const botsConfig = [];
for (let i = 1; i <= 5; i++) {
  const paddedId = String(i).padStart(3, '0');
  botsConfig.push({
    id: i, // Bot 1 to 5
    username: `gingerpatron${paddedId}@outlook.com`,
    folder: `./profiles/bot${i}`
  });
}

// Ensure profile directories exist for token caching
botsConfig.forEach(cfg => {
  if (!fs.existsSync(cfg.folder)) {
    fs.mkdirSync(cfg.folder, { recursive: true });
  }
});

const activeBots = {};          // Stores active client instances
const botSpawned = {};          // Tracks if the bot actually reached the 'spawn' event
const botEnabled = {};          // Tracks if a bot is authorized to run (true/false)
const botLoginData = {};        // Stores active Microsoft MSA verification URIs and user codes per bot

let currentHost = 'mintsmp.net';
let currentPort = 25125;

// ==========================================
// HTML DASHBOARD INTERFACE (with Embedded Login Boxes)
// ==========================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>MintSMP Multi-Bot Dashboard</title>
      <style>
        body { background: #0f172a; color: #fff; font-family: Arial, sans-serif; text-align: center; padding: 20px; margin: 0; }
        h1 { color: #38bdf8; margin-bottom: 5px; }
        .config-bar { background: #1e293b; padding: 12px; border-radius: 8px; width: 500px; margin: 15px auto; display: flex; justify-content: space-around; }
        .config-bar input { background: #0f172a; border: 1px solid #475569; color: #fff; padding: 6px 10px; border-radius: 4px; }
        .global-btns { margin: 15px 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 1050px; margin: 0 auto; }
        .card { background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; text-align: left; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; flex-direction: column; justify-content: space-between; }
        .card h3 { margin-top: 0; margin-bottom: 5px; color: #f8fafc; font-size: 16px; }
        .card p { margin: 4px 0 8px 0; font-size: 12px; color: #94a3b8; word-break: break-all; }
        .login-box { background: #0f172a; padding: 10px; margin: 8px 0; border-radius: 6px; border: 1px solid #38bdf8; font-size: 12px; }
        .login-box a { color: #38bdf8; font-weight: bold; text-decoration: underline; }
        .login-code { color: #f43f5e; font-size: 15px; font-weight: bold; background: #1e293b; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
        button { padding: 8px 14px; cursor: pointer; border: none; border-radius: 6px; font-weight: bold; font-size: 13px; }
        .btn-connect { background: #22c55e; color: white; flex: 1; }
        .btn-disconnect { background: #ef4444; color: white; flex: 1; }
        .btn-row { display: flex; gap: 8px; margin-top: 10px; }
        .btn-global-connect { background: #16a34a; color: white; padding: 10px 20px; font-size: 14px; margin-right: 10px; cursor: pointer; border-radius: 6px; border: none; font-weight: bold; }
        .btn-global-disconnect { background: #dc2626; color: white; padding: 10px 20px; font-size: 14px; cursor: pointer; border-radius: 6px; border: none; font-weight: bold; }
        .status-online { color: #22c55e; font-weight: bold; }
        .status-offline { color: #ef4444; font-weight: bold; }
        .status-awaiting { color: #f59e0b; font-weight: bold; }
        .status-connecting { color: #38bdf8; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>MintSMP Multi-Bot Dashboard</h1>
      <p style="color: #94a3b8;">Managing 5 Isolated Bedrock Accounts (gingerpatron001 - gingerpatron005)</p>

      <div class="config-bar">
        <div>Server IP: <input type="text" id="serverIp" value="mintsmp.net"></div>
        <div>Port: <input type="text" id="serverPort" value="25125"></div>
      </div>

      <div class="global-btns">
        <button class="btn-global-connect" onclick="controlAll('connect')">Connect All Accounts</button>
        <button class="btn-global-disconnect" onclick="controlAll('disconnect')">Disconnect All Accounts</button>
      </div>

      <div class="grid" id="botGrid"></div>

      <script>
        const bots = ${JSON.stringify(botsConfig)};
        
        async function fetchStatus() {
          try {
            const res = await fetch('/status');
            const data = await res.json();
            
            const grid = document.getElementById('botGrid');
            grid.innerHTML = '';
            
            bots.forEach(bot => {
              const info = data[bot.id] || { status: 'Offline', verification_uri: null, user_code: null };
              
              let statusClass = 'status-offline';
              if (info.status === 'Online') statusClass = 'status-online';
              else if (info.status === 'Awaiting Login') statusClass = 'status-awaiting';
              else if (info.status === 'Connecting...') statusClass = 'status-connecting';

              let loginHtml = '';
              if (info.user_code && info.verification_uri) {
                loginHtml = \`
                  <div class="login-box">
                    🔑 <b>Login Required:</b><br>
                    🔗 <a href="\${info.verification_uri}" target="_blank">Open Microsoft Link</a><br>
                    Code: <span class="login-code">\${info.user_code}</span>
                  </div>
                \`;
              }

              grid.innerHTML += \`
                <div class="card">
                  <div>
                    <h3>Bot \${bot.id}</h3>
                    <p>\${bot.username} <br>Status: <span class="\${statusClass}">\${info.status}</span></p>
                    \${loginHtml}
                  </div>
                  <div class="btn-row">
                    <button class="btn-connect" onclick="botAction(\${bot.id}, 'connect')">Connect</button>
                    <button class="btn-disconnect" onclick="botAction(\${bot.id}, 'disconnect')">Disconnect</button>
                  </div>
                </div>
              \`;
            });
          } catch(e) {}
        }

        async function botAction(id, action) {
          const host = document.getElementById('serverIp').value;
          const port = document.getElementById('serverPort').value;
          await fetch('/bot/' + id + '/' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port })
          });
          fetchStatus();
        }

        async function controlAll(action) {
          const host = document.getElementById('serverIp').value;
          const port = document.getElementById('serverPort').value;
          await fetch('/bots/' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port })
          });
          fetchStatus();
        }

        fetchStatus();
        setInterval(fetchStatus, 3000); // Auto-refresh status & login links every 3 seconds
      </script>
    </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  const status = {};
  botsConfig.forEach(bot => {
    let stat = 'Offline';
    if (botSpawned[bot.id]) {
      stat = 'Online';
    } else if (botLoginData[bot.id]) {
      stat = 'Awaiting Login';
    } else if (activeBots[bot.id]) {
      stat = 'Connecting...';
    }

    status[bot.id] = {
      status: stat,
      verification_uri: botLoginData[bot.id]?.verification_uri || null,
      user_code: botLoginData[bot.id]?.user_code || null
    };
  });
  res.json(status);
});

function cleanupBot(id) {
  if (activeBots[id]) {
    try {
      activeBots[id].removeAllListeners();
    } catch (e) {}
    delete activeBots[id];
  }
  botSpawned[id] = false;
  delete botLoginData[id];
}

function startBot(botInfo, host, port) {
  const id = botInfo.id;
  if (activeBots[id]) return;

  currentHost = host || currentHost;
  currentPort = parseInt(port) || currentPort;

  botSpawned[id] = false;
  botLoginData[id] = null;
  console.log(`🚀 Connecting Bot ${id} (${botInfo.username})...`);

  try {
    const client = bedrock.createClient({
      host: currentHost,
      port: currentPort,
      username: botInfo.username,
      offline: false,
      connectTimeout: 120000,
      profilesFolder: botInfo.folder,
      onMsaCode: (data) => {
        botLoginData[id] = data;
        console.log(`\n=== MICROSOFT LOGIN FOR BOT ${id} (${botInfo.username}) ===`);
        console.log(`🔗 Link: ${data.verification_uri}`);
        console.log(`🔢 Code: ${data.user_code}`);
        console.log('==================================================\n');
      }
    });

    activeBots[id] = client;

    const markOnline = () => {
      if (!botSpawned[id]) {
        console.log(`✅ Bot ${id} (${botInfo.username}) successfully entered the world!`);
        botSpawned[id] = true;
        botLoginData[id] = null; // Clear login prompt once authenticated & spawned
      }
    };

    // Multiple listeners to ensure status immediately flips to Online when in-game
    client.on('spawn', markOnline);
    client.on('join', markOnline);
    client.on('packet', (packet) => {
      if (packet.name === 'play_status' || packet.name === 'start_game') {
        markOnline();
      }
    });

    client.on('error', (err) => {
      if (!err.message.includes('Invalid tag') && !err.message.includes('Read error for undefined')) {
        console.error(`⚠️ Bot ${id} error:`, err.message);
      }
      botSpawned[id] = false;
    });

    client.on('close', () => {
      console.log(`🔌 Bot ${id} disconnected.`);
      cleanupBot(id);
    });

  } catch (e) {
    console.error(`❌ Failed to start Bot ${id}:`, e.message);
    cleanupBot(id);
  }
}

// Background Sequential Loop: Checks bots 1 to 5 in order with a 6-second delay between each
async function runAutoConnectLoop() {
  while (true) {
    for (let i = 0; i < botsConfig.length; i++) {
      const botInfo = botsConfig[i];
      const id = botInfo.id;

      if (botEnabled[id]) {
        if (!botSpawned[id] && !activeBots[id] && !botLoginData[id]) {
          console.log(`🔄 [Loop] Bot ${id} is offline. Reconnecting...`);
          startBot(botInfo, currentHost, currentPort);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }
}

app.post('/bot/:id/:action', (req, res) => {
  const id = parseInt(req.params.id);
  const action = req.params.action;
  const { host, port } = req.body;
  const botInfo = botsConfig.find(b => b.id === id);

  if (!botInfo) return res.status(404).json({ error: 'Bot not found' });
  currentHost = host || currentHost;
  currentPort = parseInt(port) || currentPort;

  if (action === 'connect') {
    botEnabled[id] = true;
    startBot(botInfo, currentHost, currentPort);
  } else if (action === 'disconnect') {
    botEnabled[id] = false;
    botSpawned[id] = false;
    if (activeBots[id]) {
      try {
        activeBots[id].close();
      } catch (e) {}
      cleanupBot(id);
    }
    console.log(`🛑 Bot ${id} manually disconnected.`);
  }

  res.json({ success: true });
});

app.post('/bots/:action', (req, res) => {
  const action = req.params.action;
  const { host, port } = req.body;

  currentHost = host || currentHost;
  currentPort = parseInt(port) || currentPort;

  if (action === 'connect') {
    botsConfig.forEach(botInfo => {
      botEnabled[botInfo.id] = true;
    });
    console.log(`🚀 Connect All triggered. Sequential loop handling connections.`);
  } else if (action === 'disconnect') {
    botsConfig.forEach(botInfo => {
      const id = botInfo.id;
      botEnabled[id] = false;
      botSpawned[id] = false;
      if (activeBots[id]) {
        try {
          activeBots[id].close();
        } catch (e) {}
        cleanupBot(id);
      }
    });
    console.log(`🛑 Disconnect All triggered. All bots disabled.`);
  }

  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Dashboard running on port ${PORT}`);
  runAutoConnectLoop();
});

// ==========================================
// DISCORD MASTER CONTROLLER
// ==========================================
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

discordClient.on('ready', () => {
  console.log(`🤖 Discord Controller logged in as ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', (message) => {
  if (message.author.bot || !message.content.startsWith('!cmd')) return;

  const args = message.content.split(' ');
  if (args.length < 3) {
    return message.reply('❌ Invalid format. Use: `!cmd <1-5> <command>` or `!cmd all <command>`');
  }

  const targetId = args[1].toLowerCase();
  let contentText = args.slice(2).join(' ').trim();

  // Smart command normalizer for /home with spaces and auto-slashing
  const lowerContent = contentText.toLowerCase();
  if (lowerContent.startsWith('home ') || lowerContent === 'home') {
    contentText = contentText.startsWith('/') ? contentText : `/${contentText}`;
  } else if (!contentText.startsWith('/')) {
    contentText = `/${contentText}`;
  }

  function sendToGame(botClient, text) {
    botClient.queue('command_request', {
      command: text,
      origin: {
        type: 'player',
        uuid: '',
        request_id: '',
        player_entity_id: botClient.entityId
      },
      internal: false,
      version: 'latest'
    });
  }

  if (targetId === 'all') {
    let count = 0;
    for (const [id, botClient] of Object.entries(activeBots)) {
      if (botSpawned[id]) {
        sendToGame(botClient, contentText);
        count++;
      }
    }
    return message.reply(`✅ Broadcasted \`${contentText}\` to ${count} active bots.`);
  }

  const botId = parseInt(targetId);
  const targetBot = activeBots[botId];

  if (targetBot && botSpawned[botId]) {
    sendToGame(targetBot, contentText);
    message.reply(`✅ Executed \`${contentText}\` on Bot ${botId}.`);
  } else {
    message.reply(`❌ Bot ${botId} is either offline or hasn't fully spawned into the world yet.`);
  }
});

discordClient.login(process.env.DISCORD_TOKEN);
