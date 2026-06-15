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

const POST_INTERVAL = 10; // minutes

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

        await runPlaytimeTick();

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

function schedulePlaytime(
    client,
    config
) {

    setTimeout(() => {

        updatePlaytime(
            client,
            config
        );

        setInterval(() => {

            updatePlaytime(
                client,
                config
            );

        }, POST_INTERVAL * 60 * 1000);

    }, 20 * 1000);
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