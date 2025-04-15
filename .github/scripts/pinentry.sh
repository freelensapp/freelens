#!/usr/bin/env bash

echo "OK Hello"

while read -r cmd rest; do
  if [[ -z $cmd ]]; then
    continue
  fi
  case "$cmd" in
  \#*) ;;
  [Gg][Ee][Tt][Pp][Ii][Nn])
    passphrase=$(cat "$HOME/.gnupg/passphrase" || true)
    echo "D $passphrase"
    echo "OK"
    ;;
  [Bb][Yy][Ee])
    echo "OK"
    exit 0
    ;;
  *)
    echo "OK"
    ;;
  esac
done
