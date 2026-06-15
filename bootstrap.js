const fs = require("fs");
const path = require("path");

function ensureFile(filePath, defaultValue) {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, defaultValue);
    }
}

// -------------------- FILES --------------------

ensureFile(
    path.join(__dirname, "data", "ratings.json"),
    JSON.stringify({ crews: [] }, null, 2)
);

ensureFile(
    path.join(__dirname, "data", "msgIDs.json"),
    JSON.stringify(
        {
            season: {
                messageId: 0,
                season: ""
            },
            playtime: {
                messageId: 0
            },
            leaderboard: {
                old_messageId: 0,
                new_messageId: 0
            }
        },
        null,
        2
    )
);