#!/bin/sh
# Installs the invideo CLI on macOS or Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/invideoio/cli/main/install.sh | sh
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

need curl
need tar
need uname

case "$(uname -s)" in
  Darwin) os="apple-darwin" ;;
  Linux) os="unknown-linux-gnu" ;;
  *) fail "this script is for macOS and Linux. On Windows, see $repo#install." ;;
esac

case "$(uname -m)" in
  arm64 | aarch64) arch="aarch64" ;;
  x86_64 | amd64) arch="x86_64" ;;
  *) fail "there is no build for $(uname -m)." ;;
esac

# Rosetta reports x86_64 on Apple silicon; use the native build.
if [ "$os" = "apple-darwin" ] && [ "$arch" = "x86_64" ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = "1" ]; then
  arch="aarch64"
fi

if [ -n "${INVIDEO_VERSION:-}" ]; then
  version="${INVIDEO_VERSION#v}"
else
  # Where releases/latest redirects names the newest tag.
  location=$(curl -fsSI "$repo/releases/latest" | tr -d '\r' | awk 'tolower($1) == "location:" { print $2 }')
  version="${location##*/v}"
  [ -n "$version" ] && [ "$version" != "$location" ] || fail "couldn't find the latest release."
fi

target="$arch-$os"
archive="invideo-$target.tar.gz"
url="$repo/releases/download/v$version/$archive"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM

echo "Downloading invideo $version for $target..."
curl -fsSL "$url" -o "$tmp/$archive" || fail "couldn't download $url."
curl -fsSL "$url.sha256" -o "$tmp/$archive.sha256" || fail "couldn't download the checksum."

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
