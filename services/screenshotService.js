const fs = require('fs');
const path = require('path');
const { ZipArchive } =
    require('archiver');

function getLatestLeaderboardScreenshot(
    folder
) {

    const files =
        fs.readdirSync(folder)
        .filter(
            f =>
                f.startsWith(
                    'ImageLB_'
                )
        );

    if (!files.length)
        return null;

    files.sort(
        (a, b) =>
            fs.statSync(
                path.join(
                    folder,
                    b
                )
            ).mtimeMs -
            fs.statSync(
                path.join(
                    folder,
                    a
                )
            ).mtimeMs
    );

    return path.join(
        folder,
        files[0]
    );
}

async function zipFile(
    inputFile,
    outputZip
) {

    return new Promise(
        (resolve, reject) => {

            const output =
                fs.createWriteStream(
                    outputZip
                );

            const archive =
                new ZipArchive({
                    zlib: {
                        level: 9
                    }
                });

            archive.pipe(output);

            archive.file(
                inputFile,
                {
                    name:
                        path.basename(
                            inputFile
                        )
                }
            );

            output.on(
                'close',
                resolve
            );

            archive.on(
                'error',
                reject
            );

            archive.finalize();
        }
    );
}

module.exports = {
    getLatestLeaderboardScreenshot,
    zipFile
};