<div align="center">
<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/invideo-symbol-white.svg">
    <img alt="" src="assets/invideo-symbol-black.svg" height="40" align="absmiddle">
  </picture>
  &nbsp;invideo CLI
</h1>

Edit professional NLE timelines, color correct footage, mix audio, and generate
images, video and audio, from your terminal or your agent.

[![release](https://img.shields.io/github/v/release/invideoio/cli?label=release&color=F7F5F3&labelColor=161616)](https://github.com/invideoio/cli/releases/latest)

</div>

```text
❯ invideo
Work with invideo from the command line.

USAGE
  invideo <command> <subcommand> [<url>] [flags]

ACCOUNT COMMANDS
  auth:       Sign in and out
  workspace:  Your workspaces
  project:    List, create, show and rename projects

PROJECT COMMANDS
  notebook:   Pages, threads and sequences
  context:    The project's entries and briefs
  edit:       Read, change, capture and export an edit
  branch:     An edit's checkpoints and branches
  asset:      The project's files: upload, add, look at
  gen:        Generate with a model
  export:     Export pages
  agent:      Agents in a project and their messages

ADDITIONAL COMMANDS
  library:    Search stock video, images, music and voices
  status:     Where generations, exports and uploads stand
  feedback:   Report a bug or ask for a feature
  update:     Update invideo to its latest release
```

## Install

macOS and Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/invideoio/cli/main/install.sh | sh
```

Homebrew:

```sh
brew install invideoio/tap/invideo
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/invideoio/cli/main/install.ps1 | iex
```

## Quick start

```sh
invideo auth login
invideo project list
```

Every answer gives the URLs to use next, and each one opens in invideo Editor.

## A real timeline, from a terminal

| Command | What it does |
| --- | --- |
| `edit show` | Tracks, clips and a state token |
| `edit change` | A batch of operations, all or none |
| `edit capture` | See the frames before you export |
| `edit export` | A video, or a Premiere, Final Cut or DaVinci project |

```sh
invideo edit change <edit-url> --timeline T1 --token <token> --operations @ops.json
```

```json
[
  { "op": "trim_clip", "clip": "C4", "edge": "tail",
    "from_f": 240, "to_f": 180, "mode": "close_gap", "linked": true },
  { "op": "add_transition", "type": "cross_zoom",
    "left_clip": "C4", "right_clip": "C5", "in_f": 6, "out_f": 6 },
  { "op": "add_text", "track": "V3", "text": "launch day",
    "start_f": 0, "end_f": 90 }
]
```

All three land together, or none do. `invideo edit catalog <edit-url>` lists
every operation, effect and transition.

## Agents work together

Any number of agents, on any number of machines, work in one project and
message each other; invideo's own agents answer too.

```text
❯ invideo agent inbox <project-url>
claude-code@laptop   I'm on the music bed. Can someone tighten the intro?
codex@desktop        On it. Intro down to 6s on branch intro-tight.
invideo              Added captions to intro-tight, matched the brand font.
claude-code@studio   Looks good, checkpointing it as v3.
codex@render-box     Exporting v3 at 1080p.
```

Each agent takes a name with `invideo agent register` and sends with
`invideo agent message`.

## Features

- **A real timeline.** Tracks, clips, trims, keyframes, effects, transitions and
  so much more.
- **Custom effects and transitions.** Write your own as shaders and use them
  like the built-in ones.
- **Color and sound.** Grade footage and mix audio on the same timeline.
- **Generate anything.** Images, video, voice and music from the models in
  `gen models`, with a credit cap per run (`--max-credits`).
- **See what you made.** `asset grab`, `filmstrip` and `waveform` look inside
  any file.
- **Stock built in.** `library search` finds video, images, music and voices.
- **Branches and checkpoints.** Try a cut on a branch, checkpoint it, restore
  it, or make it final.

## Flags

| Flag | What it does |
| --- | --- |
| `--json` | The answer as JSON on stdout |
| `--wait` | Wait for a generation, export or upload to finish |
| `--timeout <s>` | Stop waiting after s seconds (30 minutes by default) |
| `--out <dir>` | Save files the answer carries into dir |
| `--as <name>` | The name an agent registered in the project |
| `--help` | Help for any command |

```sh
invideo project list --json | jq -r '.projects[].url'
```

## Agents

Sign in once yourself, then let Claude Code, Codex or Cursor drive it:

- `--json` answers go to stdout; notes go to stderr.
- In a project, an agent registers a name (`invideo agent register`) and passes
  `--as <name>`, or sets `INVIDEO_AS`. People watching see who did what.
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

## Update and uninstall

`invideo update` updates an install from the script, and tells you what to run
for Homebrew (`brew upgrade invideo`).

To uninstall, run `invideo auth logout`, then delete `~/.local/bin/invideo`
(`brew uninstall invideo` for Homebrew; `%LOCALAPPDATA%\invideo` on Windows).

## Feedback

`invideo feedback bug` and `invideo feedback feature` go straight to the
invideo team.

## Security

- Stores only your sign-in, in the system credential store.
- Talks only to invideo, over https.
- Reads only files you name, and writes only into the `--out` directory you give.
- Sends no telemetry, and runs nothing but your browser for sign-in.
