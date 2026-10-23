# Installs the invideo CLI on Windows.
#
#   irm https://raw.githubusercontent.com/invideoio/cli/main/install.ps1 | iex
#
# $env:INVIDEO_VERSION = "0.1.0" picks a release (default: the latest).
# $env:INVIDEO_INSTALL_DIR picks where it goes (default: %LOCALAPPDATA%\invideo\bin).

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$repo = "https://github.com/invideoio/cli"
$dir = if ($env:INVIDEO_INSTALL_DIR) { $env:INVIDEO_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "invideo\bin" }

if ([System.Environment]::Is64BitOperatingSystem -eq $false -or $env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    throw "invideo: there is a Windows build for x86_64 only."
}

if ($env:INVIDEO_VERSION) {
    $version = $env:INVIDEO_VERSION.TrimStart("v")
} else {
    # Where releases/latest redirects names the newest tag.
    $request = [System.Net.WebRequest]::Create("$repo/releases/latest")
    $request.AllowAutoRedirect = $false
    $response = $request.GetResponse()
    $location = $response.Headers["Location"]
    $response.Close()
    $version = ($location -split "/v")[-1]
    if (-not $version -or $version -eq $location) { throw "invideo: couldn't find the latest release." }
}
if ($version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?\z') { throw "invideo: `"$version`" isn't a version, like 0.1.0." }

$archive = "invideo-x86_64-pc-windows-gnu.zip"
$url = "$repo/releases/download/v$version/$archive"
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("invideo-" + [System.Guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null

try {
    Write-Host "Downloading invideo $version..."
    Invoke-WebRequest -Uri $url -OutFile (Join-Path $tmp $archive) -UseBasicParsing
    Invoke-WebRequest -Uri "$url.sha256" -OutFile (Join-Path $tmp "$archive.sha256") -UseBasicParsing

    $expected = ((Get-Content (Join-Path $tmp "$archive.sha256") -Raw).Trim() -split "\s+")[0]
    $actual = (Get-FileHash (Join-Path $tmp $archive) -Algorithm SHA256).Hash
    if ($expected -ne $actual) { throw "invideo: the download didn't match its checksum; nothing was installed." }

    Expand-Archive -Path (Join-Path $tmp $archive) -DestinationPath $tmp -Force
    $binary = Get-ChildItem -Path $tmp -Recurse -Filter "invideo.exe" | Select-Object -First 1
    if (-not $binary) { throw "invideo: the archive has no invideo.exe in it." }

    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Copy-Item $binary.FullName (Join-Path $dir "invideo.exe") -Force
    Write-Host "Installed invideo $version to $dir\invideo.exe."

    $path = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if (($path -split ";") -notcontains $dir) {
        [System.Environment]::SetEnvironmentVariable("Path", "$dir;$path", "User")
        Write-Host "Added $dir to your PATH. Open a new terminal to use it."
    }

    Write-Host ""
    Write-Host "Next: invideo auth login"
} finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
