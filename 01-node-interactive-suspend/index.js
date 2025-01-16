import { spawn } from 'node:child_process';
import { emitKeypressEvents } from 'node:readline';

let keypressEventsEnabled = false;
if (process.argv.includes('advanced')) {
    enableAdvancedInput();
    disableAdvancedInput();
}

console.log('Some output prior to running the interactive command');
await interactive(process.platform == 'win32' ? 'pwsh' : 'bash');
console.log('Some output after running the interactive command');


function enableAdvancedInput() {
    process.stdin.resume();
    process.stdin.setRawMode(true);
    !keypressEventsEnabled ? (emitKeypressEvents(process.stdin), keypressEventsEnabled = true) : null;
    process.stdin.on('keypress', onKeypress);
}

function disableAdvancedInput() {
    process.stdin.off('keypress', onKeypress);
    // can't undo the "emitKeypressEvents"...
    process.stdin.setRawMode(false);
    process.stdin.pause();
}

/**
 * 
 * @param {string} command 
 * @param {string[]} args 
 * @param {import('node:child_process').SpawnOptions} options 
 * @returns {Promise<void>} the return value is void because it's impossible to capture any output in this mode
 */
function interactive(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            ...options,
            stdio: 'inherit',
        });
        
        proc.on('error', (err) => {
            reject(err);
        });
        proc.on('close', (code) => {
            // nonzero exit code failed
            if (code) {
                reject(new Error(`Process failed with exit code ${code}`, { cause: { exitCode: code }}));
            }
            else {
                resolve();
            }
        });
    });
}

/**
 * @param {string} code 
 * @param {import('node:readline').Key} key 
 */
function onKeypress(code, key) {
    // in "advanced" mode, typical escape key sequences are disabled; 
    if (key.name == 'c' && key.ctrl && !key.shift && !key.meta) {
        process.exit(0);
    }
}
