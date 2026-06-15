const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join('./data/playtime.json');

const roblox = axios.create({
    headers: {
        Cookie: `.ROBLOSECURITY=${process.env.ROBLOX_COOKIE}`
    }
});

// -------------------- INIT FILE --------------------

function ensureDataFile() {

    try {

        const dir = path.dirname(DATA_PATH);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(DATA_PATH)) {

            fs.writeFileSync(
                DATA_PATH,
                JSON.stringify({
                    "CREW ONLY": {
                        meta: {},
                        players: {}
                    }
                }, null, 2)
            );

            console.log(
                '[INIT] playtime.json created'
            );
        }

    } catch (err) {

        console.error(
            '[INIT ERROR]',
            err.message
        );
    }
}

ensureDataFile();

// -------------------- FILE HELPERS --------------------

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

function saveData(data) {

    try {

        fs.writeFileSync(
            DATA_PATH,
            JSON.stringify(
                data,
                null,
                2
            )
        );

    } catch (err) {

        console.error(
            '[SAVE ERROR]',
            err.message
        );
    }
}

// -------------------- TRACK TICK --------------------

async function runPlaytimeTick() {

    try {

        const res = await roblox.get(
            'https://games.roblox.com/v1/games/16732694052/private-servers?limit=100'
        );

        const servers = res.data.data || [];

        const data = loadData();

        const trackedServers =
            Object.keys(data);

        for (const server of servers) {

            // Skip untracked servers
            if (
                !trackedServers.includes(
                    server.name
                )
            ) {
                continue;
            }

            console.log(
                `[TRACKING] ${server.name}`
            );

            // Ensure structure
            if (!data[server.name]) {

                data[server.name] = {
                    meta: {},
                    players: {}
                };
            }

            const serverData =
                data[server.name];

            serverData.meta ??= {};
            serverData.players ??= {};

            // -------------------- META --------------------

            serverData.meta = {
                ping: server.ping,
                fps: server.fps,
                maxPlayers: server.maxPlayers,
                playing: server.playing,
                owner: server.owner
                    ? {
                        id: server.owner.id,
                        name: server.owner.name,
                        displayName: server.owner.displayName
                    }
                    : null,
                lastUpdated: Date.now()
            };

            // -------------------- PLAYERS --------------------

            for (const player of (server.players || [])) {

                const id =
                    String(player.id);

                if (
                    !serverData.players[id]
                ) {

                    serverData.players[id] = {
                        name: player.name,
                        displayName: player.displayName,
                        playtime: 0
                    };

                    console.log(
                        `[${server.name}] + ${player.displayName} added`
                    );
                }

                serverData.players[id].playtime += 1;
            }
        }

        saveData(data);

        console.log(
            '[TRACKER] Tick complete'
        );

    } catch (err) {

        console.error(
            '[TRACKER ERROR]',
            err.response?.data || err.message
        );
    }
}

module.exports = {
    runPlaytimeTick
};