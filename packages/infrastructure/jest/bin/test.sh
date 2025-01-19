#!/usr/bin/env bash

jest --coverage --runInBand
result=$?

[[ ${result} != 0 ]] && [[ -n ${CI} ]] && open ./coverage/lcov-report/index.html

exit "${result}"
