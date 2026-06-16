const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    MessageFlags,
    FileBuilder
} = require('discord.js');

const {
    buildLeaderboard
} = require('../Components/leaderboard');

const {
    buildNoSearchErr
} = require('../Components/NoSearchErr');

const {
    buildNoLeaderboardErr
} = require('../Components/NoLeaderboardErr');

const { ZipArchive } = require('archiver');

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MSG_IDS_FILE = path.join(
    __dirname,
    '..',
    'data',
    'msgIDs.json'
);

// -------------------- PATH --------------------

const DATA_FILE = path.join(__dirname, '..', 'data', 'ratings.json');
const IMAGE_FILE = path.join(__dirname, '..', 'assets', 'Crews.png');

const HIGHLIGHT_CREW = "Frostwhale Fumblers";
const PostInterval = 30 //minutes

const SCREENSHOT_FOLDER = path.join(
    __dirname,
    '..',
    'assets',
    'crew_leaderboards'
);

//--------------------- HELPERS ----------------------

function loadMessageIds() {

    try {

        if (!fs.existsSync(MSG_IDS_FILE)) {
            return {};
        }

        return JSON.parse(
            fs.readFileSync(
                MSG_IDS_FILE,
                'utf8'
            )
        );

    } catch {

        return {};
    }
}

function saveMessageIds(ids) {

    fs.writeFileSync(
        MSG_IDS_FILE,
        JSON.stringify(
            ids,
            null,
            2
        )
    );
}

// -------------------- JUMP MACRO --------------------

let jumpProcess = null;
let searchMissing = false;

const {
    startJumpMacro
} = require(
    '../services/jumpService'
);


// -------------------- MACRO --------------------

const {
    runMacro
} = require(
    '../services/macroService'
);


// -------------------- LOAD DATA --------------------

const {
    loadLeaderboard,
    buildRatingDiffMap
} = require(
    '../services/leaderboardData'
);

// -------------------- SCREENSHOT -------------------

const {
    zipFile,
    getLatestLeaderboardScreenshot
} = require(
    '../services/screenshotService'
);



// -------------------- BUILD + SEND --------------------

async function sendLeaderboard(channel) {
    const { newStats, oldStats } = loadLeaderboard(DATA_FILE);
    const ratingDiff = buildRatingDiffMap(oldStats, newStats);

    // Get latest screenshot safely
    const latestScreenshot = getLatestLeaderboardScreenshot(SCREENSHOT_FOLDER);

    const files = [];

    // Main image (always included)
    const mainImage = new AttachmentBuilder(IMAGE_FILE)
        .setName('Crews.png');

    files.push(mainImage);

    let screenshotName = null;

    // Optional latest screenshot
    if (latestScreenshot && fs.existsSync(latestScreenshot)) {
        screenshotName = 'LatestLeaderboard.png';

        const screenshotAttachment = new AttachmentBuilder(latestScreenshot)
            .setName(screenshotName);

        files.push(screenshotAttachment);
    }

    // Build UI
    const container = buildLeaderboard(
        newStats,
        ratingDiff,
        PostInterval,
        screenshotName
    );

    const ids = loadMessageIds();

    ids.leaderboard ??= {
        old_messageId: '',
        new_messageId: ''
    };

    // --------------------
    // DELETE OLD MESSAGE
    // --------------------

    if (ids.leaderboard.old_messageId) {

        try {

            const oldMsg =
                await channel.messages.fetch(
                    ids.leaderboard.old_messageId
                );

            await oldMsg.delete();

            console.log(
                `[LEADERBOARD] Deleted old message ${ids.leaderboard.old_messageId}`
            );

        } catch {

            console.log(
                '[LEADERBOARD] Old message missing'
            );
        }
    }

    // --------------------
    // SEND NEW MESSAGE
    // --------------------

    const msg = await channel.send({
        components: [container],
        files,
        flags: MessageFlags.IsComponentsV2,
    });

    // Delete local screenshot after successful upload
    if (latestScreenshot && fs.existsSync(latestScreenshot)) {
        try {
            await fs.promises.unlink(latestScreenshot);

            console.log(
                `[SCREENSHOT] Deleted ${path.basename(latestScreenshot)}`
            );

        } catch (err) {

            console.error(
                '[SCREENSHOT DELETE ERROR]',
                err.message
            );
        }
    }

    // --------------------
    // ROTATE IDS
    // --------------------

    if (!ids.leaderboard.new_messageId) {

    // first leaderboard ever

    ids.leaderboard.new_messageId =
        msg.id;

    } else {

        ids.leaderboard.old_messageId =
            ids.leaderboard.new_messageId;

        ids.leaderboard.new_messageId =
            msg.id;
    }

    saveMessageIds(ids);

    console.log(
        `[LEADERBOARD] old=${ids.leaderboard.old_messageId} new=${ids.leaderboard.new_messageId}`
    );
}

// -------------------- UPDATE --------------------

async function updateLeaderboard(
    client,
    config
) {

    if (searchMissing) {

        console.log(
            'Skipping leaderboard update because Search button is missing.'
        );

        return;
    }

    try {

        console.log(
            'Updating leaderboard...'
        );

        const result =
            await runMacro();

        if (
            result ===
            'NO_LEADERBOARD'
        ) {

            const channel =
                await client.channels.fetch(
                    config.leaderboardChannelId
                );

            const container =
                buildNoLeaderboardErr();

            await channel.send({
                components: [container],
                flags:
                    MessageFlags.IsComponentsV2,
            });

            console.log(
                'Leaderboard not found.'
            );

            return;
        }

        const channel =
            await client.channels.fetch(
                config.leaderboardChannelId
            );

        await sendLeaderboard(
            channel
        );

        console.log(
            'Leaderboard updated.'
        );

    } catch (err) {

        console.error(
            'Leaderboard update failed:',
            err
        );
    }
}

// -------------------- LOOP --------------------

function scheduleLeaderboard(client, config) {

    setTimeout(() => {
        updateLeaderboard(client, config);

        setInterval(() => {
            updateLeaderboard(client, config);
        }, PostInterval * 60 * 1000);

    }, 20 * 1000); // 30 seconds
}

// -------------------- EXPORT --------------------

module.exports = async (client, config) => {
    startJumpMacro(client, config);
    scheduleLeaderboard(client, config);

    console.log('Leaderboard system loaded.');
};


// help