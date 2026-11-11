# Database backups

A GitHub Actions job (`.github/workflows/db-backup.yml`) backs up the whole MongoDB
database every Monday at 03:15 India time. Each backup is encrypted and kept for 90 days
under **Actions → Weekly database backup → (a run) → Artifacts**.

## One-time setup

1. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
2. Add `MONGODB_URL`: the same connection string Render uses.
3. Add `BACKUP_PASSPHRASE`: a long random passphrase. Save a copy in your password manager.
   Without it, backups can't be opened.
4. In MongoDB Atlas, **Network Access** must allow GitHub's servers. If the list only has
   specific addresses, add `0.0.0.0/0` (the database password still protects it).
5. Test it: **Actions → Weekly database backup → Run workflow**. The run should end green
   with one artifact.

## Restoring

```sh
# 1. Download and unzip the artifact, then decrypt it
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in studynotion-YYYY-MM-DD.archive.gz.enc -out db.archive.gz -pass pass:'YOUR-PASSPHRASE'

# 2. Restore into a separate database first to check it
#    (DBNAME = the database name at the end of MONGODB_URL)
mongorestore --uri "mongodb+srv://USER:PASS@CLUSTER/" --archive=db.archive.gz --gzip \
  --nsFrom 'DBNAME.*' --nsTo 'restore_test.*'
```

`mongorestore` comes with the MongoDB Database Tools. Restoring over the live database
replaces what's there, so check the backup in a separate database first.
