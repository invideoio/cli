#!/bin/sh
# Installs the invideo CLI on macOS or Linux.
#
#   curl -fsSL https://agents.invideo.io | sh
#
# INVIDEO_VERSION=0.1.0 picks a release (default: the latest).
# INVIDEO_INSTALL_DIR picks where it goes (default: ~/.local/bin).

set -eu

repo="https://github.com/invideoio/cli"
dir="${INVIDEO_INSTALL_DIR:-$HOME/.local/bin}"

fail() {
  echo "invideo: $*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "this needs $1."
}

# A version is digits, as in 1.2.3, with an optional pre-release such as -rc.1.
valid_version() {
  case "$1" in *[!0-9A-Za-z.-]*) return 1 ;; esac
  awk -v v="$1" 'BEGIN { exit !(v ~ /^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$/) }'
}

# Everything runs from main, called on the last line, so a cut-off download runs nothing.
main() {
need curl
need tar
need uname

case "$(uname -s)-$(uname -m)" in
  Darwin-*) target="universal2-apple-darwin" ;;
  Linux-x86_64 | Linux-amd64) target="x86_64-unknown-linux-gnu" ;;
  Linux-aarch64 | Linux-arm64) target="aarch64-unknown-linux-gnu" ;;
  Linux-*) fail "there is no build for $(uname -m)." ;;
  *) fail "this script is for macOS and Linux. On Windows, see $repo#install." ;;
esac

if [ -n "${INVIDEO_VERSION:-}" ]; then
  version="${INVIDEO_VERSION#v}"
else
  # Where releases/latest redirects names the newest tag.
  location=$(curl -fsSI --proto '=https' --tlsv1.2 "$repo/releases/latest" | tr -d '\r' | awk 'tolower($1) == "location:" { print $2 }')
  version="${location##*/v}"
  [ -n "$version" ] && [ "$version" != "$location" ] || fail "couldn't find the latest release."
fi
valid_version "$version" || fail "\"$version\" isn't a version, like 0.1.0."

archive="invideo-$target.tar.gz"
url="$repo/releases/download/v$version/$archive"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM

echo "Downloading invideo $version for $target..."
curl -fsSL --proto '=https' --tlsv1.2 "$url" -o "$tmp/$archive" || fail "couldn't download $url."
curl -fsSL --proto '=https' --tlsv1.2 "$url.sha256" -o "$tmp/$archive.sha256" || fail "couldn't download the checksum."

expected=$(awk '{ print $1 }' "$tmp/$archive.sha256")
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$tmp/$archive" | awk '{ print $1 }')
else
  need shasum
  actual=$(shasum -a 256 "$tmp/$archive" | awk '{ print $1 }')
fi
[ "$expected" = "$actual" ] || fail "the download didn't match its checksum; nothing was installed."

tar -xzf "$tmp/$archive" -C "$tmp"
binary=$(find "$tmp" -type f -name invideo | head -n 1)
[ -n "$binary" ] || fail "the archive has no invideo in it."

mkdir -p "$dir"
install -m 755 "$binary" "$dir/invideo"
echo "Installed invideo $version to $dir/invideo."

case ":$PATH:" in
  *":$dir:"*) ;;
  *)
    echo
    echo "$dir isn't on your PATH. Add it, for example:"
    echo "  echo 'export PATH=\"$dir:\$PATH\"' >> ~/.profile"
    ;;
esac

echo
echo "Next: invideo auth login"
}

main "$@"
