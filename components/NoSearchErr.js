const {
    ContainerBuilder,
    TextDisplayBuilder,
} = require('discord.js');

function buildNoSearchErr() {
    return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "❌ Search button was not found."
            )
        );
}

module.exports = {
    buildNoSearchErr
};