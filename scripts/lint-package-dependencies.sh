#!/bin/bash
set -e

PACKAGE_JSON_PATHS=$(find freelens/* packages/* -type f -name package.json -not -path "*/node_modules/*")
exitCode=0

while IFS= read -r PACKAGE_JSON_PATH; do
	PACKAGE_NAME=$(jq .name "${PACKAGE_JSON_PATH}")

	RAW_PACKAGE_DEPENDENCIES=$(jq -r '.dependencies // {} | keys | .[]' "${PACKAGE_JSON_PATH}")
	PACKAGE_DEPENDENCIES=$(echo "${RAW_PACKAGE_DEPENDENCIES}" | sort)

	RAW_PACKAGE_DEV_DEPENDENCIES=$(jq -r '.devDependencies // {} | keys | .[]' "${PACKAGE_JSON_PATH}")
	PACKAGE_DEV_DEPENDENCIES=$(echo "${RAW_PACKAGE_DEV_DEPENDENCIES}" | sort)

	RAW_PACKAGE_PEER_DEPENDENCIES=$(jq -r '.peerDependencies // {} | keys | .[]' "${PACKAGE_JSON_PATH}")
	PACKAGE_PEER_DEPENDENCIES=$(echo "${RAW_PACKAGE_PEER_DEPENDENCIES}" | sort)

	DUPLICATES_BETWEEN_DEPS_AND_DEV_DEPS=$(comm -12 <(echo "${PACKAGE_DEPENDENCIES}") <(echo "${PACKAGE_DEV_DEPENDENCIES}"))
	DUPLICATES_BETWEEN_DEPS_AND_PEER_DEPS=$(comm -12 <(echo "${PACKAGE_DEPENDENCIES}") <(echo "${PACKAGE_PEER_DEPENDENCIES}"))
	DUPLICATES_BETWEEN_DEV_DEPS_AND_PEER_DEPS=$(comm -12 <(echo "${PACKAGE_DEV_DEPENDENCIES}") <(echo "${PACKAGE_PEER_DEPENDENCIES}"))

	if [[ ${DUPLICATES_BETWEEN_DEPS_AND_DEV_DEPS} != "" ]]; then
		echo "ERROR: ${PACKAGE_NAME} has duplicate dependencies and devDependencies: ${DUPLICATES_BETWEEN_DEPS_AND_DEV_DEPS}"
		exitCode=1
	fi

	if [[ ${DUPLICATES_BETWEEN_DEPS_AND_PEER_DEPS} != "" ]]; then
		echo "ERROR: ${PACKAGE_NAME} has duplicate dependencies and peerDependencies: ${DUPLICATES_BETWEEN_DEPS_AND_PEER_DEPS}"
		exitCode=1
	fi

	if [[ ${DUPLICATES_BETWEEN_DEV_DEPS_AND_PEER_DEPS} != "" ]]; then
		echo "ERROR: ${PACKAGE_NAME} has duplicate devDependencies and peerDependencies: ${DUPLICATES_BETWEEN_DEV_DEPS_AND_PEER_DEPS}"
		exitCode=1
	fi
done <<<"${PACKAGE_JSON_PATHS}"

exit "${exitCode}"
