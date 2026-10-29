#!/usr/bin/env bash
# Lance les migrations + tests SQL sur un PostgreSQL/PostGIS local jetable.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
DATA=$(mktemp -d)
PORT=${PGPORT:-54329}
RUNAS=""
if [ "$(id -u)" = "0" ]; then chown postgres "$DATA"; RUNAS="runuser -u postgres --"; fi
$RUNAS $PGBIN/initdb -D "$DATA" -U postgres -A trust >/dev/null
$RUNAS $PGBIN/pg_ctl -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" start >/dev/null
trap '$RUNAS $PGBIN/pg_ctl -D "$DATA" stop -m immediate >/dev/null; rm -rf "$DATA"' EXIT
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database test" postgres
$PSQL -f tests/stubs.sql test
for f in migrations/*.sql; do echo "→ $f"; $PSQL -f "$f" test; done
for f in tests/test_*.sql; do echo "→ $f"; $PSQL -t -f "$f" test >/dev/null; done
echo "→ seed.sql (base neuve)"
$PSQL -c "create database seedtest" postgres
$PSQL -f tests/stubs.sql seedtest
for f in migrations/*.sql; do $PSQL -f "$f" seedtest; done
$PSQL -f seed.sql seedtest
n=$($PSQL -tA -c "select count(*) from public.feed(48.8566, 2.3522, 5)" seedtest)
[ "$n" = "12" ] || { echo "✗ seed : $n plats dans le flux au lieu de 12"; exit 1; }
echo "✅ Tous les tests SQL passent"
