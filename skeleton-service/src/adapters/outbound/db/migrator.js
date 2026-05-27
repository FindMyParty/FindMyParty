import { Migrator } from "kysely";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { db } from "./client.js";
import { logger } from "../../../shared/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// FileMigrationProvider passes raw Windows paths to import(), which ESM rejects.
// This custom provider converts paths to file:// URLs first.
const migrationProvider = {
  async getMigrations() {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const migrations = {};
    for (const file of files.filter((f) => f.endsWith(".js"))) {
      const fileUrl = pathToFileURL(path.join(MIGRATIONS_DIR, file)).href;
      migrations[path.basename(file, ".js")] = await import(fileUrl);
    }
    return migrations;
  },
};

export async function runMigrations() {
  const migrator = new Migrator({ db, provider: migrationProvider });

  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === "Success") {
      logger.info({ migration: result.migrationName }, "Migration applied");
    } else if (result.status === "Error") {
      logger.error({ migration: result.migrationName }, "Migration failed");
    }
  }

  if (error) {
    throw error;
  }
}
