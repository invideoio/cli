"""Lays out the npm packages for a release, one directory each.

    python3 packaging/npm.py 0.1.0 dist npm

A package per platform holds its binary; `invideo` depends on all of them as
optional dependencies, so npm installs only the one for the machine, and runs
it through `invideo.js`.
"""

import json
import shutil
import sys
import tarfile
import zipfile
from pathlib import Path

DESCRIPTION = "Professional video editor and 250+ AI models, from the terminal"
REPOSITORY = {"type": "git", "url": "git+https://github.com/invideoio/cli.git"}
HERE = Path(__file__).parent

# Package -> (archive target, os, cpu).
PLATFORMS = {
    "@invideo-ai/cli-darwin-universal": ("universal2-apple-darwin", ["darwin"], ["arm64", "x64"]),
    "@invideo-ai/cli-linux-x64": ("x86_64-unknown-linux-gnu", ["linux"], ["x64"]),
    "@invideo-ai/cli-linux-arm64": ("aarch64-unknown-linux-gnu", ["linux"], ["arm64"]),
    "@invideo-ai/cli-win32-x64": ("x86_64-pc-windows-gnu", ["win32"], ["x64"]),
}

# The packages people install; both run the same binaries.
LAUNCHERS = ["invideo"]


def binary(archive):
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as z:
            return "invideo.exe", z.read("invideo.exe")
    with tarfile.open(archive) as t:
        return "invideo", t.extractfile("invideo").read()


def write(directory, manifest):
    directory.mkdir(parents=True)
    (directory / "package.json").write_text(json.dumps(manifest, indent=2) + "\n")


def main(version, dist, out):
    dist, out = Path(dist), Path(out)
    shutil.rmtree(out, ignore_errors=True)
    common = {"version": version, "description": DESCRIPTION, "homepage": "https://github.com/invideoio/cli", "repository": REPOSITORY}

    for name, (target, os, cpu) in PLATFORMS.items():
        directory = out / name.replace("/", "__")
        write(directory, {"name": name, **common, "os": os, "cpu": cpu, "files": ["bin"]})
        file, data = binary(dist / f"invideo-{target}.{'zip' if 'windows' in target else 'tar.gz'}")
        (directory / "bin").mkdir()
        (directory / "bin" / file).write_bytes(data)
        (directory / "bin" / file).chmod(0o755)
        print(directory.name)

    for name in LAUNCHERS:
        directory = out / name.replace("/", "__")
        write(directory, {
            "name": name,
            **common,
            "bin": {"invideo": "bin/invideo.js"},
            "files": ["bin"],
            "engines": {"node": ">=16"},
            "optionalDependencies": {platform: version for platform in PLATFORMS},
        })
        (directory / "bin").mkdir()
        shutil.copy(HERE / "npm" / "invideo.js", directory / "bin" / "invideo.js")
        (directory / "bin" / "invideo.js").chmod(0o755)
        shutil.copy(HERE / "npm" / "README.md", directory / "README.md")
        print(directory.name)


if __name__ == "__main__":
    main(*sys.argv[1:])
