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

// -------------------- JUMP MACRO --------------------

let jumpProcess = null;

function startJumpMacro() {
    if (jumpProcess) return;

    jumpProcess = spawn('python', ['jump.py'], {
        cwd: path.join(__dirname, '..')
    });

    jumpProcess.stdout.on('data', data => {
        console.log('[JUMP]', data.toString().trim());
    });

    jumpProcess.stderr.on('data', data => {
        console.error('[JUMP ERROR]', data.toString().trim());
    });

    jumpProcess.on('close', code => {
        console.log(`jump.py exited with code ${code}`);
        jumpProcess = null;
    });

    jumpProcess.on('error', err => {
        console.error('Failed to start jump.py:', err);
    });

    console.log('Started jump.py');
}

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

        return {
            newStats: json.NewStats?.crews || [],
            oldStats: json.OldStats?.crews || []
        };

    } catch {
        return {
            newStats: [],
            oldStats: []
        };
    }
}

// -------------------- RATING DIFF --------------------

function parseRating(value) {
    if (!value) return 0;
    return parseInt(String(value).replace(/,/g, ''), 10) || 0;
}

function buildRatingDiffMap(oldStats, newStats) {
    const map = {};

    for (const crew of newStats) {
        const old = oldStats.find(c => c.name === crew.name);

        const oldRating = parseRating(old?.rating);
        const newRating = parseRating(crew.rating);

        map[crew.name] = newRating - oldRating;
    }

    return map;
}

// -------------------- BUILD + SEND --------------------

async function sendLeaderboard(channel) {
    const { newStats, oldStats } = loadLeaderboard();
    const ratingDiff = buildRatingDiffMap(oldStats, newStats);

    const file = new AttachmentBuilder(IMAGE_FILE)
        .setName('Crews.png');

    let text = '';

    newStats.forEach((c, i) => {
        const rank = `#${i + 1}`.padEnd(4);
        const name = c.name.padEnd(24);
        const rating = String(c.rating).padEnd(10);
        const members = String(c.members).padEnd(8);

        const diff = ratingDiff[c.name] || 0;
        const difference = diff > 0 ? `+${diff}` : `${diff}`;

        const line =
            `${rank}${name} | ${rating} | ${members} | ${difference}`;

        text += (c.name === HIGHLIGHT_CREW)
            ? `+ ${line}\n`
            : `  ${line}\n`;
    });

    const container = new ContainerBuilder()
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
    startJumpMacro();
    scheduleLeaderboard(client, config);

    console.log('Leaderboard system loaded.');
};


// help