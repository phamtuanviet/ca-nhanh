#!/usr/bin/env bash
# Chạy toàn bộ migration + kịch bản kiểm thử trên Postgres/PostGIS cục bộ (Docker), không cần Supabase.
# Dùng: bash docs/sql/test/run_tests.sh
set -u
cd "$(dirname "$0")"
IMG=postgis/postgis:17-3.5-alpine
docker rm -f canhanh-test >/dev/null 2>&1
docker run -d --name canhanh-test -e POSTGRES_PASSWORD=pg -e TZ=UTC $IMG -c wal_level=logical >/dev/null
for i in $(seq 1 240); do   # image PostGIS khởi động 2 lần (init rồi chạy thật) → đợi lần 2
  if docker logs canhanh-test 2>&1 | grep -q "PostgreSQL init process complete" \
     && [ "$(docker logs canhanh-test 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; then break; fi
  docker exec canhanh-test true
done
run() { docker exec -i canhanh-test psql -U postgres -v ON_ERROR_STOP=1 -q -f - ; }
run < 00_local_supabase_stubs.sql
for f in ../0001_schema.sql ../0002_functions.sql ../0003_security.sql; do run < "$f" || exit 1; done
grep -v "create extension if not exists pg_cron" ../0004_cron_realtime.sql | run >/dev/null || exit 1
for t in 10_scenario_test.sql 20_demo_reset_test.sql 30_fast_forward_test.sql; do
  echo "== $t"; docker exec -i canhanh-test psql -U postgres -q -f - < "$t" 2>&1 | grep -v "^$"
done
docker rm -f canhanh-test >/dev/null
