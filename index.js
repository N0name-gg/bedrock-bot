const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const bedrock = require('bedrock-protocol');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const activeBots = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName('bot_join')
    .setDescription('Spawn an AFK bot to mintsmp.net')
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
    if (activeBots.size > 0) {
      return interaction.reply({ content: 'Bot is already active!', ephemeral: true });
    }

    await interaction.reply('Connecting AFK bot to mintsmp.net...');

    try {
      const bClient = bedrock.createClient({
        host: 'mintsmp.net',
        port: 25125,
        username: 'AFK_Bot_1',
        offline: true // Change to false only if the server strictly requires Xbox authentication
      });

      bClient.on('spawn', () => {
        console.log('AFK_Bot_1 successfully spawned into mintsmp.net');
      });

      bClient.on('kicked', (reason) => {
        console.log('Bot was kicked:', reason);
        activeBots.delete('AFK_Bot_1');
      });

      bClient.on('close', () => {
        console.log('Bot connection closed.');
        activeBots.delete('AFK_Bot_1');
      });

      activeBots.set('AFK_Bot_1', bClient);
      await interaction.followUp('AFK Bot has successfully connected to the server!');
    } catch (err) {
      console.error('Connection error:', err.message);
      await interaction.followUp(`Failed to connect: ${err.message}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
