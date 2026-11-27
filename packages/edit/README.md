# invideo edit-script types

Install the types for invideo's public TypeScript edit scripts:

```sh
npm i -D @invideo-ai/edit
```

This package supplies declarations, with no runtime or local runner. Scripts import
`@iv/edit`, `@iv/types`, `@iv/score`, `@iv/gen`, `@iv/media`, and `@iv/notebook`;
invideo supplies those modules when it runs your script.

Add the package to your project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["@invideo-ai/edit"],
    "lib": ["ES2022"],
    "strict": true,
    "noEmit": true
  }
}
```

The runtime provides ES2022 libraries, rather than browser DOM globals. Keep the `lib` entry above. Alternatively, put `/// <reference types="@invideo-ai/edit" />` at the top of a script instead of the `types` entry.

## Make a cut

`examples/cut.ts` places a notebook sequence on the current timeline and adds a
72-frame title. Replace its `clip` input with a sequence already in your project.

```ts
import { edit, frames, input } from "@iv/edit";

export default () => {
  const timeline = edit.timeline();
  timeline.placeMedia(input<string>("clip", "1.1"), {
    at: frames(0), length: frames(72),
  }).fillFrame();
  timeline.addText("A new perspective", { at: frames(0), length: frames(72) });
};
```

Check, plan, read the latest state token, then apply:

```sh
invideo edit script <edit-url> --code @cut.ts --mode check --json
invideo edit script <edit-url> --code @cut.ts --mode plan --json
invideo edit show <edit-url> --json
invideo edit script <edit-url> --code @cut.ts --mode apply --token <state_token> --idempotency-key cut-v1 --json
```

`check` is static. `plan` previews the patch without landing it. `apply` changes the
real editor; open its URL to see the result. CLI plan/apply infer the main timeline
from the edit URL, or take an explicit `--timeline-id`.

## Generate within an approved cap

`examples/gen.ts` generates one image and places it on the timeline:

```ts
import { edit, frames } from "@iv/edit";
import { gen } from "@iv/gen";

export default async () => {
  const shot = await gen.nanobanana_2.INGREDIENTS({
    prompt: "A red lamp on a plain white background, product photograph",
    aspect_ratio: "16:9",
  });
  edit.timeline().placeMedia(shot, { at: frames(0), length: frames(72) }).fillFrame();
};
```

```sh
invideo edit script <edit-url> --code @gen.ts --mode plan --json
invideo edit script <edit-url> --code @gen.ts --mode apply --token <state_token> --idempotency-key gen-v1 --max-credits 10 --json
```

Read `plan.credits_new`, get the person's approval for the cap, and use a fresh token.
The cap is on new generation credits for the run; already accepted calls replay.
If the result includes a run URL, follow it with `invideo status <run-url> --wait --json`.

MCP clients use the `run_script` tool with `url`, `code`, `mode` and an explicit
`timeline_id`. Apply also needs `expected_state_token` and `idempotency_key`; generation
needs `max_credits`. Read `get_timeline` for the token. Reuse the same key and request
when retrying an uncertain apply.

## Public limits

Public generation allows only audited fixed-price modes of `nanobanana_2`,
`image_tools`, `video_tools`, and `audio_tools`. Workflow-backed, voice-design,
dynamically priced, unknown and other unverified executors are unavailable.

The declarations omit timeline/score rendering, exports, creating editors, workflow
execution, VM/library/repo/comments modules, generation agents/judging, notebook
writes/imports/charged searches, stock licensing and creating notebook threads, separately charged media analyses and transcription.
Notebook file reads are limited to `/lib` and `/editors`; notebook media reads take
sequence IDs. Thread-scoped VFS reads are unavailable.

The declarations are generated from the same SDK projection as the public server
checker. Package version follows `V300.Sdk.version`; declaration changes require a
version bump and regenerated fixtures. To refresh from a copilot checkout, run
`scripts/sync-edit-types.sh <copilot-checkout>` inside its Nix development shell.
