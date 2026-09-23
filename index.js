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

// Automatically generate accounts hyper.eagle50 through hyper.eagle58 (total of 9 accounts)
const botsConfig = [];
for (let i = 50; i <= 58; i++) {
  botsConfig.push({
    id: i - 49, // Bot 1 to 9
    username: `hyper.eagle${i}@outlook.com`,
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
const botLoginData = {};        // Stores active Microsoft MSA verification URIs and user codes per bot

let currentHost = 'mintsmp.net';
let currentPort = 25125;

// ==========================================
// HTML DASHBOARD INTERFACE (with Animated Live Mesh Gradient Background)
// ==========================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>MintSMP Multi-Bot Dashboard</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

        body {
          margin: 0;
          padding: 30px;
          font-family: 'Poppins', sans-serif;
          color: #fff;
          text-align: center;
          min-height: 100vh;
          overflow-x: hidden;
          background-color: #0b0f19;
        }

        /* Dynamic Live Moving Mesh Gradient Background */
        .mesh-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          background-color: #0b0f19;
          overflow: hidden;
        }

        .blob {
          position: absolute;
          filter: blur(80px);
          opacity: 0.65;
          animation: floatBlob 12s ease-in-out infinite alternate;
        }

        .blob-1 {
          width: 450px;
          height: 450px;
          background: #38bdf8;
          top: -10%;
          left: -10%;
          animation-duration: 14s;
        }

        .blob-2 {
          width: 500px;
          height: 500px;
          background: #f43f5e;
          bottom: -15%;
          right: -10%;
          animation-duration: 18s;
          animation-delay: -3s;
        }

        .blob-3 {
          width: 400px;
          height: 400px;
          background: #facc15;
          top: 30%;
          left: 35%;
          animation-duration: 10s;
          animation-delay: -5s;
          opacity: 0.45;
        }

        @keyframes floatBlob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(80px, 60px) scale(1.15);
          }
          100% {
            transform: translate(-60px, -40px) scale(0.9);
          }
        }

        h1 {
          color: #f8fafc;
          font-weight: 800;
          font-size: 2.5rem;
          margin-bottom: 5px;
          text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
        }

        p.subtitle {
          color: #94a3b8;
          font-size: 1rem;
          margin-bottom: 25px;
        }

        .config-bar {
          background: rgba(30, 41, 59, 0.65);
          backdrop-filter: blur(12px);
          padding: 14px;
          border-radius: 12px;
          width: 450px;
          margin: 0 auto 20px auto;
          display: flex;
          justify-content: space-around;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }

        .config-bar input {
          background: #0f172a;
          border: 1px solid #475569;
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          outline: none;
        }

        .global-btns {
          margin: 15px 0 30px 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          padding: 20px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(56, 189, 248, 0.2);
          border-color: rgba(56, 189, 248, 0.4);
        }

        .card h3 {
          margin-top: 0;
          margin-bottom: 5px;
          color: #f8fafc;
          font-size: 1.1rem;
        }

        .card p {
          margin: 6px 0 8px 0;
          font-size: 0.8rem;
          color: #94a3b8;
          word-break: break-all;
        }

        .login-box {
          background: rgba(15, 23, 42, 0.85);
          padding: 10px;
          margin: 10px 0;
          border-radius: 8px;
          border: 1px solid #38bdf8;
          font-size: 0.75rem;
        }

        .login-box a {
          color: #38bdf8;
          font-weight: bold;
          text-decoration: underline;
        }

        .login-code {
          color: #f43f5e;
          font-size: 0.95rem;
          font-weight: bold;
          background: #1e293b;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 4px;
        }

        button {
          padding: 10px 14px;
          cursor: pointer;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          transition: filter 0.2s, transform 0.1s;
        }

        button:active {
          transform: scale(0.96);
        }

        .btn-connect { background: #22c55e; color: white; flex: 1; box-shadow: 0 4px 12px rgba(34,197,94,0.3); }
        .btn-connect:hover { background: #16a34a; }

        .btn-disconnect { background: #ef4444; color: white; flex: 1; box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
        .btn-disconnect:hover { background: #dc2626; }

        .btn-row { display: flex; gap: 10px; margin-top: auto; }

        .btn-global-connect {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          padding: 12px 24px;
          font-size: 0.95rem;
          margin-right: 12px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          box-shadow: 0 6px 20px rgba(34,197,94,0.4);
        }

        .btn-global-disconnect {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: 12px 24px;
          font-size: 0.95rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          box-shadow: 0 6px 20px rgba(239,68,68,0.4);
        }

        .status-online { color: #4ade80; font-weight: bold; text-shadow: 0 0 10px rgba(74,222,128,0.4); }
        .status-offline { color: #f87171; font-weight: bold; }
        .status-awaiting { color: #fbbf24; font-weight: bold; }
        .status-connecting { color: #38bdf8; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="mesh-bg">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>

      <h1>⚡ MintSMP Multi-Bot Dashboard</h1>
      <p class="subtitle">Managing 9 Accounts (hyper.eagle50 - hyper.eagle58)</p>

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
        setInterval(fetchStatus, 3000);
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
        botLoginData[id] = null;
      }
    };

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

// Background Sequential Loop: Checks bots 1 to 9 in order with a 6-second delay between each
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
    return message.reply('❌ Invalid format. Use: `!cmd <1-9> <command>` or `!cmd all <command>`');
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
    message.reply(`✅ Executed \`${contentText}\` on Bot ${botId}.` );
  } else {
    message.reply(`❌ Bot ${botId} is either offline or hasn't fully spawned into the world yet.`);
  }
});

discordClient.login(process.env.DISCORD_TOKEN);
