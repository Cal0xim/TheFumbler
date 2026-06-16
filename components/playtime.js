const {
    ContainerBuilder,
    TextDisplayBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// -------------------- BOT INFO --------------------

const BOT_INFO_PATH = path.join(
    __dirname,
    '..',
    'botInfo.json'
);

function loadBotInfo() {

    try {

        if (!fs.existsSync(BOT_INFO_PATH)) {
            return {
                owner: 'unknown',
                version: '0.0'
            };
        }

        return JSON.parse(
            fs.readFileSync(
                BOT_INFO_PATH,
                'utf8'
            )
        );

    } catch (err) {

        console.error(
            '[BOT INFO ERROR]',
            err.message
        );

        return {
            owner: 'unknown',
            version: '0.0'
        };
    }
}

// -------------------- FORMAT --------------------

function formatPlaytime(minutes) {

    if (!minutes || minutes < 60) {
        return `${minutes || 0}m`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours < 24) {
        return `${hours}h ${mins}m`;
    }

    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    return `${days}d ${remHours}h`;
}

// -------------------- MAIN BUILDER --------------------

function buildPlaytimeLeaderboard(data, interval) {

    const botInfo = loadBotInfo();

    const components = [];

    // --------------------
    // MERGE ALL PLAYTIMES
    // --------------------

    const combinedPlayers = {};

    for (const server of Object.values(data)) {

        for (const [id, player] of Object.entries(server.players || {})) {

            if (!combinedPlayers[id]) {

                combinedPlayers[id] = {
                    name: player.name,
                    displayName: player.displayName,
                    playtime: 0
                };
            }

            combinedPlayers[id].playtime += player.playtime;
        }
    }

    // --------------------
    // COMBINED LEADERBOARD
    // --------------------

    const players = Object.values(combinedPlayers)
        .sort((a, b) => b.playtime - a.playtime);

    let text = '';

    players.forEach((player, i) => {

        const rank =
            `#${i + 1}`.padEnd(4);

        const fullName =
            `${player.displayName} (@${player.name})`
                .padEnd(40);

        const playtime =
            formatPlaytime(
                player.playtime
            ).padEnd(12);

        text +=
            `  ${rank}${fullName} | ${playtime}\n`;
    });

    const leaderboard =
`PLAYTIME LEADERBOARD (ALL SERVERS)
---------------------------------------------------------------
${text || 'No tracked players.\n'}`;

    components.push(
        new TextDisplayBuilder().setContent(
            `\`\`\`diff\n${leaderboard}\n\`\`\``
        )
    );

    // --------------------
    // SERVER INFO BLOCKS
    // --------------------

    for (const [serverName, server] of Object.entries(data)) {

        const meta = server.meta || {};

        const header =
        `${serverName.toUpperCase()} info
---------------------------------------------------------------
    Players ${meta.playing ?? 0}/${meta.maxPlayers ?? 0}
    FPS ${Math.round(meta.fps ?? 0)}
    Owner ${meta.owner?.displayName ?? 'Unknown'}`;

        components.push(
            new TextDisplayBuilder().setContent(
                `\`\`\`diff\n${header}\n\`\`\``
            )
        );
    }

    // --------------------
    // FOOTER
    // --------------------

    components.push(
        new TextDisplayBuilder().setContent(
            `-# Made by: ${botInfo.owner} | v${botInfo.version} | ${interval}min`
        )
    );

    return new ContainerBuilder()
        .setAccentColor(0x00AEFF)
        .addTextDisplayComponents(
            ...components
        );
}

module.exports = {
    buildPlaytimeLeaderboard
};