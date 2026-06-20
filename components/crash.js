const {
    ContainerBuilder,
    TextDisplayBuilder
} = require('discord.js');

function buildCrash(serverName, previousCount) {

    const components = [];

    components.push(
        new TextDisplayBuilder().setContent(
            `# CRASH ANNOUNCER`
        )
    );

    components.push(
        new TextDisplayBuilder().setContent(
            `<@&1513565842594332722> Possibility of **${serverName}** crashing`
        )
    );

    components.push(
        new TextDisplayBuilder().setContent(
            `Playercount: **${previousCount} → 0**`
        )
    );

    // ❌ REMOVE EMPTY TEXT DISPLAY COMPLETELY

    return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(...components);
}

module.exports = {
    buildCrash
};