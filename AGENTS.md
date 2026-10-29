# invideo CLI for agents

The contract an agent needs to drive `invideo`. Paste this file, or the part you
need, into your own agent instructions. `invideo help <topic>` gives the same
facts from the binary itself.

## Setup

- Install: `curl -fsSL https://agents.invideo.io | sh` on macOS and Linux. It
  needs no sudo and writes only `~/.local/bin/invideo`. Windows and the other
  ways are in the [README](README.md#install). `invideo version` prints the
  version.
- Sign in once, as the person: `invideo auth login`. With no browser,
  `INVIDEO_NO_BROWSER=1 invideo auth login` prints a link and a code to enter on
  another device. `invideo auth status` says who is signed in.
- The sign-in lives in the system credential store. Nothing else is stored.

## The five rules

1. **`--json` on every command.** To a terminal, an answer is `key: value` text;
   piped, it is tab-separated rows with the rest on stderr. `--json` is the one
   shape that never changes: one object on stdout, errors as one object on
   stderr.
2. **Read, then change, with the token.** `edit show` answers a `state_token`.
   Every change (`edit change`, `branch checkpoint`, `branch restore`,
   `branch new`, `branch final`) takes it as `--token`. A stale token is refused
   with exit 3 and `code: revision_conflict`: read again, rebuild the change
   from what is there now.
3. **`--dry-run` first.** `edit change --dry-run` checks the operations without
   applying them. `gen run --dry-run` prices a generation and checks its inputs;
   nothing starts. `gen run --max-credits <n>` refuses to start when the
   estimate is higher.
4. **Jobs answer a URL; follow it.** Generations, exports and uploads answer at
   once. `invideo status <url> … --wait` checks back until they are over
   (`--timeout <s>`, 30 minutes by default). `--out <dir>` saves the files an
   answer links to.
5. **Take a name.** In a project, `invideo agent register --name scout` once,
   then `--as scout` on every command there, or `export INVIDEO_AS=scout`.
   Unnamed commands act as `invideo-cli-<username>`, which every unnamed command
   of that person shares.

## Answers

Every `--json` answer is one object. Besides its own fields it carries:

- `next`: what to run now, in plain words with the commands to use.
- `notice`: something to know, like acting unnamed.
- `as`: the name the command acted as.
- `url`: the URL of what it acted on.

Lists come with `next_offset` when there is more; pass it as `--offset`.

An error is one object on stderr:

```json
{"status":"refused","code":"revision_conflict","message":"Someone's change landed since your read. Read the edit again (`invideo edit show`) and build the change from what is there now.","url":"https://invideo.io/@ws/launch/tree/main/seq-1.1"}
```

## Exit codes

| Code | Meaning | Do |
| --- | --- | --- |
| 0 | ok | |
| 1 | failed (ours, or unknown) | read `message` |
| 2 | usage, or a request that can't be done as asked | fix the command |
| 3 | conflict: the edit changed since your read | `edit show` again, rebuild the change |
| 4 | not signed in | `invideo auth login` |
| 5 | a limit: credits or quota | stop; tell the person |
| 6 | held by moderation | stop; tell the person |
| 7 | transient: nothing ran | run the same command again; with `--wait` the CLI retries itself |
| 8 | needs the person's confirmation | stop; ask |
| 9 | update required | `invideo update`, then run it again |

A retry after 7 is the same request, so it never starts anything twice.
`--idempotency-key <text>` on `gen run` and `edit export` makes any repeat safe.

## Arguments

A command's arguments are flags: `--name value` or `--name=value`.

| Form | Meaning |
| --- | --- |
| `--dry-run` | a true-or-false flag takes no value (`--dry-run=false` turns it off) |
| `--at 1 --at 3.5`, `--at 1,3.5` | a list repeats its flag, takes commas, or JSON |
| `--permissions '{"a":1}'` | an object takes JSON |
| `--operations @ops.json` | `@path` reads a value from a file; `-` reads stdin |
| `--input payload.json` | the whole payload as a JSON object; flags add to it |
| `-i prompt="slow push"` | a model's own inputs, one each, so they never clash with the command's flags; `-i prompt=@prompt.txt` reads a file |

`invideo <command> <subcommand> --help` lists a command's flags.

## URLs

A URL is the handle: every command takes the URL of what it acts on and every
answer gives the URLs to use next. A project's URL names its notebook; under it:

| URL | What |
| --- | --- |
| `<project>` | the project and its notebook |
| `<project>/notebook/<page>` | a page; `#thread-<n>` a thread; `/notebook/seq-<n>.<m>` a sequence (an edit, a generation, an export) |
| `<project>/context`, `/context/<entry>` | the project's context entries and briefs |
| `<project>/assets`, `/assets/<file>` | the project's files |
| `<project>/agents`, `/remote-agents/<name>` | the agents in the project |
| `<project>/tree/<branch>/<seq>` | an edit on a branch |

Give the person the URLs you make: each opens what it names in invideo Editor.

## A session

```sh
invideo project new --title "Launch teaser" --json                 # .url
invideo agent register <project-url> --name scout --json
export INVIDEO_AS=scout

invideo asset upload <project-url> ./shots/*.mp4 --json            # answers upload URLs
invideo status <upload-url> --wait --json

invideo edit new <project-url> --name "Teaser v1" --json           # .url
invideo edit show <edit-url> --json                                # .state_token, .timeline_id, .objects
invideo edit catalog <edit-url> --ops trim_clip,add_transition --json
invideo edit change <edit-url> --timeline T1 --token <state_token> --operations @ops.json --dry-run --json
invideo edit change <edit-url> --timeline T1 --token <state_token> --operations @ops.json --json
invideo edit check <edit-url> --json                               # .ok, .findings
invideo edit capture <edit-url> --at 1,3.5 --out ./frames --json
invideo branch checkpoint <edit-url> --title "rough cut" --token <state_token> --json

invideo edit export <edit-url> --format video --quality 1080 --json   # .url
invideo status <export-url> --wait --out . --json
```

Reading a big edit: `edit show` reads a window (`--mode window --start-seconds
0 --end-seconds 30`) or lists one kind of object (`--mode collection
--collection clip`), paged with `--limit`, `--offset` and `--snapshot`.
`edit inspect --ids C4,C7` gives every property you can change on those objects.

Generating: `gen models <project-url> --query "lip sync" --json` finds a model,
`gen model <project-url> --model <id> --json` lists its inputs, then
`gen run <page-url> --model <id> -i prompt="…" --max-credits 50 --json` and
`status <sequence-url> --wait --out . --json`.

## What mutates and what spends

Safe to run freely: every `show`, `list`, `catalog`, `inspect`, `check`,
`capture`, `media metadata`, `media video.frames`, the `media audio.*` reads
(all but `audio.transcript`), `search`, `status`, `models`, `model`, `inbox`,
and any `--dry-run`.

Changes the project: `edit change`, `edit new`, `branch *`, `asset upload`,
`asset add`, `context write`, `context edit`, `notebook new-page`, `notebook
mark`, `export *`, `agent register`, `agent message`, `project new`, `rename`,
`media document.pages`, and every `media` command that makes a new file.

Spends the person's credits: `gen run`, `edit export`, `asset add --stock`,
`media audio.transcript` (priced by the file's length; reading a transcript
already made is free), and the `media` commands that run a model
(`audio.separate`, `audio.clean`, `video.upscale`, `image.upscale`,
`video.removeBackground`, `image.removeBackground`). The other `media`
commands that make a file, like `video.trim`, are free.
Cap `gen run` and those `media` commands with `--max-credits`; `--dry-run`
prices them first.

## Working with other agents

Any number of agents, on any number of machines, work in one project.
`agent list` names them, `agent message <agent-url> --text "…"` sends,
`agent inbox <project-url>` reads what came back. invideo's own agents answer
too. `edit point <edit-url>` points at a time or clips for the people watching.
