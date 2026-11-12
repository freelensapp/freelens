#!/bin/bash

set -euo pipefail

## macOS
icns() {
  local svg=$1 out=$2
  rm -rf icon.iconset
  mkdir icon.iconset
  for i in 16 32 64 128 256 512 1024; do
    border=$(("${i}000" * 100 / 1000000))
    size=$((i - 2 * border))
    half=$((i / 2))
    if [[ $i -ne 1024 ]]; then
      magick -background none "${svg}" -density 400 -resize "${size}x${size}" -bordercolor transparent -border "${border}" -verbose "icon.iconset/icon_${i}x${i}.png"
    fi
    if [[ $i -ne 16 ]]; then
      magick -background none "${svg}" -density 400 -resize "${size}x${size}" -bordercolor transparent -border "${border}" -verbose "icon.iconset/icon_${half}x${half}@2x.png"
    fi
  done
  iconutil --convert icns -o "${out}" icon.iconset
  rm -rf icon.iconset
}

## Windows
ico() {
  local svg=$1 out=$2
  magick -background none "${svg}" -density 400 -define icon:auto-resize=256,16,20,24,32,40,48,60,64,72,80,96 -define icon:png-compression-size=256 -verbose "${out}"
}

icns icon.svg icon.icns
ico icon.svg icon.ico

## Linux
for i in 16 22 24 32 36 48 64 72 96 128 192 256 512; do
  border=$(("${i}000" * 38 / 1000000))
  size=$((i - 2 * border))
  magick -background none icon.svg -density 400 -resize "${size}x${size}" -bordercolor transparent -border "${border}" -verbose "icons/${i}x${i}.png"
done

## Installers: the NSIS installer, the DMG volume and the PKG window, with the badge in the corner
tmpdir=$(mktemp -d)
trap 'rm -rf "${tmpdir}"' EXIT
perl -0777 -pe '
  BEGIN { local @ARGV = ("installer-badge.svg"); $badge = <>; $badge =~ s{.*?<svg[^>]*>|</svg>.*}{}gs }
  s{</svg>}{$badge</svg>}
' icon.svg >"${tmpdir}/installer-icon.svg"
icns "${tmpdir}/installer-icon.svg" installerIcon.icns
ico "${tmpdir}/installer-icon.svg" installerIcon.ico
## 144 DPI makes the Installer show the 320 px image at 160 points, sharp on Retina
magick -background none -density 400 "${tmpdir}/installer-icon.svg" -resize 256x256 -bordercolor transparent -border 32 -units PixelsPerInch -density 144 -verbose installerBackground.png
