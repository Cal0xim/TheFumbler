require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join('./data/playtime.json');

const roblox = axios.create({
    headers: {
        Cookie: `.ROBLOSECURITY=${process.env.ROBLOX_COOKIE}`
    }
});

// -------------------- FILE HELPERS --------------------

function loadData() {
    try {
        if (!fs.existsSync(DATA_PATH)) return {};
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch (err) {
        console.error('[LOAD ERROR]', err.message);
        return {};
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('[SAVE ERROR]', err.message);
    }
}

// -------------------- CORE TICK --------------------

async function runPlaytimeTick(time) {
    try {

        const res = await roblox.get(
            'https://games.roblox.com/v1/games/16732694052/private-servers?limit=100'
        );

        const servers = res.data?.data || [];

        console.log(`\n[DEBUG] Servers found: ${servers.length}`);

        const data = loadData();

        // Ensure base structure
        for (const server of servers) {

            const name = server.name;

            if (!data[name] || typeof data[name] !== 'object') {
                data[name] = {
                    meta: {},
                    players: {}
                };
            }

            const serverData = data[name];

            if (!serverData.players) {
                serverData.players = {};
            }

            const players = server.players || [];
            const tokens = server.playerTokens || [];

            // -------------------- META --------------------

            const previousPlaying = serverData.meta?.playing ?? server.playing;
            const excluded = serverData.meta?.excluded ?? false;

            serverData.meta = {
                ping: server.ping,
                fps: server.fps,
                maxPlayers: server.maxPlayers,
                playing: server.playing,
                previousPlaying,
                excluded,
                lastUpdated: Date.now(),
                owner: server.owner || null
            };

            // -------------------- TRACKING --------------------

            const currentPlayers = new Set();

            if (players.length > 0) {

                for (const player of players) {

                    if (!player?.id) continue;

                    const id = String(player.id);
                    currentPlayers.add(id);

                    if (!serverData.players[id]) {
                        serverData.players[id] = {
                            name: player.name,
                            displayName: player.displayName,
                            playtime: 0
                        };

                        console.log(`[NEW] ${player.displayName} (${name})`);
                    }

                    serverData.players[id].playtime += time;
                }

            } else if (tokens.length > 0) {

                console.log('[WARN] Using token-only mode (no player IDs)');

                for (const token of tokens) {

                    const id = `token_${token}`;

                    if (!serverData.players[id]) {
                        serverData.players[id] = {
                            name: "Unknown",
                            displayName: "Unknown",
                            playtime: 0,
                            token
                        };
                    }

                    serverData.players[id].playtime += time;

                }
            }
        }

        saveData(data);


    } catch (err) {
        console.error('[TRACKER ERROR]', err.response?.data || err.message);
    }
}

// -------------------- EXPORT --------------------

module.exports = {
    runPlaytimeTick
};