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

// Automatically generate accounts 50 through 58 (total of 9 accounts)
const botsConfig = [];
for (let i = 50; i <= 58; i++) {
  botsConfig.push({
    id: i - 49, // Bot 1 to 9
    username: `vsurya.prathik${i}@outlook.com`,
    folder: `./profiles/bot${i - 49}`
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

let currentHost = 'mintsmp.net';
let currentPort = 25125;

// ==========================================
// HTML DASHBOARD INTERFACE
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
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 1000px; margin: 0 auto; }
        .card { background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; text-align: left; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .card h3 { margin-top: 0; margin-bottom: 5px; color: #f8fafc; font-size: 16px; }
        .card p { margin: 4px 0 12px 0; font-size: 12px; color: #94a3b8; word-break: break-all; }
        button { padding: 8px 14px; cursor: pointer; border: none; border-radius: 6px; font-weight: bold; font-size: 13px; }
        .btn-connect { background: #22c55e; color: white; }
        .btn-disconnect { background: #ef4444; color: white; }
        .btn-global-connect { background: #16a34a; color: white; padding: 10px 20px; font-size: 14px; margin-right: 10px; cursor: pointer; border-radius: 6px; border: none; font-weight: bold; }
        .btn-global-disconnect { background: #dc2626; color: white; padding: 10px 20px; font-size: 14px; cursor: pointer; border-radius: 6px; border: none; font-weight: bold; }
        .status-online { color: #22c55e; font-weight: bold; }
        .status-offline { color: #ef4444; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>MintSMP Multi-Bot Dashboard</h1>
      <p style="color: #94a3b8;">Managing 9 Isolated Bedrock Accounts (Sequential 6s Loop Reconnect)</p>

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
        function renderBots() {
          const grid = document.getElementById('botGrid');
          grid.innerHTML = '';
          bots.forEach(bot => {
            grid.innerHTML += \`
              <div class="card">
                <h3>Bot \${bot.id}</h3>
                <p>\${bot.username} <br>Status: <span id="status-\${bot.id}" class="status-offline">Offline</span></p>
                <button class="btn-connect" onclick="botAction(\${bot.id}, 'connect')">Connect</button>
                <button class="btn-disconnect" onclick="botAction(\${bot.id}, 'disconnect')">Disconnect</button>
              </div>
            \`;
          });
        }

        async function fetchStatus() {
          try {
            const res = await fetch('/status');
            const data = await res.json();
            bots.forEach(bot => {
              const el = document.getElementById(\`status-\${bot.id}\`);
              if (data[bot.id]) {
                el.innerText = 'Online';
                el.className = 'status-online';
              } else {
                el.innerText = 'Offline';
                el.className = 'status-offline';
              }
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

        renderBots();
        setInterval(fetchStatus, 3000);
      </script>
    </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  const status = {};
  botsConfig.forEach(bot => {
    status[bot.id] = !!botSpawned[bot.id];
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
}

function startBot(botInfo, host, port) {
  const id = botInfo.id;
  if (activeBots[id]) return;

  currentHost = host || currentHost;
  currentPort = parseInt(port) || currentPort;

  botSpawned[id] = false;
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
        console.log(`\n=== MICROSOFT LOGIN FOR BOT ${id} (${botInfo.username}) ===`);
        console.log(`🔗 Link: ${data.verification_uri}`);
        console.log(`🔢 Code: ${data.user_code}`);
        console.log('==================================================\n');
      }
    });

    activeBots[id] = client;

    client.on('spawn', () => {
      console.log(`✅ Bot ${id} (${botInfo.username}) spawned successfully!`);
      botSpawned[id] = true;
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

// Background Sequential Loop: Checks bots 1 to 9 in order with a 6-second delay between each
async function runAutoConnectLoop() {
  while (true) {
    for (let i = 0; i < botsConfig.length; i++) {
      const botInfo = botsConfig[i];
      const id = botInfo.id;

      if (botEnabled[id]) {
        if (!botSpawned[id] && !activeBots[id]) {
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
    return message.reply('❌ Invalid format. Use: `!cmd <1-9> <command>` or `!cmd all <command>`');
  }

  const targetId = args[1].toLowerCase();
  let contentText = args.slice(2).join(' ').trim();

  // Smart command normalizer for /home with spaces (e.g. "home 1" -> "/home 1")
  const lowerContent = contentText.toLowerCase();
  if (lowerContent.startsWith('home ') || lowerContent === 'home') {
    contentText = contentText.startsWith('/') ? contentText : `/${contentText}`;
  } else if (!contentText.startsWith('/')) {
    contentText = `/${contentText}`;
  }

  // Unified Packet Sender utilizing the working command_request payload
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

  // Broadcast to all active bots
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

  // Command a single bot (1 through 9)
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
