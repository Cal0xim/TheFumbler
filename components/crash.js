const {
    ContainerBuilder,
    TextDisplayBuilder
} = require('discord.js');

// -------------------- BUILDER --------------------

function buildCrash(serverName, previousCount) {

    const components = [];

    // --------------------
    // HEADER
    // --------------------

    components.push(
        new TextDisplayBuilder().setContent(
`# CRASH ANNOUNCER`
        )
    );

    // --------------------
    // SERVER WARNING
    // --------------------

    components.push(
        new TextDisplayBuilder().setContent(
`Possibility of **${serverName}** crashing`
        )
    );

    // --------------------
    // PLAYER COUNT
    // --------------------

    components.push(
        new TextDisplayBuilder().setContent(
`Playercount: **${previousCount} → 0**`
        )
    );

    // --------------------
    // FOOTER
    // --------------------

    components.push(
        new TextDisplayBuilder().setContent(
`-# Crash detection system`
        )
    );

    return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(...components);
}

module.exports = {
    buildCrash
};