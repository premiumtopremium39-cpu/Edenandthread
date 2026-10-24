import { betterAuth } from "better-auth";
import { DatabaseSync } from "node:sqlite";
import dotenv from "dotenv";
import { dash } from "@better-auth/infra";

// Polyfill node:sqlite StatementSync.prototype.columns for Node.js < 23.11.0 / 22.16.0 compatibility
try {
  const dummyDb = new DatabaseSync(":memory:");
  const dummyStmt = dummyDb.prepare("SELECT 1");
  const StatementSync = Object.getPrototypeOf(dummyStmt).constructor;

  if (typeof StatementSync.prototype.columns !== "function") {
    const originalPrepare = DatabaseSync.prototype.prepare;
    DatabaseSync.prototype.prepare = function(sql, ...args) {
      const stmt = originalPrepare.call(this, sql, ...args);
      stmt.sqlString = sql;
      return stmt;
    };

    StatementSync.prototype.columns = function() {
      const sql = (this.sqlString || "").trim().toLowerCase();
      const isSelect = sql.startsWith("select") || 
                       sql.startsWith("pragma") || 
                       sql.startsWith("with") || 
                       /\breturning\b/.test(sql);
      if (isSelect) {
        return [{ name: "dummy" }];
      }
      return [];
    };
  }
} catch (e) {
  console.warn("Failed to apply node:sqlite StatementSync.prototype.columns polyfill:", e);
}

import fs from "fs";
import path from "path";

dotenv.config();

let dbPath = "database.sqlite";
if (process.env.VERCEL) {
  const tmpPath = path.join("/tmp", "database.sqlite");
  if (!fs.existsSync(tmpPath)) {
    try {
      const seedPath = path.join(process.cwd(), "database.sqlite");
      if (fs.existsSync(seedPath)) {
        fs.copyFileSync(seedPath, tmpPath);
        console.log("Successfully copied seed database to /tmp/database.sqlite");
      } else {
        console.warn("Seed database not found at:", seedPath);
      }
    } catch (err) {
      console.error("Failed to copy seed database to /tmp:", err);
    }
  }
  dbPath = tmpPath;
}

export let auth;
try {
  let dbInstance;
  try {
    dbInstance = new DatabaseSync(dbPath);
  } catch (dbErr) {
    console.warn("SQLite DatabaseSync fallback:", dbErr.message);
    dbInstance = new DatabaseSync(":memory:");
  }

  auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET || "eden_threads_luxury_secret_auth_key_2026_default",
    database: dbInstance,
    emailAndPassword: {
      enabled: true
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "GOOGLE_MOCK_CLIENT_ID",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "GOOGLE_MOCK_CLIENT_SECRET"
      }
    },
    trustedOrigins: [
      "http://localhost:5173",
      "https://clothesbranddemo.vercel.app",
      "https://bitter-eels-rhyme.loca.lt"
    ],
    plugins: process.env.BETTER_AUTH_API_KEY ? [
      dash({
        apiKey: process.env.BETTER_AUTH_API_KEY
      })
    ] : []
  });
} catch (authErr) {
  console.warn("Better Auth init fallback:", authErr.message);
  auth = null;
}
