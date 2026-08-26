import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync("izitailleur.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS customers_local (
      id TEXT PRIMARY KEY NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      address TEXT,
      notes TEXT,
      localUpdatedAt TEXT NOT NULL,
      serverUpdatedAt TEXT,
      deletedAt TEXT,
      dirty INTEGER NOT NULL DEFAULT 0,
      conflict INTEGER NOT NULL DEFAULT 0,
      serverSnapshot TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments_local (
      id TEXT PRIMARY KEY NOT NULL,
      customerId TEXT,
      orderId TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      startAt TEXT NOT NULL,
      endAt TEXT,
      notes TEXT,
      localUpdatedAt TEXT NOT NULL,
      serverUpdatedAt TEXT,
      deletedAt TEXT,
      dirty INTEGER NOT NULL DEFAULT 0,
      conflict INTEGER NOT NULL DEFAULT 0,
      serverSnapshot TEXT
    );

    CREATE TABLE IF NOT EXISTS orders_local (
      id TEXT PRIMARY KEY NOT NULL,
      reference TEXT,
      customerId TEXT NOT NULL,
      customerFirstName TEXT NOT NULL,
      customerLastName TEXT NOT NULL,
      modelName TEXT NOT NULL,
      fabricDescription TEXT,
      price INTEGER NOT NULL,
      deposit INTEGER NOT NULL,
      dueDate TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      instructions TEXT,
      notes TEXT,
      localUpdatedAt TEXT NOT NULL,
      serverUpdatedAt TEXT,
      deletedAt TEXT,
      dirty INTEGER NOT NULL DEFAULT 0,
      conflict INTEGER NOT NULL DEFAULT 0,
      serverSnapshot TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks_local (
      id TEXT PRIMARY KEY NOT NULL,
      orderId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      dueDate TEXT,
      localUpdatedAt TEXT NOT NULL,
      serverUpdatedAt TEXT,
      dirty INTEGER NOT NULL DEFAULT 0,
      conflict INTEGER NOT NULL DEFAULT 0,
      serverSnapshot TEXT
    );

    CREATE TABLE IF NOT EXISTS mutation_queue (
      entity TEXT NOT NULL,
      recordId TEXT NOT NULL,
      op TEXT NOT NULL,
      baseUpdatedAt TEXT,
      data TEXT,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (entity, recordId)
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export async function getLastSyncAt(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'lastSyncAt'",
  );
  return row?.value ?? new Date(0).toISOString();
}

export async function setLastSyncAt(value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO sync_meta (key, value) VALUES ('lastSyncAt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    value,
  );
}
