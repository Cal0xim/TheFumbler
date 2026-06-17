const fs = require('fs');
const path = require('path');

// -------------------- LOG DIRECTORY --------------------

const LOG_DIR = path.join(
    __dirname,
    'logs'
);

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// -------------------- LOG FILE --------------------

function getLogFile() {

    const date =
        new Date()
            .toISOString()
            .split('T')[0];

    return path.join(
        LOG_DIR,
        `${date}.txt`
    );
}

// -------------------- WRITE --------------------

function writeToFile(level, args) {

    try {

        const timestamp =
            new Date().toISOString();

        const message = args
            .map(arg => {

                if (
                    typeof arg === 'string'
                ) {
                    return arg;
                }

                try {
                    return JSON.stringify(
                        arg,
                        null,
                        2
                    );
                } catch {
                    return String(arg);
                }
            })
            .join(' ');

        fs.appendFileSync(
            getLogFile(),
            `[${timestamp}] [${level}] ${message}\n`
        );

    } catch (err) {

        process.stdout.write(
            `[LOGGER ERROR] ${err.message}\n`
        );
    }
}

// -------------------- OVERRIDE CONSOLE --------------------

const originalLog =
    console.log.bind(console);

const originalWarn =
    console.warn.bind(console);

const originalError =
    console.error.bind(console);

console.log = (...args) => {

    writeToFile(
        'LOG',
        args
    );

    originalLog(...args);
};

console.warn = (...args) => {

    writeToFile(
        'WARN',
        args
    );

    originalWarn(...args);
};

console.error = (...args) => {

    writeToFile(
        'ERROR',
        args
    );

    originalError(...args);
};

// -------------------- STARTUP LOG --------------------

console.log(
    'Logger initialized'
);