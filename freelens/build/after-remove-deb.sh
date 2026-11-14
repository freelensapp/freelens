#!/bin/bash

if [[ $1 == "remove" ]]; then
	if type update-alternatives >/dev/null 2>&1; then
		update-alternatives --remove prolens /opt/ProLens/prolens || true
	fi

	if [[ -L /usr/bin/prolens && "$(readlink /usr/bin/prolens || true)" == "/opt/ProLens/prolens" ]]; then
		rm -f /usr/bin/prolens
	fi
fi
