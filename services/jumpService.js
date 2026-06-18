const { spawn } = require('child_process');
const path = require('path');

let jumpProcess = null;

function startJumpMacro(onSearchFail) {

    if (jumpProcess) {
        console.log('[JUMP] Already running');
        return;
    }

    console.log('[JUMP] Starting jump.py');

    jumpProcess = spawn(
        'python',
        ['-u', 'jump.py'],
        {
            cwd: path.join(__dirname, '..')
        }
    );

    jumpProcess.stdout.on('data', data => {

        const lines = data
            .toString()
            .split(/\r?\n/)
            .filter(Boolean);

        for (const msg of lines) {

            console.log('[JUMP]', msg);

            if (
                msg.includes(
                    'SEARCH_NOT_FOUND'
                )
            ) {
                console.log(
                    '[JUMP] Search failed'
                );

                onSearchFail?.();
            }
        }
    });

    jumpProcess.stderr.on(
        'data',
        data => {

            console.error(
                '[JUMP ERROR]',
                data.toString()
            );
        }
    );

    jumpProcess.on(
        'exit',
        (code, signal) => {

            console.log(
                `[JUMP] Process exited. code=${code} signal=${signal}`
            );

            jumpProcess = null;
        }
    );

    jumpProcess.on(
        'close',
        (code) => {

            console.log(
                `[JUMP] Process closed. code=${code}`
            );
        }
    );

    jumpProcess.on(
        'error',
        (err) => {

            console.error(
                '[JUMP] Failed to start:',
                err
            );

            jumpProcess = null;
        }
    );
}

function stopJumpMacro() {

    if (!jumpProcess) {
        console.log(
            '[JUMP] Not running'
        );
        return;
    }

    console.log(
        '[JUMP] Stopping jump.py'
    );

    jumpProcess.kill();

    jumpProcess = null;
}

function isJumpRunning() {
    return jumpProcess !== null;
}

module.exports = {
    startJumpMacro,
    stopJumpMacro,
    isJumpRunning
};