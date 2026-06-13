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
    path.join(__dirname, "data", "rotation.json"),
    JSON.stringify({ season: 1 }, null, 2)
);