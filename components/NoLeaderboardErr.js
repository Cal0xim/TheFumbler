const {
    ContainerBuilder,
    TextDisplayBuilder,
} = require('discord.js');

function buildNoLeaderboardErr() {
    return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "❌ Leaderboards not found."
            )
        );
}

module.exports = {
    buildNoLeaderboardErr
};