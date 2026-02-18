# Database Backup Guide

This project includes an automated backup system for your Neon PostgreSQL database.

## Quick Start

### 1. Create a Backup

```bash
npm run backup
```

This will:
- Read your `DATABASE_URL` from `.env`
- Create a SQL dump of your entire database
- Save it to `./backups/matiere_backup_YYYY-MM-DD_HH-MM-SS.sql`

### 2. List All Backups

```bash
npm run backup:list
```

Shows all backup files with size and date.

### 3. Clean Old Backups

```bash
npm run backup:clean
```

Keeps only the 10 most recent backups and deletes older ones.

## Backup Location

Backups are saved to: `./backups/`

This directory is gitignored (already configured).

## Requirements

You need `pg_dump` installed. If you don't have it:

### Windows (using winget)
```bash
winget install PostgreSQL.pgAdmin
```

Or download from: https://www.postgresql.org/download/windows/

### Mac (using Homebrew)
```bash
brew install libpq
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install postgresql-client
```

## Restore from Backup

To restore your database from a backup file:

```bash
psql "YOUR_DATABASE_URL" < backups/matiere_backup_YYYY-MM-DD_HH-MM-SS.sql
```

**Warning:** This will overwrite existing data. Test on a separate database first!

## Automated Backups (Optional)

To schedule automatic backups, you can use:

### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily/Weekly
4. Action: Start a program
5. Program: `node`
6. Arguments: `scripts/backup.js create`
7. Start in: `C:\wamp64\www\sitematiere-nexjs`

### Cron (Mac/Linux)
```bash
# Edit crontab
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * cd /path/to/sitematiere-nexjs && npm run backup
```

## Backup Contents

The SQL backup includes:
- ✅ All table schemas
- ✅ All data (users, projects, files, images, etc.)
- ✅ Constraints and indexes
- ✅ Sequences

## Security

- Backup files are stored locally (not in git)
- Database credentials are read from `.env` (never hardcoded)
- Backup files contain sensitive data - keep them secure!

## Troubleshooting

### "pg_dump not found"
Install PostgreSQL client tools (see Requirements above)

### "DATABASE_URL not found"
Make sure `.env` file exists with `DATABASE_URL` variable

### Permission denied
Check that you have write access to `./backups/` directory

## Alternative Backup Methods

### 1. Using your app's Export Page
Visit (as admin): `https://sitematiere.michel-esparsa.workers.dev/export-db?password=export2026`

### 2. Neon Console Backups
- Login to https://neon.tech
- Automatic backups are available in your project dashboard

### 3. Manual pg_dump
```bash
pg_dump "postgresql://user:pass@host/db?sslmode=require" > backup.sql
```
