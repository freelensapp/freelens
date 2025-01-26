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
