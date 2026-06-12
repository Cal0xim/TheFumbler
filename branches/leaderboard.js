const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    MessageFlags,
} = require('discord.js');

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// -------------------- PATH --------------------

const DATA_FILE = path.join(__dirname, '..', 'data', 'ratings.json');
const IMAGE_FILE = path.join(__dirname, '..', 'assets', 'Crews.png');

const HIGHLIGHT_CREW = "Frostwhale Fumblers";

// -------------------- MACRO --------------------

function runMacro() {
    return new Promise((resolve, reject) => {

        const macro = spawn('python', ['macro.py'], {
            cwd: path.join(__dirname, '..')
        });

        macro.stdout.on('data', d => console.log(d.toString()));
        macro.stderr.on('data', d => console.error(d.toString()));

        macro.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Macro failed with code ${code}`));
        });

        macro.on('error', reject);
    });
}

// -------------------- LOAD DATA --------------------

function loadLeaderboard() {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const json = JSON.parse(raw);
        return json.NewStats?.crews || json.OldStats?.crews || [];
    } catch {
        return [];
    }
}

// -------------------- BUILD + SEND --------------------

async function sendLeaderboard(channel) {

    const crews = loadLeaderboard();

    const file = new AttachmentBuilder(IMAGE_FILE)
        .setName('Crews.png');

    let text = '';

    crews.forEach((c, i) => {

        const rank = `#${i + 1}`.padEnd(4);
        const name = c.name.padEnd(24);
        const rating = c.rating.padEnd(10);
        const members = c.members;

        const line = `${rank}${name} | ${rating} | ${members}`;

        text += (c.name === HIGHLIGHT_CREW)
            ? `+ ${line}\n`
            : `  ${line}\n`;
    });

    const container = new ContainerBuilder()
        .setAccentColor(0x00AEFF)

        // 🖼️ MEDIA INSIDE SAME CONTAINER
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL('attachment://Crews.png')
            )
        )

        // TABLE
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
`
\`\`\`diff
RANK NAME                    | RATING     | MEMBERS
------------------------------------------------------
${text}
\`\`\`
`
                )
        );

    await channel.send({
        components: [container],
        files: [file],
        flags: MessageFlags.IsComponentsV2,
    });
}

// -------------------- UPDATE --------------------

async function updateLeaderboard(client, config) {

    try {
        console.log('Updating leaderboard...');

        await runMacro();

        const channel = await client.channels.fetch(
            config.leaderboardChannelId
        );

        await sendLeaderboard(channel);

        console.log('Leaderboard updated.');
    } catch (err) {
        console.error('Leaderboard update failed:', err);
    }
}

// -------------------- LOOP --------------------

function scheduleLeaderboard(client, config) {

    updateLeaderboard(client, config);

    setInterval(() => {
        updateLeaderboard(client, config);
    }, 60 * 60 * 1000);
}

// -------------------- EXPORT --------------------

module.exports = async (client, config) => {

    scheduleLeaderboard(client, config);

    console.log('Leaderboard system loaded.');
};