const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    FileBuilder
} = require('discord.js');

const HIGHLIGHT_CREW = "Frostwhale Fumblers";

const BOT_INFO_PATH = path.join(
    __dirname,
    '..',
    'botInfo.json'
);

function loadBotInfo() {
    try {
        if (!fs.existsSync(BOT_INFO_PATH)) {
            return { owner: "unknown", version: "0.0" };
        }
        return JSON.parse(fs.readFileSync(BOT_INFO_PATH, 'utf8'));
    } catch (err) {
        console.error('[BOT INFO ERROR]', err.message);
        return { owner: "unknown", version: "0.0" };
    }
}

function buildLeaderboard(newStats, ratingDiff, interval, file) {

    const botInfo = loadBotInfo();

    let text = '';

    newStats.forEach((c, i) => {

        const rank = `#${i + 1}`.padEnd(4);
        const name = c.name.padEnd(24);
        const rating = String(c.rating).padEnd(10);
        const members = String(c.members).padEnd(8);

        const diff = ratingDiff[c.name] || 0;
        const difference = diff > 0
            ? `+${diff}`
            : `${diff}`;

        const line =
            `${rank}${name} | ${rating} | ${members} | ${difference}`;

        text += (c.name === HIGHLIGHT_CREW)
            ? `+ ${line}\n`
            : `  ${line}\n`;
    });

    return new ContainerBuilder()
        .setAccentColor(0x00AEFF)

        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL('attachment://Crews.png')
            )
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
`
\`\`\`diff
RANK NAME                    | RATING     | MEMBERS
------------------------------------------------------
${text}
\`\`\`
`
            )
        )
        .addFileComponents(
        file
            ? new FileBuilder().setURL(`attachment://${file}`)
            : null
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Made by: ${botInfo.owner} | v${botInfo.version} | ${interval}min`
            )
        )
}

module.exports = {
    buildLeaderboard
};