#!/bin/bash

if [[ $1 == "configure" ]]; then
	if type update-alternatives 2>/dev/null >&1; then
		if [[ -L /usr/bin/freelens && -e /usr/bin/freelens && "$(readlink /usr/bin/freelens || true)" != "/etc/alternatives/freelens" ]]; then
			rm -f /usr/bin/freelens
		fi
		update-alternatives --install /usr/bin/freelens freelens /opt/Freelens/freelens 100 || ln -sf /opt/Freelens/freelens /usr/bin/freelens
	else
		ln -sf /opt/Freelens/freelens /usr/bin/freelens
	fi

	if ! { [[ -L /proc/self/ns/user ]] && unshare --user true; }; then
		chmod 4755 /opt/Freelens/chrome-sandbox || true
	else
		chmod 0755 /opt/Freelens/chrome-sandbox || true
	fi

	if hash apparmor_parser 2>/dev/null; then
		if apparmor_parser --skip-kernel-load --debug /etc/apparmor.d/freelens >/dev/null 2>&1; then
			if hash aa-enabled 2>/dev/null && aa-enabled --quiet 2>/dev/null; then
				apparmor_parser --replace --write-cache --skip-read-cache /etc/apparmor.d/freelens
			fi
		else
			if grep -qs "^[a-z]" /etc/apparmor.d/freelens; then
				sed -i "s/^/# /" /etc/apparmor.d/freelens
			fi
		fi
	fi
fi

# Older APT doesn't work with Github releases.

dollar='$'
if dpkg --compare-versions "$(dpkg-query -f "$dollar{Version}" -W apt || true)" lt "2.4.0"; then
	for f in /etc/apt/sources.list.d/freelens.sources /etc/apt/sources.list.d/freelens-nightly-builds.sources; do
		if [[ -f $f ]]; then
			if grep -qs "^[A-Z]" "$f"; then
				sed -i "s/^/# /" "$f"
			fi
		fi
	done
fi
