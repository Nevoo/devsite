#!/bin/sh
# Latin subsets served from public/fonts; originals stay here. Needs: pipx install fonttools
set -e
cd "$(dirname "$0")"
U='U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,U+FEFF,U+FFFD'
pyftsubset Inter-Variable.ttf --unicodes="$U" --layout-features='*' --no-hinting --flavor=woff --output-file=../public/fonts/Inter-Variable-latin.woff
pyftsubset Gilroy-ExtraBold.otf --unicodes="$U" --layout-features='*' --no-hinting --desubroutinize --flavor=woff --output-file=../public/fonts/Gilroy-ExtraBold-latin.woff
