const {
    ContainerBuilder,
    TextDisplayBuilder,
} = require('discord.js');

function buildNoLeaderboardErr() {
    return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "❌ Leaderboards not found. <@372048752229351434>"
            )
        );
}

module.exports = {
    buildNoLeaderboardErr
};