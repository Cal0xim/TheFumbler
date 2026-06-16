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

async function runPlaytimeTick() {
    try {
        console.log('\n--------------------');
        console.log('[TRACKER] Tick started');
        console.log('--------------------');

        const res = await roblox.get(
            'https://games.roblox.com/v1/games/16732694052/private-servers?limit=100'
        );

        const servers = res.data?.data || [];

        console.log(`\n[DEBUG] Servers found: ${servers.length}`);

        for (const s of servers) {
            console.log(
                `[SERVER] ${s.name} | playing: ${s.playing} | players: ${s.players?.length ?? 'undefined'} | tokens: ${s.playerTokens?.length ?? 0}`
            );
        }

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

            console.log(`\n[TRACK] Processing server: ${name}`);
            console.log(`[DEBUG] players=${players.length}, tokens=${tokens.length}`);

            // -------------------- META --------------------

            serverData.meta = {
                ping: server.ping,
                fps: server.fps,
                maxPlayers: server.maxPlayers,
                playing: server.playing,
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

                    serverData.players[id].playtime += 1;

                    console.log(
                        `[TRACK] ${player.displayName} -> ${serverData.players[id].playtime} min`
                    );
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

                    serverData.players[id].playtime += 1;

                    console.log(`[TRACK] token user -> ${serverData.players[id].playtime} min`);
                }
            }
        }

        saveData(data);

        console.log('\n[TRACKER] Tick complete');
        console.log('--------------------\n');

    } catch (err) {
        console.error('[TRACKER ERROR]', err.response?.data || err.message);
    }
}

// -------------------- EXPORT --------------------

module.exports = {
    runPlaytimeTick
};