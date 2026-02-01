#!/bin/bash
# Generate app icons for Android, iOS, and web from bugrit.png
# Requires: ImageMagick (convert command)

set -e

SOURCE="public/bugrit.png"
OUTPUT_DIR="public/icons"
CROPPED="public/bugrit-icon.png"

if [ ! -f "$SOURCE" ]; then
  echo "Error: $SOURCE not found"
  exit 1
fi

# Check for ImageMagick
if ! command -v convert &> /dev/null; then
  echo "Error: ImageMagick is required. Install with: apt-get install imagemagick"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Cropping shield from logo (removing 'Bugrit' text)..."
# Crop the top portion to get just the shield without the text
# The shield is approximately 75% of the image height
convert "$SOURCE" -gravity North -crop 100%x75%+0+0 +repage -trim +repage "$CROPPED"

echo "Generating icons from cropped shield..."
SOURCE="$CROPPED"

# =============================================================================
# Favicons (browser)
# =============================================================================
echo "Creating favicons..."
convert "$SOURCE" -resize 16x16 "$OUTPUT_DIR/favicon-16x16.png"
convert "$SOURCE" -resize 32x32 "$OUTPUT_DIR/favicon-32x32.png"
convert "$SOURCE" -resize 48x48 "$OUTPUT_DIR/favicon-48x48.png"

# Create .ico with multiple sizes
convert "$SOURCE" -resize 16x16 -define icon:auto-resize=16,32,48 "public/favicon.ico"

# =============================================================================
# Apple Touch Icons (iOS)
# =============================================================================
echo "Creating Apple touch icons..."
convert "$SOURCE" -resize 57x57 "$OUTPUT_DIR/apple-touch-icon-57x57.png"
convert "$SOURCE" -resize 60x60 "$OUTPUT_DIR/apple-touch-icon-60x60.png"
convert "$SOURCE" -resize 72x72 "$OUTPUT_DIR/apple-touch-icon-72x72.png"
convert "$SOURCE" -resize 76x76 "$OUTPUT_DIR/apple-touch-icon-76x76.png"
convert "$SOURCE" -resize 114x114 "$OUTPUT_DIR/apple-touch-icon-114x114.png"
convert "$SOURCE" -resize 120x120 "$OUTPUT_DIR/apple-touch-icon-120x120.png"
convert "$SOURCE" -resize 144x144 "$OUTPUT_DIR/apple-touch-icon-144x144.png"
convert "$SOURCE" -resize 152x152 "$OUTPUT_DIR/apple-touch-icon-152x152.png"
convert "$SOURCE" -resize 180x180 "$OUTPUT_DIR/apple-touch-icon-180x180.png"

# Default apple-touch-icon (180x180)
cp "$OUTPUT_DIR/apple-touch-icon-180x180.png" "public/apple-touch-icon.png"

# =============================================================================
# Android Icons (PWA)
# =============================================================================
echo "Creating Android icons..."
convert "$SOURCE" -resize 36x36 "$OUTPUT_DIR/android-chrome-36x36.png"
convert "$SOURCE" -resize 48x48 "$OUTPUT_DIR/android-chrome-48x48.png"
convert "$SOURCE" -resize 72x72 "$OUTPUT_DIR/android-chrome-72x72.png"
convert "$SOURCE" -resize 96x96 "$OUTPUT_DIR/android-chrome-96x96.png"
convert "$SOURCE" -resize 144x144 "$OUTPUT_DIR/android-chrome-144x144.png"
convert "$SOURCE" -resize 192x192 "$OUTPUT_DIR/android-chrome-192x192.png"
convert "$SOURCE" -resize 256x256 "$OUTPUT_DIR/android-chrome-256x256.png"
convert "$SOURCE" -resize 384x384 "$OUTPUT_DIR/android-chrome-384x384.png"
convert "$SOURCE" -resize 512x512 "$OUTPUT_DIR/android-chrome-512x512.png"

# =============================================================================
# MS Tile Icons (Windows)
# =============================================================================
echo "Creating Microsoft tile icons..."
convert "$SOURCE" -resize 70x70 "$OUTPUT_DIR/mstile-70x70.png"
convert "$SOURCE" -resize 144x144 "$OUTPUT_DIR/mstile-144x144.png"
convert "$SOURCE" -resize 150x150 "$OUTPUT_DIR/mstile-150x150.png"
convert "$SOURCE" -resize 310x150 -gravity center -extent 310x150 "$OUTPUT_DIR/mstile-310x150.png"
convert "$SOURCE" -resize 310x310 "$OUTPUT_DIR/mstile-310x310.png"

# =============================================================================
# Safari Pinned Tab (monochrome SVG would be ideal, but we'll use PNG)
# =============================================================================
echo "Creating Safari pinned tab icon..."
convert "$SOURCE" -resize 512x512 "$OUTPUT_DIR/safari-pinned-tab.png"

# =============================================================================
# Open Graph / Social Media
# =============================================================================
echo "Creating social media images..."
convert "$SOURCE" -resize 1200x630 -gravity center -extent 1200x630 -background white "$OUTPUT_DIR/og-image.png"

echo ""
echo "Done! Generated icons in $OUTPUT_DIR"
echo ""
echo "Don't forget to:"
echo "1. Update public/manifest.json with icon references"
echo "2. Add meta tags to your layout.tsx or _document.tsx"
