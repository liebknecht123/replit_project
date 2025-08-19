import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("stopped"),
  port: text("port"),
  health: text("health").default("unknown"),
  lastBuild: timestamp("last_build"),
  version: text("version"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectStats = pgTable("project_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildStatus: text("build_status").notNull().default("unknown"),
  testsPassed: text("tests_passed").default("0"),
  testsTotal: text("tests_total").default("0"),
  coverage: text("coverage").default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectStatsSchema = createInsertSchema(projectStats).omit({
  id: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type InsertProjectStats = z.infer<typeof insertProjectStatsSchema>;
export type ProjectStats = typeof projectStats.$inferSelect;
