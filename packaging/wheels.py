"""Packs the release binaries into PyPI wheels, one per platform.

    python3 packaging/wheels.py 0.1.0 dist wheels

Each wheel holds only the binary, as a script pip puts on PATH, so
`uv tool install invideo` and `pipx install invideo` install the same build
as the GitHub release.
"""

import base64
import hashlib
import io
import re
import sys
import tarfile
import zipfile
from pathlib import Path

SUMMARY = "Professional video editor and 250+ AI models, from the terminal"

# Archive target -> wheel platform tags.
PLATFORMS = {
    "x86_64-unknown-linux-gnu": ["manylinux_2_17_x86_64", "manylinux2014_x86_64"],
    "aarch64-unknown-linux-gnu": ["manylinux_2_17_aarch64", "manylinux2014_aarch64"],
    "universal2-apple-darwin": ["macosx_11_0_x86_64", "macosx_11_0_arm64", "macosx_11_0_universal2"],
    "x86_64-pc-windows-gnu": ["win_amd64"],
}


def pep440(version):
    """0.2.0-rc.1 -> 0.2.0rc1, as PyPI orders pre-releases."""
    return re.sub(r"-(rc|alpha|beta)\.?(\d+)", lambda m: {"alpha": "a", "beta": "b"}.get(m[1], m[1]) + m[2], version)


def binary(archive):
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as z:
            return "invideo.exe", z.read("invideo.exe")
    with tarfile.open(archive) as t:
        return "invideo", t.extractfile("invideo").read()


def digest(data):
    return "sha256=" + base64.urlsafe_b64encode(hashlib.sha256(data).digest()).rstrip(b"=").decode()


def wheel(version, target, archive, readme, out):
    name, exe = binary(archive)
    tags = PLATFORMS[target]
    info = f"invideo-{version}.dist-info"
    files = {
        f"invideo-{version}.data/scripts/{name}": exe,
        f"{info}/METADATA": (
            "Metadata-Version: 2.1\n"
            "Name: invideo\n"
            f"Version: {version}\n"
            f"Summary: {SUMMARY}\n"
            "Home-page: https://github.com/invideoio/cli\n"
            "Project-URL: Source, https://github.com/invideoio/cli\n"
            "Description-Content-Type: text/markdown\n"
            "\n" + readme
        ).encode(),
        f"{info}/WHEEL": (
            "Wheel-Version: 1.0\nGenerator: invideo-release\nRoot-Is-Purelib: false\n"
            + "".join(f"Tag: py3-none-{tag}\n" for tag in tags)
        ).encode(),
    }
    record = "".join(f"{path},{digest(data)},{len(data)}\n" for path, data in files.items())
    files[f"{info}/RECORD"] = (record + f"{info}/RECORD,,\n").encode()

    path = out / f"invideo-{version}-py3-none-{'.'.join(tags)}.whl"
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for member, data in files.items():
            entry = zipfile.ZipInfo(member, date_time=(1980, 1, 1, 0, 0, 0))
            entry.external_attr = (0o100755 if member.endswith(name) else 0o100644) << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(entry, data)
    print(path.name)


def main(version, dist, out):
    dist, out = Path(dist), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    readme = (Path(__file__).parent / "pypi.md").read_text()
    for target in PLATFORMS:
        archive = dist / f"invideo-{target}.{'zip' if 'windows' in target else 'tar.gz'}"
        wheel(pep440(version), target, archive, readme, out)


if __name__ == "__main__":
    main(*sys.argv[1:])
