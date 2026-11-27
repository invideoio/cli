#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then echo "usage: $0 <copilot-checkout>" >&2; exit 2; fi
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
copilot="$(cd "$1" && pwd)"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
(
  cd "$copilot"
  env_file=".env.${MIX_ENV:-dev}"
  if [ -x ./bin/env ]; then eval "$(./bin/env --overload -e "$env_file" -e "$env_file.local")"; fi
  just _ensure-timeline
  mix sdk.public_types --out "$out"
)
cp "$out/index.d.ts" "$repo_root/packages/edit/index.d.ts"
node - "$repo_root" "$out/package-version.txt" <<'JS'
const fs = require('node:fs');
const [root, versionFile] = process.argv.slice(2);
const version = fs.readFileSync(versionFile, 'utf8').trim();
const path = `${root}/packages/edit/package.json`;
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.version = version;
fs.writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
const lockPath = `${root}/package-lock.json`;
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.packages['packages/edit'].version = version;
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}
JS
printf 'Synced @invideo-ai/edit %s\n' "$(cat "$out/package-version.txt")"
