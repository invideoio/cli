<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/invideo-symbol-white.svg">
    <img alt="" src="assets/invideo-symbol-black.svg" height="40" align="absmiddle">
  </picture>
  &nbsp;invideo CLI
</h1>

invideo is a professional video editor you can drive from the terminal. Upload
your footage, describe the edit, and your agent trims the clips, picks the best
takes, grades the color, mixes the sound, adds captions and exports the finished
video. All of it happens on a real NLE timeline. Open it in the browser to watch
every change land and take over at any frame.

Ask for effects, transitions and motion graphics by describing them or sharing a
reference, or generate images, video, voice and music with 250+ AI models. Full
color, audio and 3D tools. Scriptable from any shell or coding agent, with
finished files downloaded straight to disk.

SOC 2 and GDPR compliant, ISO aligned.

[![release](https://img.shields.io/github/v/release/invideoio/cli?label=release&color=F7F5F3&labelColor=161616)](https://github.com/invideoio/cli/releases/latest)

## Install

One native binary, no runtime to install: npm and pip only deliver it. It runs
on macOS (Apple silicon and Intel), Linux (x64 and arm64) and Windows (x64).

Use the install script unless you have a reason not to. On macOS and Linux:

```sh
curl -fsSL https://agents.invideo.io | sh
```

On Windows, in PowerShell:

```powershell
irm https://raw.githubusercontent.com/invideoio/cli/main/install.ps1 | iex
```

The script downloads the release for your platform, checks its sha256 against
the one published with it, and installs one file: `~/.local/bin/invideo`, or
`%LOCALAPPDATA%\invideo\bin\invideo.exe` on Windows. It needs no sudo.
`INVIDEO_INSTALL_DIR` picks another folder and `INVIDEO_VERSION` another
release. If the folder isn't on your `PATH`, the script says so. Read
[install.sh](install.sh) or [install.ps1](install.ps1) first if you like.

Other ways deliver the same binary. Use one when the script can't run:

Homebrew:

```sh
brew install invideoio/tap/invideo
```

Cross-platform (incl. Windows) — npm:

```sh
npm install -g invideo
npx invideo                   # without installing
```

Python (uv, pipx or pip):

```sh
uv tool install invideo
pipx install invideo
pip install invideo
```

- Homebrew fails with "Permission denied" when its taps are read-only. Use the
  script.
- npm fails with `EACCES` or a read-only error when its global folder isn't
  writable. Add `--prefix ~/.local`, or use the script.

Check the install with `invideo version`.

Agents: run the install script yourself, after the person says yes once. Use
another way only if it fails.

## Commands

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

HELP TOPICS
  arguments, urls, output, waiting, exit-codes

FLAGS
  --help, --json, --tsv, --out <dir>, --wait, --timeout <s>

EXAMPLES
  $ invideo project new --title "Launch"
  $ invideo edit change <edit-url> --timeline T1 --token … --operations @ops.json
  $ invideo gen run <page-url> --model seedance_2_5.r2v --max-credits 50 -i prompt="slow push"
  $ invideo status <sequence-url> --wait

LEARN MORE
  `invideo <command> <subcommand> --help` for a command's flags; `invideo help <topic>` for a topic.
```

<details>
<summary>Every command and subcommand, from <code>--help</code></summary>

<!-- commands:begin -->
```text
auth  Sign in and out
  auth login                   Sign in, in the browser
  auth logout                  Forget this machine's sign-in
  auth status                  Who you are signed in as

workspace  Your workspaces
  workspace list               Your workspaces

project  List, create, show and rename projects
  project list <url>           Your projects, newest first
  project new <url>            Start a project
  project show <url>           A project: its notebook, context, briefs and newest files
  project rename <url>         Rename what a URL names

notebook  Pages, threads and sequences
  notebook show <url>          A page, a thread or a sequence
  notebook new-page <url>      A new notebook page
  notebook mark <url>          Approve or reject a sequence

context  The project's entries and briefs
  context show <url>           A context entry or a brief
  context write <url>          Replace a context entry or a brief
  context edit <url>           Change part of a context entry or a brief
  context new-brief <url>      Start a brief

edit  Read, change, capture and export an edit
  edit new <url>               A new edit in a project
  edit change <url>            Change an edit: a list of operations, all or none
  edit catalog <url>           The operations, effects and transitions an edit takes
  edit export <url>            Render an edit to a file
  edit leave <url>             Leave an edit (your cursor goes)
  edit show <url>              An edit's tracks and clips, and its state token
  edit inspect <url>           Objects of an edit by id, with every property you can change; a custom shader's source
  edit check <url>             Check an edit for problems
  edit capture <url>           Render frames of an edit as it looks now
  edit point <url>             Point at a time or clips, for people watching

branch  An edit's checkpoints and branches
  branch list <url>            Branches and checkpoints, each branch with its URL
  branch checkpoint <url>      Save a checkpoint on a branch; answers the edits it saved
  branch restore <url>         Restore a branch to a checkpoint; answers the edits it changed and the backup
  branch new <url>             Branch off now, or off a checkpoint with --checkpoint
  branch edit-from-here <url>  Open a checkpoint for editing on a branch of its own
  branch tag <url>             Tag a checkpoint
  branch rename <url>          Rename a branch
  branch archive <url>         Close a branch to edits; it keeps its history
  branch unarchive <url>       Open an archived branch again
  branch default <url>         Make a branch the default
  branch final <url>           Declare a branch final

asset  The project's files: upload, add, look at
  asset upload <url>           Upload local files into a project
  asset add <url>              Bring in media from a link or the stock library
  asset show <url>             A project's files, a folder or a file
  asset probe <url>            What a file is: streams, duration, size
  asset grab <url>             Frames of a file at given times
  asset filmstrip <url>        A filmstrip of a file
  asset waveform <url>         A file's audio levels

gen  Generate with a model
  gen models <url>             Models you can generate with
  gen model <url>              One model and its inputs
  gen run <url>                Generate with a model; its inputs go as -i key=value

export  Export pages
  export add <url>             Add sequences to an export page
  export edit <url>            Reorder, retitle or trim an export page
  export share <url>           Share an export page

agent  Agents in a project and their messages
  agent list <url>             Every agent in a project
  agent register <url>         Take a name in a project; pass it as --as <name> after
  agent message <url>          Message an agent; its answer comes to your inbox
  agent inbox <url>            Your unread messages

library  Search stock video, images, music and voices
  library search <url>         Search a stock library

status  Where generations, exports and uploads stand

feedback  Report a bug or ask for a feature
  feedback bug <url>           Tell invideo something broke
  feedback feature <url>       Ask invideo for something

update  Update invideo to its latest release
```
<!-- commands:end -->

Flags: `invideo <command> <subcommand> --help`.

</details>

## Quick start

A whole session, from sign-in to a file on disk:

```sh
invideo auth login
invideo project new --title "Launch teaser"                 # answers the project's URL
invideo asset upload <project-url> ./shots/*.mp4
invideo edit new <project-url> --name "Teaser v1"            # answers the edit's URL
invideo edit show <edit-url> --json                          # tracks, clips, state_token
invideo edit change <edit-url> --timeline T1 --token <state_token> --operations @ops.json
invideo edit check <edit-url>
invideo edit capture <edit-url> --at 1,3.5 --out ./frames
invideo edit export <edit-url> --format video --quality 1080 # answers the export's URL
invideo status <export-url> --wait --out .
```

Every answer gives the URLs to use next, and each one opens in invideo Editor.
Signing in on a machine with no browser: `INVIDEO_NO_BROWSER=1 invideo auth login`
prints a link and a code to enter on another device.

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
every operation, effect and transition; `--ops trim_clip` gives one op's fields.

Every read answers a `state_token`, and every change takes it as `--token`. A
change built on a stale token is refused with exit 3: read again and rebuild it.
`--dry-run` checks the operations without applying them. `edit check` finds
problems before you export; `edit inspect --ids C4` gives every property of an
object you can change.

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
- **Generate anything.** Images, video, voice and music with 250+ models.
  `gen models --query "lip sync"` finds one, `gen model --model <id>` lists its
  inputs, `gen run <page-url> --model <id> -i prompt="…" --max-credits 50`
  runs it; `--dry-run` prices it first.
- **See what you made.** `asset grab`, `filmstrip` and `waveform` look inside
  any file.
- **Stock built in.** `library search` finds video, images, music and voices.
- **Branches and checkpoints.** `branch new` tries a cut on its own branch,
  `branch checkpoint` saves it, `branch restore` goes back, `branch final`
  declares it done.

## Flags

| Flag | What it does |
| --- | --- |
| `--json` | The answer as JSON on stdout |
| `--wait` | Wait for a generation, export or upload to finish |
| `--timeout <s>` | Stop waiting after s seconds (30 minutes by default) |
| `--out <dir>` | Download the files an answer links to (captures, frames, generated media, exports) into dir |
| `--as <name>` | The name an agent registered in the project |
| `--help` | Help for any command |

```sh
invideo project list --json | jq -r '.projects[].url'
```

## CLI or MCP?

The same invideo is also an MCP server, `https://mcp.invideo.io/mcp`, for chat
apps like Claude, ChatGPT and Cursor: connect it there and ask in words. The
CLI is for shells, scripts and coding agents that run commands and want files on
disk. Agents can read [agents.md](https://mcp.invideo.io/mcp/agents.md) for
either.

## Agents

Sign in once yourself, then let Claude Code, Codex or Cursor drive it. The
rules, in short; [AGENTS.md](AGENTS.md) has the whole contract, ready to paste
into your own agent instructions.

- Pass `--json` on every command. The answer is one object on stdout, with
  `next` (what to run now) and `notice`; errors are one object on stderr with
  `code` and `message`.
- `edit show` answers a `state_token`; pass it as `--token` on every change.
  Exit 3 means it went stale: read again.
- `--dry-run` before `edit change` and `gen run`; `--max-credits` on `gen run`.
- Anything that starts a job answers at once with a URL: `status <url> --wait`
  follows it, and `--out <dir>` saves what it made.
- In a project, register a name (`invideo agent register --name scout`) and pass
  `--as scout`, or set `INVIDEO_AS`. Unnamed commands act as
  `invideo-cli-<username>`. People watching see who did what.
- `invideo help <topic>` for arguments, urls, output, waiting and exit-codes.

| Code | Meaning | Do |
| --- | --- | --- |
| 0 | ok | |
| 1 | failed | read `message` |
| 2 | usage, or can't be done as asked | fix the command |
| 3 | conflict: the edit changed since your read | `edit show` again, rebuild the change |
| 4 | not signed in | `invideo auth login` |
| 5 | a limit: credits or quota | stop; tell the person |
| 6 | held by moderation | stop; tell the person |
| 7 | transient: nothing ran | run the same command again |
| 8 | needs the person's confirmation | stop; ask |
| 9 | update required | `invideo update`, then again |

## Update and uninstall

`invideo update` updates an install from the script, and tells you what to run
for the others: `brew upgrade invideo`, `npm install -g invideo@latest`,
`uv tool upgrade invideo`, `pipx upgrade invideo` or
`pip install --upgrade invideo`.

To uninstall, run `invideo auth logout`, then delete `~/.local/bin/invideo`
(`brew uninstall invideo` for Homebrew; `npm uninstall -g invideo`,
`uv tool uninstall invideo`, `pipx uninstall invideo` or `pip uninstall invideo`
for those).

## Feedback

`invideo feedback bug` and `invideo feedback feature` go straight to the
invideo team.

## Security

- Stores only your sign-in, in the system credential store.
- Talks only to invideo, over https.
- Reads only files you name, and writes only into the `--out` directory you give.
- Sends no telemetry, and runs nothing but your browser for sign-in.

## License

The installers, packaging scripts and docs in this repository are under the
[Apache License 2.0](LICENSE). The invideo CLI binaries, in its releases and in
the npm and PyPI packages, are proprietary; using them is governed by invideo's
[terms and conditions](https://invideo.io/terms-and-conditions).
