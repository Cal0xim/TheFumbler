const { spawn } = require('child_process');
const path = require('path');

let jumpProcess = null;

function startJumpMacro(onSearchFail) {

    if (jumpProcess) return;

    jumpProcess = spawn(
        'python',
        ['-u', 'jump.py'],
        {
            cwd: path.join(__dirname, '..')
        }
    );

    jumpProcess.stdout.on('data', data => {

        const msg = data.toString().trim();

        console.log('[JUMP]', msg);

        if (
            msg.includes(
                'SEARCH_NOT_FOUND'
            )
        ) {
           // onSearchFail?.();
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
}

module.exports = {
    startJumpMacro
};