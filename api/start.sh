#!/bin/bash
set -euo pipefail
cd /home/site/wwwroot/api
if [ ! -x ./postgrest ]; then
  curl -fsSL -o /tmp/postgrest.tar.xz \
    https://github.com/PostgREST/postgrest/releases/download/v12.2.12/postgrest-v12.2.12-linux-static-x86-64.tar.xz
  tar -xJf /tmp/postgrest.tar.xz -C /home/site/wwwroot/api
  chmod +x ./postgrest
fi
if [ ! -d node_modules/pg ]; then
  npm ci --omit=dev
fi
export POSTGREST_BIN=/home/site/wwwroot/api/postgrest
exec node --experimental-strip-types server.mjs
