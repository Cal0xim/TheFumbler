const fs = require('fs');

function loadLeaderboard(
    dataFile
) {

    const raw =
        fs.readFileSync(
            dataFile,
            'utf8'
        );

    const json =
        JSON.parse(raw);

    return {
        newStats:
            json.NewStats?.crews || [],
        oldStats:
            json.OldStats?.crews || []
    };
}

function parseRating(value) {

    return parseInt(
        String(value).replace(
            /,/g,
            ''
        ),
        10
    ) || 0;
}

function buildRatingDiffMap(
    oldStats,
    newStats
) {

    const map = {};

    for (const crew of newStats) {

        const old =
            oldStats.find(
                c =>
                    c.name === crew.name
            );

        map[crew.name] =
            parseRating(
                crew.rating
            ) -
            parseRating(
                old?.rating
            );
    }

    return map;
}

module.exports = {
    loadLeaderboard,
    buildRatingDiffMap
};