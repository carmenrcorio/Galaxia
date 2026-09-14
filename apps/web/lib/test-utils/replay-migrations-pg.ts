import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PG_BIN = "/usr/lib/postgresql/16/bin";

function bin(name: string): string {
  const path = join(PG_BIN, name);
  if (!existsSync(path)) {
    throw new Error(
      `Postgres binary missing: ${path}. The purge replay test needs a local PostgreSQL 16 server (initdb/postgres/psql).`
    );
  }
  return path;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ReplayedPostgres {
  host: string;
  port: number;
  user: string;
  database: string;
  psql(sql: string): string;
}

/**
 * Start an ephemeral Postgres, apply the auth stub + every committed
 * supabase/migrations/*.sql in filename order, run `fn`, then stop the
 * cluster. Used by the account-purge test so `pnpm test` can prove the
 * SQL without a live Supabase project.
 */
export async function withReplayedMigrations<T>(
  repoRoot: string,
  fn: (db: ReplayedPostgres) => Promise<T> | T
): Promise<T> {
  const dataDir = mkdtempSync(join(tmpdir(), "galaxia-purge-pg-"));
  const port = 55432 + Math.floor(Math.random() * 400);
  const initdb = bin("initdb");
  const postgres = bin("postgres");
  const psqlBin = bin("psql");
  const pgIsReady = bin("pg_isready");

  execFileSync(
    initdb,
    ["-D", dataDir, "--auth-local=trust", "--auth-host=trust", "-U", "postgres", "--no-sync", "--locale=C"],
    { stdio: "pipe" }
  );

  const child: ChildProcess = spawn(
    postgres,
    ["-D", dataDir, "-k", dataDir, "-p", String(port), "-c", "listen_addresses="],
    { stdio: "pipe" }
  );

  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  try {
    const readyDeadline = Date.now() + 15_000;
    let ready = false;
    while (Date.now() < readyDeadline) {
      try {
        execFileSync(pgIsReady, ["-h", dataDir, "-p", String(port), "-U", "postgres"], {
          stdio: "pipe"
        });
        ready = true;
        break;
      } catch {
        if (child.exitCode !== null) {
          throw new Error(`postgres exited during startup (${child.exitCode}): ${stderr}`);
        }
        await sleep(100);
      }
    }
    if (!ready) {
      throw new Error(`postgres did not become ready: ${stderr}`);
    }

    const psql = (sql: string): string => {
      return execFileSync(
        psqlBin,
        [
          "-h",
          dataDir,
          "-p",
          String(port),
          "-U",
          "postgres",
          "-d",
          "postgres",
          "-v",
          "ON_ERROR_STOP=1",
          "-q",
          "-t",
          "-A",
          "-c",
          sql
        ],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
      ).trim();
    };

    const psqlFile = (file: string): void => {
      execFileSync(
        psqlBin,
        [
          "-h",
          dataDir,
          "-p",
          String(port),
          "-U",
          "postgres",
          "-d",
          "postgres",
          "-v",
          "ON_ERROR_STOP=1",
          "-q",
          "-f",
          file
        ],
        { encoding: "utf8", stdio: "pipe" }
      );
    };

    psqlFile(join(repoRoot, "apps/web/lib/test-utils/auth-schema-stub.sql"));

    const { readdirSync } = await import("node:fs");
    const migrationsDir = join(repoRoot, "supabase/migrations");
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      try {
        psqlFile(join(migrationsDir, file));
      } catch (err) {
        const extra =
          err && typeof err === "object" && "stderr" in err
            ? String((err as { stderr: Buffer | string }).stderr)
            : "";
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`migration ${file} failed:\n${extra || message}`);
      }
    }

    return await fn({
      host: dataDir,
      port,
      user: "postgres",
      database: "postgres",
      psql
    });
  } finally {
    child.kill("SIGTERM");
    const stopDeadline = Date.now() + 5_000;
    while (child.exitCode === null && Date.now() < stopDeadline) {
      await sleep(50);
    }
    if (child.exitCode === null) child.kill("SIGKILL");
    rmSync(dataDir, { recursive: true, force: true });
  }
}
