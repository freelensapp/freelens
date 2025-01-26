#!/bin/bash

if [[ $1 == "remove" ]]; then
	if type update-alternatives >/dev/null 2>&1; then
		update-alternatives --remove freelens /usr/bin/freelens
	else
		rm -f /usr/bin/freelens
	fi
fi
