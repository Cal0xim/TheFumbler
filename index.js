require('dotenv').config();
require("./bootstrap");

const {
    Client,
    GatewayIntentBits,
    Events,
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
};

// -------------------- CLIENT --------------------

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// -------------------- STARTUP --------------------

client.once(Events.ClientReady, async (bot) => {

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

        await require('./branches/season')(
            client,
            CONFIG
        );

        await require('./branches/leaderboard')(
            client,
            CONFIG
        );

        console.log(
            'All systems loaded.'
        );

    } catch (error) {

        console.error(
            'System startup error:',
            error
        );

    }

});

// -------------------- LOGIN --------------------

client.login(process.env.DISCORD_TOKEN);
// No way LOL