<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/invideo-lockup-white.svg">
  <img alt="invideo" src="assets/invideo-lockup-black.svg" width="320">
</picture>

Edit professional NLE timelines, color correct footage, mix audio, and generate
images, video and audio, from your terminal or your agent.

[![release](https://img.shields.io/github/v/release/invideoio/cli?label=release&color=F7F5F3&labelColor=161616)](https://github.com/invideoio/cli/releases/latest)

</div>

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

`invideo update` keeps it current; it tells you when you need to.

## Quick start

```sh
invideo auth login
invideo project new --title "Product teaser"
invideo asset upload <project-url> ./shots/*.mp4
invideo edit new <project-url> --name "Cut 1"
invideo edit show <edit-url>
```

Every answer gives the URLs to use next, and each one opens in invideo Editor.

## Features

- **A real timeline.** Tracks, clips, trims, keyframes, effects, transitions and
  so much more, changed in one `edit change` that applies all or nothing. Or
  write your own as shaders.
- **Color and sound.** Grade footage and mix audio on the same timeline.
- **Generate anything.** Images, video, voice and music from the models in
  `gen models`, with a credit cap per run (`--max-credits`).
- **See what you made.** `edit capture` renders frames of the edit as it is now;
  `asset grab`, `filmstrip` and `waveform` look inside any file.
- **Stock built in.** `library search` finds video, images, music and voices.
- **Branches and checkpoints.** Try a cut on a branch, checkpoint it, restore
  it, or make it final.
- **Work alongside people.** Every change shows live in invideo Editor; agents take
  a name, point at clips and message each other.
- **Export and share.** Render a file with `edit export --wait --out .`, or
  share an export page.

`invideo help` lists everything; `invideo <command> <subcommand> --help` shows a
command's flags.

## Agents

Sign in once yourself, then let Claude Code, Codex or Cursor drive it:

- `--json` prints the answer as JSON on stdout; notes go to stderr.
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

## Security

- Stores only your sign-in, in the system credential store.
- Talks only to invideo, over https.
- Reads only files you name, and writes only into the `--out` directory you give.
- Sends no telemetry, and runs nothing but your browser for sign-in.
