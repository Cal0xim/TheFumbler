const {
    MessageFlags
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const {
    buildCrash
} = require('../components/crash');

let crashLoopStarted = false;

// -------------------- CONFIG --------------------

const DATA_PATH = path.join(
    __dirname,
    '..',
    'data',
    'playtime.json'
);

const CHECK_INTERVAL = 10; // seconds
const PLAYER_THRESHOLD = 5;

// -------------------- STATE --------------------

let clientRef = null;
let configRef = null;

const recentlyAnnounced = new Set();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
            '[CRASH LOAD ERROR]',
            err.message
        );

        return {};
    }
}

// -------------------- CORE CHECK --------------------

async function checkCrashes() {

    const data = loadData();

    for (const [serverName, server] of Object.entries(data)) {

        const meta = server.meta;
        if (!meta) continue;

        // Skip excluded servers
        const excluded = meta.excluded ?? false;
        if (excluded) continue;

        const previous = meta.previousPlaying ?? 0;
        const current = meta.playing ?? 0;

        const validCrash =
            previous >= PLAYER_THRESHOLD &&
            current === 0;

        if (!validCrash) continue;

        // Prevent duplicate announcements
        if (recentlyAnnounced.has(serverName)) {
            continue;
        }

        recentlyAnnounced.add(serverName);

        console.log(
            `[CRASH] ${serverName} ${previous} → 0`
        );

        try {

            const channel =
                await clientRef.channels.fetch(
                    configRef.announceChannelId
                );

            await channel.send({
                components: [
                    buildCrash(
                        serverName,
                        previous
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });

            console.log(
                `[CRASH] Announced ${serverName}`
            );

        } catch (err) {

            console.error(
                '[CRASH ANNOUNCER ERROR]',
                err.message
            );
        }
    }
}

// -------------------- LOOP --------------------

async function scheduleCrashChecks() {

    await sleep(20 * 1000);

    let lastCleanup = Date.now();

    while (crashLoopStarted) {

        const start = Date.now();

        try {
            await checkCrashes();
        } catch (err) {
            console.error('[CRASH LOOP ERROR]', err);
        }

        if (Date.now() - lastCleanup >= 60 * 60 * 1000) {
            recentlyAnnounced.clear();
            console.log('[CRASH] Cleared announcement cache');
            lastCleanup = Date.now();
        }

        const elapsed = Date.now() - start;

        // ensures stable spacing even if checkCrashes is slow
        const wait = Math.max(0, CHECK_INTERVAL * 1000 - elapsed);

        await sleep(wait);
    }
}

// -------------------- EXPORT --------------------

module.exports = async (client, config) => {

    clientRef = client;
    configRef = config;

    if (crashLoopStarted) {
        console.log('[CRASH] Loop already running — skipping duplicate start');
        return;
    }

    crashLoopStarted = true;

    scheduleCrashChecks();

    console.log(
        `Crash system loaded. (${CHECK_INTERVAL}s interval)`
    );
};