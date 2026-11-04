#!/bin/sh
# Launches the ACP bridge for one Bot.
#
# codync starts a Bot's `command` through the login shell, where a Bot cannot carry its
# own environment variables. This wrapper reads them from a file the owner keeps outside
# the repository (mode 600, one KEY=value per line) and then replaces itself with the
# bridge, so ACP keeps talking straight to node over this process's stdin/stdout.
#
#   DSBOT_URL=http://127.0.0.1:9097
#   DSBOT_LOGIN_FILE=/Users/you/.dsbot-bridge/login-url.txt
#
# Usage (the `--bot` value is what codync passes):
#   run-bridge.sh --bot "<bot id or name>"
set -eu

ENV_FILE="${DSBOT_ENV_FILE:-$HOME/.dsbot-bridge.env}"
if [ ! -r "$ENV_FILE" ]; then
	echo "run-bridge: cannot read $ENV_FILE" >&2
	echo "run-bridge: create it (chmod 600) with DSBOT_URL and DSBOT_LOGIN_FILE" >&2
	exit 1
fi

# Export everything the file sets: the bridge is a child process, not part of this shell.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

: "${DSBOT_URL:?run-bridge: DSBOT_URL is not set in $ENV_FILE}"
: "${DSBOT_LOGIN_FILE:?run-bridge: DSBOT_LOGIN_FILE is not set in $ENV_FILE}"

exec node "$(dirname "$0")/dsbot-acp.mjs" "$@"
