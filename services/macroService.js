const { spawn } = require('child_process');
const path = require('path');

function runMacro() {

    return new Promise(
        (resolve, reject) => {

            const macro = spawn(
                'python',
                ['macro.py'],
                {
                    cwd: path.join(
                        __dirname,
                        '..'
                    )
                }
            );

            let leaderboardMissing =
                false;

            macro.stdout.on(
                'data',
                data => {

                    const msg =
                        data.toString();

                    console.log(msg);

                    if (
                        msg.includes(
                            'LEADERBOARD_NOT_FOUND'
                        )
                    ) {
                        leaderboardMissing =
                            true;
                    }
                }
            );

            macro.stderr.on(
                'data',
                data =>
                    console.error(
                        data.toString()
                    )
            );

            macro.on(
                'close',
                code => {

                    if (
                        leaderboardMissing
                    ) {
                        resolve(
                            'NO_LEADERBOARD'
                        );
                        return;
                    }

                    if (code === 0) {
                        resolve('OK');
                    } else {
                        reject(
                            new Error(
                                `Macro failed with code ${code}`
                            )
                        );
                    }
                }
            );
        }
    );
}

module.exports = {
    runMacro
};