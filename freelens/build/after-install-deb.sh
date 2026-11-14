#!/bin/bash

if [[ $1 == "configure" ]]; then
	if type update-alternatives 2>/dev/null >&1; then
		if [[ -L /usr/bin/prolens && -e /usr/bin/prolens && "$(readlink /usr/bin/prolens || true)" != "/etc/alternatives/prolens" ]]; then
			rm -f /usr/bin/prolens
		fi
		update-alternatives --install /usr/bin/prolens prolens /opt/ProLens/prolens 100 || ln -sf /opt/ProLens/prolens /usr/bin/prolens
	else
		ln -sf /opt/ProLens/prolens /usr/bin/prolens
	fi

	if ! { [[ -L /proc/self/ns/user ]] && unshare --user true; }; then
		chmod 4755 /opt/ProLens/chrome-sandbox || true
	else
		chmod 0755 /opt/ProLens/chrome-sandbox || true
	fi

	if hash apparmor_parser 2>/dev/null; then
		if apparmor_parser --skip-kernel-load --debug /etc/apparmor.d/prolens >/dev/null 2>&1; then
			if hash aa-enabled 2>/dev/null && aa-enabled --quiet 2>/dev/null; then
				apparmor_parser --replace --write-cache --skip-read-cache /etc/apparmor.d/prolens
			fi
		else
			if grep -qs "^[a-z]" /etc/apparmor.d/prolens; then
				sed -i "s/^/# /" /etc/apparmor.d/prolens
			fi
		fi
	fi
fi
