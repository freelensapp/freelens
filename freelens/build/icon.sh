#!/bin/bash

## macOS
magick -background none icon.svg -density 300 -resize 408x408 -bordercolor transparent -border 52 -verbose icon.png

## Windows
magick -background none icon.svg -define icon:auto-resize=16,20,24,32,40,48,60,64,72,80,96,256 -verbose icon.ico

## Linux
for i in 16 22 24 32 36 48 64 72 96 128 192 256 512; do
	border=$(("${i}000" * 38 / 1000000))
	size=$((i - 2 * border))
	magick -background none icon.svg -density 300 -resize "${size}x${size}" -bordercolor transparent -border "${border}" -verbose "icons/${i}x${i}.png"
done
