const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Posts maintenance notice')
        .addIntegerOption(option =>
            option
                .setName('time')
                .setDescription('Estimated fix time in minutes')
                .setRequired(true)
        ),

    async execute(interaction) {

        // We do NOT need deferReply here because we respond immediately
        const time = interaction.options.getInteger('time');

        const unit = time === 1 ? 'minute' : 'minutes';

        const container = new ContainerBuilder()
            .setAccentColor(12058624)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '# :x: BOT IS DOWN FOR MAINTENANCE :x:'
                ),
                new TextDisplayBuilder().setContent(
                    `Estimated fix time: ${time} ${unit}`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};