#!/usr/bin/env bash
#
# One-command deploy for the self-hosted Contabo VPS.
#
# Run this ON THE SERVER, from the project root:
#     cd /var/www/SomwayTravel-Logistics
#     bash scripts/deploy-contabo.sh
#
# It pulls the latest code for this branch, installs dependencies, rebuilds the
# client bundle and restarts the pm2 processes. After it finishes, hard-refresh
# the browser (Ctrl+Shift+R) or use an incognito window, because the client
# bundle hash changes on every build.
#
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-arena/01a07273-somwaytravel-logistics}"

echo "==> Deploying branch: ${BRANCH}"

echo "==> Pulling latest code"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Building client bundle (npm run build)"
npm run build

echo "==> Restarting pm2 processes"
# --update-env makes pm2 pick up any new environment variables too.
pm2 restart somway-api somway-web --update-env

echo "==> pm2 status"
pm2 status || true

echo ""
echo "==> Done. Now HARD-REFRESH the browser (Ctrl+Shift+R) or open an"
echo "    incognito window so the new client bundle loads."
echo ""
echo "    Then set the login-link address in the app:"
echo "    Settings -> Login link address -> e.g. http://169.58.173.197:8080 -> Save"
