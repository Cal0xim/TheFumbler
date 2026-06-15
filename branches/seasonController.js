const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    AttachmentBuilder,
    MessageFlags,
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const SEASON_LENGTH = 34560;
const MSG_IDS_FILE = path.join(
    __dirname,
    '..',
    'data',
    'msgIDs.json'
);

const seasons = [
    { name: 'SPRING', color: 0xFFFF00 },
    { name: 'SUMMER', color: 0xFFA500 },
    { name: 'AUTUMN', color: 0xFF0000 },
    { name: 'WINTER', color: 0x0099FF },
];

// -------------------- TIME --------------------

function getCurrentSeasonIndex() {
    return Math.floor(Date.now() / 1000 / SEASON_LENGTH) % 4;
}

function getCurrentSeason() {
    return seasons[getCurrentSeasonIndex()];
}

function getNextSeason() {
    const i = getCurrentSeasonIndex();
    return seasons[(i + 1) % seasons.length];
}

function getSeasonStartTimestamp(targetIndex) {
    const now = Math.floor(Date.now() / 1000);
    const currentIndex = getCurrentSeasonIndex();

    let steps = targetIndex - currentIndex;

    if (steps < 0) {
        steps += seasons.length;
    }

    const nextChange =
        (Math.floor(now / SEASON_LENGTH) + 1) *
        SEASON_LENGTH;

    return nextChange + ((steps - 1) * SEASON_LENGTH);
}

// -------------------- STORAGE --------------------

function loadRotationData() {

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

    } catch {}

    // auto-create season section if missing
    if (!data.season) {

        data.season = {
            messageId: '',
            season: ''
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

    return data.season;
}

function saveRotationData(
    messageId,
    season
) {

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

    } catch {}

    // auto-create if missing
    data.season ??= {};

    data.season.messageId =
        String(messageId);

    data.season.season =
        season;

    fs.writeFileSync(
        MSG_IDS_FILE,
        JSON.stringify(
            data,
            null,
            2
        )
    );
}

// -------------------- MESSAGE BUILDER --------------------

async function sendSeasonRotation(channel) {

    const currentSeason = getCurrentSeason();
    const nextSeason = getNextSeason();

    const currentIndex = getCurrentSeasonIndex();

    const orderedSeasons = [];

    for (let i = 0; i < seasons.length; i++) {
        orderedSeasons.push(
            seasons[
                (currentIndex + i) % seasons.length
            ]
        );
    }

    const files = [];
    const containers = [];

    const now = Math.floor(Date.now() / 1000);

    const nextChange =
        (Math.floor(now / SEASON_LENGTH) + 1) *
        SEASON_LENGTH;

    for (const s of orderedSeasons) {

        const isCurrent =
            s.name === currentSeason.name;

        const imageName = isCurrent
            ? `${s.name}_Current.png`
            : `${s.name}.png`;

        const imagePath =
            `./assets/${imageName}`;

        files.push(
            new AttachmentBuilder(imagePath)
        );

        if (isCurrent) {

            const container =
                new ContainerBuilder()
                    .setAccentColor(s.color)
                    .addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(
                                    `attachment://${imageName}`
                                )
                        )
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `# ${s.name}`
                            )
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `**Current Season**\n\n` +
                                `Next season: **${nextSeason.name}**\n` +
                                `⏳ Changes: <t:${nextChange}:R>`
                            )
                    );

            containers.push(container);

        } else {

            const seasonIndex =
                seasons.findIndex(
                    x => x.name === s.name
                );

            const startsAt =
                getSeasonStartTimestamp(
                    seasonIndex
                );

            const container =
                new ContainerBuilder()
                    .setAccentColor(s.color)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent(
                                        `# ${s.name}\n` +
                                        `⏳ Starts: <t:${startsAt}:R>`
                                    )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder()
                                    .setURL(
                                        `attachment://${imageName}`
                                    )
                            )
                    );

            containers.push(container);
        }
    }

    return await channel.send({
        files,
        components: containers,
        flags: MessageFlags.IsComponentsV2,
    });
}

// -------------------- MAIN LOGIC --------------------

async function runRotation(client, config) {

    const channel =
        await client.channels.fetch(
            config.seasonChannelId
        );

    const currentSeason =
        getCurrentSeason().name;

    const data = loadRotationData();

    let existingMessage = null;

    if (data.messageId) {
        try {
            existingMessage =
                await channel.messages.fetch(
                    data.messageId
                );
        } catch {
            existingMessage = null;
        }
    }

    if (
        existingMessage &&
        data.season === currentSeason
    ) {
        console.log(
            'Season unchanged — using existing message.'
        );
        return;
    }

    if (
        existingMessage &&
        data.season !== currentSeason
    ) {
        await existingMessage
            .delete()
            .catch(() => {});
    }

    const msg =
        await sendSeasonRotation(channel);

    saveRotationData(
        msg.id,
        currentSeason
    );

    console.log(
        `Rotation set to ${currentSeason}`
    );
}

// -------------------- SCHEDULER --------------------

function scheduleNextRotation(client, config) {

    const now =
        Math.floor(Date.now() / 1000);

    const nextChange =
        (Math.floor(now / SEASON_LENGTH) + 1) *
        SEASON_LENGTH;

    const msUntil =
        (nextChange * 1000) -
        Date.now();

    console.log(
        `Next rotation in ${Math.round(
            msUntil / 1000
        )}s`
    );

    setTimeout(async () => {

        await runRotation(client, config);

        scheduleNextRotation(client, config);

    }, msUntil + 1000);
}

// -------------------- EXPORT --------------------

module.exports = async (client, config) => {

    await runRotation(client, config);

    scheduleNextRotation(client, config);

};