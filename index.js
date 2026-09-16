const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const bedrock = require('bedrock-protocol');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const activeBots = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName('bot_join')
    .setDescription('Log your main account into mintsmp.net')
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
      return interaction.reply({ content: 'Your account is already connected!', ephemeral: true });
    }

    await interaction.reply('Initiating Microsoft login for your account... Check Railway logs for the login link!');

    try {
      const bClient = bedrock.createClient({
        host: 'mintsmp.net',
        port: 25125,
        // When offline is false, bedrock-protocol uses Microsoft device authentication
        offline: false 
      });

      bClient.on('spawn', () => {
        console.log('Your account successfully spawned into mintsmp.net');
      });

      bClient.on('kicked', (reason) => {
        console.log('Account was kicked:', reason);
        activeBots.delete('Main_Account');
      });

      bClient.on('close', () => {
        console.log('Account connection closed.');
        activeBots.delete('Main_Account');
      });

      activeBots.set('Main_Account', bClient);
    } catch (err) {
      console.error('Connection error:', err.message);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
