# invideo CLI

invideo AI from the terminal, for you and your agents.

## Install

macOS and Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/invideoio/cli/main/install.sh | sh
```

Or with Homebrew:

```sh
brew install invideoio/tap/invideo
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/invideoio/cli/main/install.ps1 | iex
```

Update with `invideo update`; it tells you when you need to.

## Quick start

```sh
invideo auth login
invideo project list
invideo project new --title "Product teaser"
```

Every answer gives the URLs to use next:

```sh
invideo asset upload <project-url> ./shots/*.mp4
invideo edit new <project-url> --name "Cut 1"
invideo edit show <edit-url>
```

`invideo help` lists everything; `invideo <command> <subcommand> --help` shows a command's flags.

## Agents

Sign in once yourself, then let Claude Code, Codex or Cursor run it:

- `--json` prints the answer as JSON on stdout. Notes go to stderr.
- In a project, an agent registers a name (`invideo agent register`) and passes `--as <name>`, or sets `INVIDEO_AS`.
- Exit codes say what happened:

| Code | Meaning |
| --- | --- |
| 0 | ok |
| 1 | failed |
| 2 | usage error |
| 3 | conflict: read again |
| 4 | not signed in |
| 5 | out of credits or quota |
| 6 | moderation |
| 7 | nothing ran: try again |
| 8 | needs the person |
| 9 | update required |

## Security

- Stores only your sign-in, in the system credential store.
- Talks only to invideo, over https.
- Reads only files you name, and writes only into the `--out` directory you give.
- Sends no telemetry, and runs nothing but your browser for sign-in.
