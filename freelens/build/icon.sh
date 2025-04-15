#!/bin/bash

set -euo pipefail

## macOS
rm -rf icon.iconset
mkdir icon.iconset
for i in 16 32 64 128 256 512 1024; do
  border=$(("${i}000" * 100 / 1000000))
  size=$((i - 2 * border))
  half=$((i / 2))
  if [[ $i -ne 1024 ]]; then
    magick -background none icon.svg -density 400 -resize "${size}x${size}" -bordercolor transparent -border "${border}" -verbose "icon.iconset/icon_${i}x${i}.png"
  fi
  if [[ $i -ne 16 ]]; then
    magick -background none icon.svg -density 400 -resize "${size}x${size}" -bordercolor transparent -border "${border}" -verbose "icon.iconset/icon_${half}x${half}@2x.png"
  fi
done
iconutil --convert icns -o icon.icns icon.iconset
rm -rf icon.iconset

## Windows
magick -background none icon.svg -density 400 -define icon:auto-resize=256,16,20,24,32,40,48,60,64,72,80,96 -verbose icon.ico

## Linux
for i in 16 22 24 32 36 48 64 72 96 128 192 256 512; do
  border=$(("${i}000" * 38 / 1000000))
  size=$((i - 2 * border))
  magick -background none icon.svg -density 400 -resize "${size}x${size}" -bordercolor transparent -border "${border}" -verbose "icons/${i}x${i}.png"
done
