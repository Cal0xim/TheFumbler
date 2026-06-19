const {
    MessageFlags
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const {
    runPlaytimeTick
} = require('../services/playtimeTracker');

const {
    buildPlaytimeLeaderboard
} = require('../Components/playtime');

// -------------------- CONFIG --------------------

const DATA_PATH = path.join(
    __dirname,
    '..',
    'data',
    'playtime.json'
);

const MSG_IDS_FILE = path.join(
    __dirname,
    '..',
    'data',
    'msgIDs.json'
);

const TRACK_INTERVAL = 15;   // seconds
const POST_INTERVAL = 5;   // minutes

// -------------------- MESSAGE IDS --------------------

function loadMessageIds() {

    let data = {};

    try {

        if (fs.existsSync(MSG_IDS_FILE)) {

            data = JSON.parse(
                fs.readFileSync(
                    MSG_IDS_FILE,
                    'utf8'
                )
            );
        }

    } catch (err) {

        console.error(
            '[MSG IDS ERROR]',
            err.message
        );
    }

    // Ensure playtime section exists

    if (!data.playtime) {

        data.playtime = {
            messageId: ''
        };

        fs.writeFileSync(
            MSG_IDS_FILE,
            JSON.stringify(
                data,
                null,
                2
            )
        );
    }

    return data;
}

function savePlaytimeMessageId(messageId) {

    const ids = loadMessageIds();

    ids.playtime ??= {};

    ids.playtime.messageId = String(
        messageId
    );

    fs.writeFileSync(
        MSG_IDS_FILE,
        JSON.stringify(
            ids,
            null,
            2
        )
    );
}

// -------------------- LOAD DATA --------------------

function loadData() {

    try {

        if (!fs.existsSync(DATA_PATH)) {
            return {};
        }

        return JSON.parse(
            fs.readFileSync(
                DATA_PATH,
                'utf8'
            )
        );

    } catch (err) {

        console.error(
            '[LOAD ERROR]',
            err.message
        );

        return {};
    }
}

// -------------------- SEND --------------------

async function sendPlaytime(channel) {

    const data = loadData();

    if (!Object.keys(data).length) {
        console.log(
            '[PLAYTIME] No data found'
        );
        return;
    }

    const container =
        buildPlaytimeLeaderboard(data, POST_INTERVAL);

    const ids =
        loadMessageIds();

// --------------------
// DELETE OLD MESSAGE
// --------------------

if (ids.playtime?.messageId) {

    try {

        const oldMessage =
            await channel.messages.fetch(
                ids.playtime.messageId
            );

        await oldMessage.delete();

        const now = new Date();

        console.log(`
------------------------
5 MINUTES | PLAYERTIME MESSAGE ${now}
------------------------
`);

        console.log(
            `[PLAYTIME] MessageDeleted ${now}`
        );

    } catch (err) {

        console.log(
            '[PLAYTIME] Previous message not found'
        );
    }
}

// --------------------
// SEND NEW MESSAGE
// --------------------

const msg =
    await channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });

savePlaytimeMessageId(
    msg.id
);

console.log(
    `[PLAYTIME] Saved new message ${msg.id}`
);
}

// -------------------- UPDATE --------------------

async function updatePlaytime(
    client,
    config
) {

    try {

        console.log(
            'Updating playtime...'
        );

        await runPlaytimeTick(TRACK_INTERVAL);

        const channel =
            await client.channels.fetch(
                config.playtimeChannelId
            );

        await sendPlaytime(
            channel
        );

        console.log(
            'Playtime updated.'
        );

    } catch (err) {

        console.error(
            'Playtime update failed:',
            err
        );
    }
}

// -------------------- LOOP --------------------

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function trackingLoop() {

    while (true) {

        try {

            await runPlaytimeTick(
                TRACK_INTERVAL
            );

        } catch (err) {

            console.error(
                '[TRACKING LOOP ERROR]',
                err
            );
        }

        await sleep(
            TRACK_INTERVAL * 1000
        );
    }
}

async function postingLoop(channel) {

    while (true) {

        try {

            await sendPlaytime(
                channel
            );

            console.log(
                '[PLAYTIME] Leaderboard posted'
            );

        } catch (err) {

            console.error(
                '[POSTING LOOP ERROR]',
                err
            );
        }

        await sleep(
            POST_INTERVAL * 60 * 1000
        );
    }
}

async function schedulePlaytime(client, config) {

    await sleep(20 * 1000);

    const channel =
        await client.channels.fetch(
            config.playtimeChannelId
        );

    trackingLoop();
    postingLoop(channel);
}

// -------------------- EXPORT --------------------

module.exports = async (
    client,
    config
) => {

    schedulePlaytime(
        client,
        config
    );

    console.log(
        'Playtime system loaded.'
    );
};