require('dotenv').config();
require('./bootstrap');

const fs = require('fs');
const path = require('path');

const { canUseCommand } = require('./utils/permissions');

const {
    Client,
    GatewayIntentBits,
    Events
} = require('discord.js');

// -------------------- CONFIG --------------------

const CONFIG = {
    testMode:
        process.env.USE_TEST === 'true',

    guildId:
        process.env.USE_TEST === 'true'
            ? process.env.GUILD_ID_TEST
            : process.env.GUILD_ID,

    seasonChannelId:
        process.env.USE_TEST === 'true'
            ? process.env.SEASON_CHANNEL_ID_TEST
            : process.env.SEASON_CHANNEL_ID,

    leaderboardChannelId:
        process.env.USE_TEST === 'true'
            ? process.env.LEADERBOARD_CHANNEL_ID_TEST
            : process.env.LEADERBOARD_CHANNEL_ID,

    playtimeChannelId:
        process.env.USE_TEST === 'true'
            ? process.env.PLAYTIME_CHANNEL_ID_TEST
            : process.env.PLAYTIME_CHANNEL_ID,
};

// -------------------- CLIENT --------------------

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// -------------------- COMMAND LOADER --------------------

client.commands = new Map();

const commandsPath = path.join(
    __dirname,
    'commands'
);

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

const slashCommands = [];

for (const file of commandFiles) {

    const command = require(
        path.join(commandsPath, file)
    );

    if (
        !command.data ||
        !command.execute
    ) {
        console.warn(
            `[COMMAND] ${file} missing data or execute`
        );
        continue;
    }

    client.commands.set(
        command.data.name,
        command
    );

    slashCommands.push(
        command.data.toJSON()
    );
}

// -------------------- STARTUP --------------------

client.once(
    Events.ClientReady,
    async bot => {

        console.log(
            `Running in ${
                CONFIG.testMode
                    ? 'TEST'
                    : 'PRODUCTION'
            } mode`
        );

        console.log(
            `Logged in as ${bot.user.tag}`
        );

        try {

            // Register slash commands
            const guild =
                await client.guilds.fetch(
                    CONFIG.guildId
                );

            await guild.commands.set(
                slashCommands
            );

            console.log(
                `[SLASH] Registered ${slashCommands.length} commands`
            );

            if (CONFIG.seasonChannelId && CONFIG.seasonChannelId !== "0") {
                await require('./branches/seasonController')(client, CONFIG);
            } else {
                console.log('[SEASON] disabled');
            }

            if (CONFIG.leaderboardChannelId && CONFIG.leaderboardChannelId !== "0") {
                await require('./branches/leaderboardController')(client, CONFIG);
            } else {
                console.log('[LEADERBOARD] disabled');
            }

            if (CONFIG.playtimeChannelId && CONFIG.playtimeChannelId !== "0") {
                await require('./branches/playtimeController')(client, CONFIG);
            } else {
                console.log('[PLAYTIME] disabled');
            }

            console.log(
                'All systems loaded.'
            );

        } catch (error) {

            console.error(
                'System startup error:',
                error
            );
        }
    }
);

// -------------------- SLASH COMMANDS --------------------

client.on(
    Events.InteractionCreate,
    async interaction => {

        if (!interaction.isChatInputCommand()) return;

        const command =
            client.commands.get(interaction.commandName);

        if (!command) return;

        // -------------------- PERMISSION CHECK --------------------
        if (!(await canUseCommand(interaction, interaction.commandName))) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
                ephemeral: true
            });
        }

        try {

            await command.execute(interaction);

        } catch (err) {

            console.error('[COMMAND ERROR]', err);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'Command failed.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'Command failed.',
                    ephemeral: true
                });
            }
        }
    }
);

// -------------------- LOGIN --------------------

client.login(
    process.env.DISCORD_TOKEN
);