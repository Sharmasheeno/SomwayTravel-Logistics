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
# Some Contabo hosts advertise IPv6 but have a dead IPv6 route to GitHub, which
# makes git hang for ~134s and then fail with "Failed to connect ... port 443".
# Prefer IPv4 for git transport so the fetch connects immediately. (A permanent
# system-wide fix is: echo 'precedence ::ffff:0:0/96 100' | sudo tee -a /etc/gai.conf)
GIT_HTTP_OPTS=(-c http.version=HTTP/1.1)

# Retry the network step a few times so a transient blip self-heals instead of
# aborting the whole deploy.
fetch_ok=0
for attempt in 1 2 3; do
  echo "    fetch attempt ${attempt}/3 ..."
  if git "${GIT_HTTP_OPTS[@]}" fetch origin "${BRANCH}"; then
    fetch_ok=1
    break
  fi
  echo "    fetch failed; retrying in 5s ..."
  sleep 5
done
if [ "${fetch_ok}" -ne 1 ]; then
  echo "!! Could not reach GitHub after 3 attempts."
  echo "!! This is almost always a dead IPv6 route on the VPS. Fix with:"
  echo "!!   echo 'precedence ::ffff:0:0/96  100' | sudo tee -a /etc/gai.conf"
  echo "!! then re-run this script. (Verify with: curl -4 -I https://github.com)"
  exit 1
fi

git checkout "${BRANCH}"
git "${GIT_HTTP_OPTS[@]}" pull --ff-only origin "${BRANCH}"

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Building client bundle (npm run build)"
# Nginx forwards /api to Express. Never compile a server-local address into
# the browser bundle, even if an old .env contains VITE_API_BASE_URL.
VITE_API_BASE_URL="" npm run build

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
