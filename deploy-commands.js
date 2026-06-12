require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('season')
        .setDescription('Shows the current season')
        .toJSON(),
];

const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.APPLICATION_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log('Guild commands registered.');
    } catch (error) {
        console.error(error);
    }
})();