#!/bin/bash

set -eo pipefail

pnpm i $(pnpx knip --production --reporter json | jq '.. | objects | select(has("unlisted")) | .unlisted | .[].name' -r | uniq)
pnpm i -D $(pnpx knip --reporter json | jq '.. | objects | select(has("unlisted")) | .unlisted | .[].name' -r | uniq)
