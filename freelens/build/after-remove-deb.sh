#!/bin/bash

if [[ $1 == "remove" ]]; then
	if type update-alternatives >/dev/null 2>&1; then
		update-alternatives --remove prolens /opt/ProLens/prolens || true
	fi

	for path in /usr/bin/prolens /usr/bin/freelens; do
		if [[ -L "$path" && "$(readlink "$path" || true)" == "/opt/ProLens/prolens" ]]; then
			rm -f "$path"
		fi
	done
fi
