# SQLite Migration Summary

## Changes Made

The Telegram bot has been successfully migrated from PostgreSQL to SQLite.

### 1. Dependencies Updated
- **Removed**: `pg` and `@types/pg`
- **Added**: `better-sqlite3` and `@types/better-sqlite3`

### 2. Database Module (`src/database/index.ts`)
- Replaced PostgreSQL connection pool with SQLite database
- Updated all queries from parameterized queries ($1, $2) to positional parameters (?)
- Changed async database operations to synchronous (SQLite is synchronous by default)
- Added automatic directory creation for database file
- Enabled WAL mode for better concurrent access

### 3. Schema Changes
- `BIGINT` → `INTEGER` for telegram_id and user_id
- `SERIAL` → `INTEGER PRIMARY KEY AUTOINCREMENT` for auto-increment IDs
- `VARCHAR` and `NUMERIC` → `TEXT` (SQLite uses dynamic typing)
- `BOOLEAN` → `INTEGER` (SQLite doesn't have native boolean, uses 0/1)
- `TIMESTAMP DEFAULT NOW()` → `TEXT DEFAULT (datetime('now'))`
- `JSONB` → `TEXT` with JSON string storage

### 4. Configuration (`config/index.ts`)
- Changed `database.url` to `database.path`
- Default path: `./data/tradepool.db`

### 5. Environment Variables (`.env.example`)
- Changed `DATABASE_URL` to `DATABASE_PATH`
- Removed PostgreSQL connection string format

### 6. .gitignore
- Added `data/` directory
- Added `*.db`, `*.db-shm`, `*.db-wal` to ignore SQLite files

## Benefits

1. **No External Database**: No need to run PostgreSQL server
2. **Simpler Deployment**: Single file database, easy to backup
3. **Zero Configuration**: Database file created automatically
4. **Better for Bot Use Case**: SQLite is perfect for single-process applications
5. **Faster for Small Data**: Better performance for typical bot workloads

## Running the Bot

1. Update your `.env` file:
   ```bash
   DATABASE_PATH=./data/tradepool.db
   ```

2. Start the bot:
   ```bash
   npm run dev
   ```

The database file will be created automatically in the `./data` directory.

## Migration Notes

- SQLite doesn't enforce foreign key constraints by default (would need `PRAGMA foreign_keys = ON`)
- All numeric values are stored as TEXT for precision (similar to PostgreSQL NUMERIC)
- The WAL mode is enabled for better concurrent read performance
- Database operations are now synchronous but wrapped in async functions for API compatibility
