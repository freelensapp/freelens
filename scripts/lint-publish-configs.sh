#!/bin/bash
set -e

PACKAGE_JSON_PATHS=$(find freelens/* packages/* -type f -name package.json -not -path "*/node_modules/*")
exitCode=0

while IFS= read -r PACKAGE_JSON_PATH; do
	PACKAGE_NAME=$(jq .name "${PACKAGE_JSON_PATH}")
	PACKAGE_IS_PRIVATE=$(jq .private "${PACKAGE_JSON_PATH}")

	if [[ ${PACKAGE_IS_PRIVATE} == "true" ]]; then
		continue
	fi

	PACKAGE_HAS_PUBLISH_CONFIG=$(jq '.publishConfig != null' "${PACKAGE_JSON_PATH}")

	if [[ ${PACKAGE_HAS_PUBLISH_CONFIG} == "false" ]]; then
		echo "${PACKAGE_NAME} is missing publish config"
		exitCode=1
	fi
done <<<"${PACKAGE_JSON_PATHS}"

exit "${exitCode}"
