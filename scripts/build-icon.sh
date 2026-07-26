#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "=== Generating icon PNG ==="
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 generate-icon.py

ICON_DIR="../frontend/build"
mkdir -p "$ICON_DIR/iconset"

# Generate all required sizes for .icns
for s in 16 32 64 128 256 512; do
    sips -z $s $s "$ICON_DIR/icon.png" --out "$ICON_DIR/iconset/icon_${s}x${s}.png" > /dev/null 2>&1
    sips -z $((s*2)) $((s*2)) "$ICON_DIR/icon.png" --out "$ICON_DIR/iconset/icon_${s}x${s}@2x.png" > /dev/null 2>&1
done
cp "$ICON_DIR/icon.png" "$ICON_DIR/iconset/icon_512x512@2x.png"

# Create .icns
iconutil -c icns "$ICON_DIR/iconset" -o "$ICON_DIR/icon.icns" 2>/dev/null
rm -rf "$ICON_DIR/iconset"

if [ -f "$ICON_DIR/icon.icns" ]; then
    echo "=== icon.icns created ==="
    ls -lh "$ICON_DIR/icon.icns"
else
    echo "ERROR: icon.icns not created"
    exit 1
fi
