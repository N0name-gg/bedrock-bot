const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const bedrock = require('bedrock-protocol');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Store active bot instances
const activeBots = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName('bot_join')
    .setDescription('Spawn a specified number of AFK bots (1-9)')
    .addIntegerOption(opt => opt.setName('count').setDescription('Number of bots to join (1-9)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('bot_leave')
    .setDescription('Disconnect all active bots'),
  new SlashCommandBuilder()
    .setName('bot_cmd')
    .setDescription('Send an in-game command through all active bots')
    .addStringOption(opt => opt.setName('command').setDescription('The command to run (e.g. /home)').setRequired(true))
].map(c => c.toJSON());

client.once('ready', async () => {
  console.log(`Discord Bot logged in as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully registered slash commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'bot_join') {
    const count = Math.min(Math.max(interaction.options.getInteger('count'), 1), 9);
    
    if (activeBots.size > 0) {
      return interaction.reply({ content: 'Bots are already active! Use `/bot_leave` first.', ephemeral: true });
    }

    await interaction.reply(`Initializing and connecting ${count} Bedrock AFK bot(s)...`);

    for (let i = 1; i <= count; i++) {
      const botName = `AFK_Bot_${i}`;
      try {
        const bClient = bedrock.createClient({
          host: process.env.MC_HOST,
          port: parseInt(process.env.MC_PORT || '19132'),
          username: botName,
          offline: true // Set to false if you are using Microsoft/Xbox accounts
        });

        bClient.on('spawn', () => {
          console.log(`${botName} successfully spawned into the server.`);
        });

        bClient.on('kicked', (reason) => {
          console.log(`${botName} was kicked:`, reason);
          activeBots.delete(botName);
        });

        bClient.on('close', () => {
          activeBots.delete(botName);
        });

        activeBots.set(botName, bClient);
      } catch (err) {
        console.error(`Failed to connect ${botName}:`, err.message);
      }
    }

    await interaction.followUp(`Successfully deployed ${activeBots.size} bot(s) to the server!`);

  } else if (commandName === 'bot_leave') {
    if (activeBots.size === 0) {
      return interaction.reply({ content: 'No bots are currently active.', ephemeral: true });
    }

    let count = activeBots.size;
    for (const [name, bClient] of activeBots.entries()) {
      bClient.close();
    }
    activeBots.clear();

    await interaction.reply(`Disconnected all ${count} active bots.`);

  } else if (commandName === 'bot_cmd') {
    if (activeBots.size === 0) {
      return interaction.reply({ content: 'No active bots to execute commands.', ephemeral: true });
    }

    const gameCommand = interaction.options.getString('command');
    
    for (const [name, bClient] of activeBots.entries()) {
      // Send chat/command packet to the server for each bot
      bClient.queue('text', {
        type: 'chat',
        needs_translation: false,
        source_name: name,
        xuid: '',
        platform_chat_id: '',
        filtered_message: '',
        message: gameCommand
      });
    }

    await interaction.reply(`Command \`${gameCommand}\` executed by all ${activeBots.size} bots.`);
  }
});

client.login(process.env.DISCORD_TOKEN);