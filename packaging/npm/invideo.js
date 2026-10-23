#!/usr/bin/env node
// Runs the invideo binary from the package npm installed for this platform.

const { spawnSync } = require("child_process");

const packages = {
  "darwin-arm64": "@invideo-ai/cli-darwin-universal",
  "darwin-x64": "@invideo-ai/cli-darwin-universal",
  "linux-arm64": "@invideo-ai/cli-linux-arm64",
  "linux-x64": "@invideo-ai/cli-linux-x64",
  "win32-x64": "@invideo-ai/cli-win32-x64",
};

const platform = `${process.platform}-${process.arch}`;
const name = packages[platform];
if (!name) {
  console.error(`invideo: there is no build for ${platform}. See https://github.com/invideoio/cli#install.`);
  process.exit(1);
}

let binary;
try {
  binary = require.resolve(`${name}/bin/invideo${process.platform === "win32" ? ".exe" : ""}`);
} catch {
  console.error(`invideo: ${name} isn't installed. Reinstall without --omit=optional or --no-optional.`);
  process.exit(1);
}

const run = spawnSync(binary, process.argv.slice(2), { stdio: "inherit" });
if (run.error) {
  console.error(`invideo: ${run.error.message}`);
  process.exit(1);
}
if (run.signal) process.kill(process.pid, run.signal);
process.exit(run.status ?? 1);
