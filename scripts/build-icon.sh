#!/bin/bash
set -e
cd "$(dirname "$0")"
python3 generate-icon.py

ICON_DIR="../frontend/build"
mkdir -p "$ICON_DIR/iconset"

# Generate all sizes
SIZES=(16 32 64 128 256 512 1024)
for s in "${SIZES[@]}"; do
    sips -z $s $s "$ICON_DIR/icon.png" --out "$ICON_DIR/iconset/icon_${s}x${s}.png" 2>/dev/null
    # @2x versions
    sips -z $((s*2)) $((s*2)) "$ICON_DIR/icon.png" --out "$ICON_DIR/iconset/icon_${s}x${s}@2x.png" 2>/dev/null
done

# Create .icns
iconutil -c icns "$ICON_DIR/iconset" -o "$ICON_DIR/icon.icns" 2>/dev/null
rm -rf "$ICON_DIR/iconset"
echo "icon.icns created at $ICON_DIR/"
