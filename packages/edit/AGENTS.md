# Editing with invideo

These are types only. Import the `@iv/*` modules; invideo supplies their runtime.
Export a default function. Do not run the TypeScript file locally with Node.

1. Read the edit URL with `invideo edit show <url> --json` or MCP `get_timeline`.
2. Write a script and type-check it. Run `invideo edit script <url> --code @cut.ts --mode check --json`.
3. Run the same script with `--mode plan`; inspect the patch and `plan.credits_new`.
4. Read again for a current `state_token`. Apply with `--mode apply --token <token>`
   and a stable `--idempotency-key`. Show the person the editor URL.
5. A stale token means read and rebuild against current state. Reuse a key only
   for the exact same script, inputs, target and token when retrying uncertainty;
   a newly planned request needs a new key. Accepted requests replay once.
6. Generation needs the person's approved cap in `--max-credits N`. Plan first;
   no cap means no new paid generation. Never invent approval or silently raise it.
7. Follow a returned run URL using `invideo status <run-url> --wait --json`.

MCP uses `run_script` with `url`, `code`, `mode`, explicit `timeline_id`, and for apply
`expected_state_token` / `idempotency_key`; pass `max_credits` for generation.

Use only declared public generators and methods. See README's public limits.
Do not bypass the declaration restrictions with `any` in an actual script.
