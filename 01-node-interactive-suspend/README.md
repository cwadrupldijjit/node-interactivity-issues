## Advanced Input, Interactive Child Process Suspends

### Using

| Software | Version |
|-|-|
| Node | `22.13.0` |

### Refs

| Commit Hash | Description |
|-|-|
| \*_Current_\* | Issue described occurred, using full scope of "advanced input" toggle as described |

### How to run

There are two "modes" to this test.

#### Run it raw

- Invoke the script:  `node index.js`
- Behavior:  Runs it correctly and then exits when the interactive child process session ends, noting if the process ended with a nonzero exit code
- Suggestions:  When the interactive child process* launches (`bash` on Linux/Mac, `pwsh` on Windows; could change it to something else if you prefer), do what you want in it (I typically just `exit` immediately)

\* Confused?  See the "'Interactive Child Process', what?" section below.

#### Run it, but so advanced

- Invoke the script:  `node index.js advanced`
- Behavior:  Toggles an advanced input mode on and then back off (see the later section of "'Advanced Input', what?"), then tries to run the same interactive child process as before, but when you attempt to type anything, it kicks you out of the node script entirely and says that the process was suspended; bringing it to the foreground appears to have effectively destroyed its function

### "Interactive Child Process", what?

This term describes a child process whose `stdio` is set to `'inherit'` in the `SpawnOptions` parameter of `node:child_process`'s `spawn` function.  This causes the child process that spawns to directly use the `process.stdout`, `process.stderr`, and `process.stdin` of the parent process.  This means nothing is lost in translation from stdout/-err/-in, which is required if the script you're trying to make prepares a command that will be invoked and requires full interactivity (such as running `vim` in an SSH session on an AWS EC2 instance where the private IP or id may not be known ahead of time).

The script I was writing that I referenced above was similar to that AWS EC2 instance scenario and actually ran the `aws` cli to connect to it (since the sdk didn't have the functionality I was hoping for), but since we use something that might nuke a misbehaving instance and replace it with a fresher image, the IP addresses or ids may change.  It has a small wizard if it detects a change to the destination environment, then moves on to actually connect to the desired instance.  That last part, the connect part, is what I refer to as the "interactive", where it opens a bash session on the target instance.

### "Advanced Input", what?

TL;DR
- Run the following to "enable" it:
  1. `process.stdin.resume()` (on Windows)
  2. `process.stdin.setRawMode(true)`
  3. `emitKeypressEvents(process.stdin)`
  4. `process.stdin.on('keypress', onKeypress)` (which reintroduces the <kbd>ctrl</kbd> + <kbd>c</kbd> process cancel key combination)
- Run the following to "disable" it:
  1. `process.stdin.off('keypress', onKeypress)`
  2. ... can't disable keypress events ...
  3. `process.stdin.setRawMode(false)`
  4. `process.stdin.pause()` (on Windows)

Lacking a better term for it, I call "advanced input" when the process starts to be able to recognize keypresses.  This is done via the `node:readline` api of `emitKeypressEvents`.  It requires `process.stdin` to be put into "raw mode", which then also disables Node processing the usual key combinations, including the <kbd>ctrl</kbd> + <kbd>c</kbd> one to kill the running process.  Consequently, I always implement an `onKeypress` function whose purpose is to listen for any keypress, match it against the criteria provided, and then run that listener (so I make a listener system of sorts I find better than a million `onKeypress` functions for each thing and in each place...).  Included in that is a listener for the <kbd>ctrl</kbd> + <kbd>c</kbd>, in which case it kills the process.  Lastly, on Windows, the `process.stdin` won't seem to receive any events unless you explicitly run `process.stdin.resume()`.

Then when the need for advanced input ends, I have to reverse the process to the furthest extent of my ability.  That's easy for everything but the `emitKeypressEvents` because, it turns out, there is no way to disable that behavior, and I assume that may be where my problems arise.

### Misc

I've encountered a similar problem in PowerShell, though I'm not sure if those issues are directly related.

### Links to research

- StackOverflow talking about any process that was suspended intentionally but misbehaving (the proposed solutions didn't work for me): https://stackoverflow.com/questions/24056102/why-do-i-get-suspended-tty-output-in-one-terminal-but-not-in-others
- NodeJS issue that shows a similar use case and issue to the StackOverflow question above but specifically in Node, though with a fix added several years ago: https://github.com/nodejs/node/issues/28612
- NodeJS `emitKeypressEvents` documentation (part of the `readline` docs): https://nodejs.org/api/readline.html#readlineemitkeypresseventsstream-interface
- NodeJS readline `SIGTSTP` event might be related? (at least, to more gracefully handle being suspended?): https://nodejs.org/api/readline.html#event-sigtstp
