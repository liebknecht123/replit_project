import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username").notNull().unique(),
  password_hash: varchar("password_hash").notNull(),
  nickname: varchar("nickname"),
  created_at: timestamp("created_at").defaultNow(),
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

// 游戏房间数据模型
export const gameRooms = pgTable("game_rooms", {
  id: varchar("id").primaryKey(),
  hostUserId: serial("host_user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  maxPlayers: text("max_players").notNull().default("4"),
  status: text("status").notNull().default("waiting"), // waiting, playing, finished
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 游戏房间成员
export const gameRoomPlayers = pgTable("game_room_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => gameRooms.id).notNull(),
  userId: serial("user_id").references(() => users.id).notNull(),
  isHost: text("is_host").notNull().default("false"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password_hash: true,
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

export const insertGameRoomSchema = createInsertSchema(gameRooms).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertGameRoomPlayerSchema = createInsertSchema(gameRoomPlayers).omit({
  id: true,
  joinedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type InsertProjectStats = z.infer<typeof insertProjectStatsSchema>;
export type ProjectStats = typeof projectStats.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoomPlayer = z.infer<typeof insertGameRoomPlayerSchema>;
export type GameRoomPlayer = typeof gameRoomPlayers.$inferSelect;
