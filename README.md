# invideo CLI

invideo AI from the terminal.

`invideo` gives you your invideo account on the command line: workspaces,
projects, notebooks, edits, branches, generation, uploads and exports. It is
built for people and for AI agents alike. Every command takes a URL and
answers with the URLs to use next, `--json` gives machine-readable output, and
exit codes say what happened.

The client is small. It sends your command line to invideo and prints what
comes back; the commands themselves live on the server, so new ones arrive
without an update.

## Install

macOS and Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/invideoio/cli/main/install.sh | sh
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/invideoio/cli/main/install.ps1 | iex
```

The scripts download the latest release for your platform, check it against
its SHA-256 checksum, and put `invideo` in your user's bin directory
(`~/.local/bin` on macOS and Linux, `%LOCALAPPDATA%\invideo\bin` on Windows).
`INVIDEO_VERSION` picks a release and `INVIDEO_INSTALL_DIR` another directory.
Read them first if you like: [`install.sh`](install.sh),
[`install.ps1`](install.ps1).

To install by hand, every [release](https://github.com/invideoio/cli/releases)
has an archive per platform, each with a `.sha256` checksum:

| Platform | Archive |
| --- | --- |
| macOS, Apple silicon | `invideo-aarch64-apple-darwin.tar.gz` |
| macOS, Intel | `invideo-x86_64-apple-darwin.tar.gz` |
| Linux, x86_64 | `invideo-x86_64-unknown-linux-gnu.tar.gz` |
| Linux, ARM64 | `invideo-aarch64-unknown-linux-gnu.tar.gz` |
| Windows, x86_64 | `invideo-x86_64-pc-windows-msvc.zip` |

Check it works:

```sh
invideo version
```

### Updating

New commands arrive without an update: they live on the server. You only
need a new `invideo` when the server says so, with a line on stderr at most
once a day, or by refusing to run (exit 9) once this one is too old to read
its answers. Then:

```sh
invideo update
```

It downloads the newest release, checks it against its SHA-256 checksum, and
swaps itself for it.

## Quick start

Sign in. `invideo` opens a page in your browser and shows a code in your
terminal: type the code on the page, pick the workspaces it may use, and
approve.

```sh
invideo auth login
invideo auth status
```

Then find your work:

```sh
invideo workspace list
invideo project list
invideo project new --title "Product teaser"
```

Every answer gives the URLs to use next. Pass them back:

```sh
invideo project show <project-url>
invideo asset upload <project-url> ./shots/*.mp4
invideo edit new <project-url> --name "Cut 1"
invideo edit show <edit-url>
invideo edit capture <edit-url> --at 1,3.5 --out ./frames
```

Generate with a model:

```sh
invideo gen models <project-url> --query "video"
invideo gen model <project-url> --model veo-3
invideo gen run <page-url> --model veo-3 --max-credits 50 -i prompt="slow push on the bottle"
invideo status <sequence-url> --wait
```

See everything it can do:

```sh
invideo help                    # the commands, by namespace
invideo help edit               # one namespace
invideo edit change --help      # one command and its flags
invideo help exit-codes
```

## Usage

```
invideo <namespace> <verb> [<url> …] [--flag value …] [-i key=value …] [--input <file>|-]
        [--json] [--out <dir>] [--wait [--timeout <s>]]
```

- **Flags.** A command's arguments are flags: `--name "Cut 1"`, `--dry-run`.
  A list repeats its flag or takes commas: `--at 1 --at 3.5`, `--at 1,3.5`.
- **Files and stdin.** A flag's value `@path` reads that file, and `-` reads
  stdin: `--operations @ops.json`. Write `\@` for a value that really starts
  with `@`.
- **Model inputs.** `-i key=value` gives one input (`-i prompt=@prompt.txt`);
  `--input inputs.json` gives them all as JSON.
- **Waiting.** With `--wait`, a command whose answer says to check back
  (`invideo status` on something still running) runs again until what it
  follows is over, or `--timeout` seconds pass (30 minutes by default).
  It also tries again when invideo is busy or can't be reached and nothing ran.
- **Files back.** Commands that make files (frames, filmstrips) save them with
  `--out <dir>`. Without it, they tell you how many came.

### Scripting and pipes

- **Streams.** Stdout carries only the answer. Errors, progress and notices go
  to stderr. At a terminal, what to do next follows the answer as a `Next:`
  line; when stdout is a pipe, that line goes to stderr, so the data stays
  clean.
- **Rows.** Piped, a list prints as tab-separated rows under a header line,
  ready for `cut`, `awk` and `sort`.
- **JSON.** `--json` prints the whole answer as one JSON object:

  ```sh
  invideo branch list <edit-url> --json | jq -r '.branches[].url'
  ```

- **URLs from stdin.** A lone `-` where URLs go reads them from stdin, one a
  line (blank lines and `#` comments skipped):

  ```sh
  invideo branch list <edit-url> --json | jq -r '.branches[].url' | invideo status -
  ```

  A `-` right after a flag is that flag's value, so put yes/no flags after it,
  or write them as `--flag=true`.
- **Arguments from stdin.** `--input -` reads the arguments as a JSON object.
  Stdin carries one thing: URLs, `--input -`, or a flag's `-`.
- **Exit codes** (below) work with `&&`, `||` and `if`:

  ```sh
  invideo edit change <edit-url> --timeline T1 --token … --operations @ops.json || echo "not applied"
  ```

## Using it from agents

`invideo` is designed to be driven by coding agents such as Claude Code,
Codex and Cursor. Install it, sign in once yourself, then let the agent run
commands. Agents without a browser can sign in too: `invideo auth login`
prints the approval URL and code for a person to open.

- **Output.** Pass `--json` for the raw answer on stdout, ready to parse. The
  human-readable form is the default. Stdout carries only the answer; progress
  and notes go to stderr.
- **Exit codes.** Branch on them rather than on text:

  | Code | Meaning |
  | --- | --- |
  | 0 | ok |
  | 1 | failed |
  | 2 | usage error, or arguments that don't fit |
  | 3 | conflict: the edit changed since it was read; read it again |
  | 4 | not signed in: run `invideo auth login` |
  | 5 | a limit: credits or quota |
  | 6 | refused or held by moderation |
  | 7 | transient: nothing ran; run the same command again |
  | 8 | needs the person: something only they can do |
  | 9 | this invideo is too old: run `invideo update` |

- **Files.** Give `--out` a fresh, empty directory. `invideo` only creates new,
  plain-named files there and never replaces one that exists.
- **Identity.** In a project, an agent takes a name with `invideo agent
  register` and passes it as `--as <name>` on every call, or sets
  `INVIDEO_AS=<name>` once.
- **Prompting.** A line in your agent's instructions is usually enough:
  "Use the `invideo` CLI for invideo work. Run `invideo help` to see the
  commands, pass `--json`, and follow the URLs each answer gives."

## Sign-in and credentials

`invideo auth login` uses the OAuth device flow: nothing is typed into the
terminal, and you approve the sign-in on invideo's own site. You choose which
workspaces it may reach; it can reach no others. `invideo auth logout`
forgets the sign-in on this machine.

Tokens are kept in the system's credential store:

| OS | Where |
| --- | --- |
| macOS | Keychain, service `invideo-cli` |
| Windows | Credential Manager, `invideo-cli` |
| Linux | Secret Service (GNOME Keyring, KWallet) |

Where there is no credential store (a headless server, a container), tokens go
in a file only your user can read: `~/.config/invideo/credentials.json` on
Linux, `%AppData%\invideo\credentials.json` on Windows. Each server keeps its
own sign-in, so a dev server's never mixes with production's.

## Configuration

| Variable | Effect |
| --- | --- |
| `INVIDEO_HOST` | The server to use. Default `https://mcp.invideo.io`. Must be https; plain http only for `localhost`. |
| `INVIDEO_AS` | The agent name to act as in a project, as `--as` would. |
| `INVIDEO_NO_BROWSER` | Set to anything to print the sign-in URL without opening a browser. |

Standard proxy variables (`HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY`) are
honoured.

## Security

- **What it stores:** your access and refresh tokens, in the credential store
  above, and nothing else.
- **Where tokens go:** only to the server you use, over https (or to
  `localhost` for development). Sign-in and token refresh happen only on that
  server's own site, over https; `invideo` refuses endpoints anywhere else.
- **Your files:** a file is read only when you name it on the command line
  (`@path`, `--input`, or the files you give `asset upload`), and uploads go
  only over https. Nothing is written except into the `--out` directory you
  give, as new files.
- **What it never does:** it runs no shell, installs nothing, updates nothing
  by itself and sends no telemetry. The only other program it starts is your
  browser, for the sign-in page.
- **Terminal safety:** text from the server is stripped of control characters
  before it is printed, so nothing in a project's name or an agent's message
  can drive your terminal.

Found a security issue? Report it to invideo privately rather than in a
public issue.
