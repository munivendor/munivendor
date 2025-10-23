param(
    [ValidateSet("production","staging","development")]
    [string]$BuildType = "production"
)

Write-Host "Running Angular build for configuration: $BuildType..."
ng build --configuration $BuildType

# ---- CONFIG ----
$source = "dist/munivendor/browser"  # copy files from here
$target = "C:\Users\micha\Documents\munivendorAPI\MunivendorAPI\ClientApp\dist"

Write-Host ""
Write-Host "Checking folders..."

# ---- CHECK SOURCE ----
if (!(Test-Path $source)) {
    Write-Host "ERROR: Source folder not found: $source"
    exit 1
}

# ---- CHECK DESTINATION ----
if (!(Test-Path $target)) {
    Write-Host "Destination folder not found. Creating it..."
    try {
        New-Item -ItemType Directory -Force -Path $target | Out-Null
    } catch {
        Write-Host "ERROR: Failed to create destination folder: $target"
        Write-Host "Error: $($_.Exception.Message)"
        exit 1
    }
}

# ---- COPY FILES (TOP-LEVEL ONLY IN SOURCE) ----
Write-Host ""
Write-Host "Copying files from top-level of source folder..."
Write-Host "Source: $source"
Write-Host "Target: $target"
Write-Host ""

$sourceFull = (Resolve-Path $source).Path

# Copy only files in the top-level of browser folder
Get-ChildItem -Path $sourceFull -File | ForEach-Object {
    $dest = Join-Path $target $_.Name   # flatten
    Copy-Item $_.FullName -Destination $dest -Force
    Write-Host "Copied file:"
    Write-Host "   From: $($_.FullName)"
    Write-Host "   To:   $dest"
}

Write-Host ""
Write-Host "Done! All top-level files copied successfully to: $target"