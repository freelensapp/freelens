#!/bin/bash

magick -background none icon.svg -density 300 -resize 408x408 -bordercolor transparent -border 52 icon.png
magick -background none icon.svg -define icon:auto-resize=16,24,32,48,64,72,96,128,256 icon.ico
for i in 16 22 24 32 36 48 64 72 96 128 192 256 512; do
	magick icon.png -resize ${i}x${i} icons/${i}x${i}.png
done
