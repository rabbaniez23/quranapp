#!/bin/bash
# Backup harian database TemanTahfidz (MariaDB) di hp-server. Salinan lebih dari 14 hari dihapus.
# Kredensial dibaca dari backend/.env (DATABASE_URL), tidak ditulis di sini.
# Pasang (crontab -e):  30 2 * * * $HOME/apps/quranapp/deploy/backup-db.sh
set -euo pipefail

APP="$HOME/apps/quranapp"
TUJUAN="$HOME/backup/quranapp"
SIMPAN_HARI=14

URL=$(sed -n 's/^DATABASE_URL=//p' "$APP/backend/.env" | tr -d '\r')
# mysql+pymysql://user:sandi@host:port/nama?charset=...
USER_DB=$(sed -E 's#^[^:]+://([^:]+):.*#\1#' <<<"$URL")
SANDI=$(sed -E 's#^[^:]+://[^:]+:([^@]*)@.*#\1#' <<<"$URL")
HOST=$(sed -E 's#^[^@]+@([^:/]+).*#\1#' <<<"$URL")
PORT=$(sed -nE 's#^[^@]+@[^:/]+:([0-9]+)/.*#\1#p' <<<"$URL")
NAMA=$(sed -E 's#^.*/([^/?]+)(\?.*)?$#\1#' <<<"$URL")

mkdir -p "$TUJUAN"
chmod 700 "$TUJUAN"
umask 077
# Sandi lewat file sementara (bukan argumen), supaya tidak terlihat di daftar proses
CNF=$(mktemp)
trap 'rm -f "$CNF"' EXIT
printf '[client]\nuser=%s\npassword=%s\nhost=%s\nport=%s\n' "$USER_DB" "$SANDI" "$HOST" "${PORT:-3306}" > "$CNF"

FILE="$TUJUAN/$NAMA-$(date +%Y%m%d-%H%M).sql.gz"
mariadb-dump --defaults-extra-file="$CNF" --single-transaction --routines "$NAMA" | gzip > "$FILE"
find "$TUJUAN" -name "$NAMA-*.sql.gz" -mtime +"$SIMPAN_HARI" -delete
echo "backup: $FILE ($(du -h "$FILE" | cut -f1))"
