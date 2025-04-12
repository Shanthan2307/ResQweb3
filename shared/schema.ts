import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model with different types (local, firestation, ngo)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  userType: text("user_type").notNull(), // 'local', 'firestation', 'ngo'
  pinCode: text("pin_code"), // For local users, NGOs
  pinCodeRangeStart: text("pin_code_range_start"), // For fire stations
  pinCodeRangeEnd: text("pin_code_range_end"), // For fire stations
  assignedFireStationId: integer("assigned_fire_station_id"), // For local users
  walletBalance: doublePrecision("wallet_balance").default(0),
  registrationId: text("registration_id"), // For NGOs and fire stations (registration/license number)
  specialization: text("specialization"), // For NGOs (what they specialize in)
});

// Resources that can be donated/requested
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(0),
  ownerId: integer("owner_id").notNull(), // User ID that owns this resource
});

// Resource requests from fire stations
export const resourceRequests = pgTable("resource_requests", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull(), // Fire station ID
  resourceType: text("resource_type").notNull(),
  quantity: integer("quantity").notNull(),
  urgency: text("urgency").notNull(), // 'low', 'medium', 'high', 'critical'
  description: text("description"),
  status: text("status").notNull().default("pending"), // 'pending', 'fulfilled', 'cancelled'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Donations made by users
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  donorId: integer("donor_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  resourceType: text("resource_type"), // Null if money donation
  resourceQuantity: integer("resource_quantity"), // Null if money donation
  amount: doublePrecision("amount"), // Null if resource donation
  currency: text("currency"), // 'USD', 'USDC', null if resource donation
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Volunteer registrations
export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fireStationId: integer("fire_station_id").notNull(),
  skills: text("skills").array(),
  availability: text("availability").array(),
  emergencyContact: text("emergency_contact"),
  status: text("status").notNull().default("active"), // 'active', 'inactive'
});

// Emergency events
export const emergencies = pgTable("emergencies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reporterId: integer("reporter_id").notNull(), // Fire station that reported
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  location: text("location").notNull(),
  resourcesNeeded: text("resources_needed").array(),
  status: text("status").notNull().default("active"), // 'active', 'resolved'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'request', 'donation', 'emergency'
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  userType: true,
  pinCode: true,
  pinCodeRangeStart: true,
  pinCodeRangeEnd: true,
  registrationId: true,
  specialization: true,
}).extend({
  userType: z.enum(['local', 'firestation', 'ngo']),
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  name: true,
  description: true,
  quantity: true,
  ownerId: true,
});

export const insertResourceRequestSchema = createInsertSchema(resourceRequests).pick({
  requesterId: true,
  resourceType: true,
  quantity: true,
  urgency: true,
  description: true,
}).extend({
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
});

export const insertDonationSchema = createInsertSchema(donations).pick({
  donorId: true,
  recipientId: true,
  resourceType: true,
  resourceQuantity: true,
  amount: true,
  currency: true,
});

export const insertVolunteerSchema = createInsertSchema(volunteers).pick({
  userId: true,
  fireStationId: true,
  skills: true,
  availability: true,
  emergencyContact: true,
});

export const insertEmergencySchema = createInsertSchema(emergencies).pick({
  title: true,
  description: true,
  reporterId: true,
  severity: true,
  location: true,
  resourcesNeeded: true,
}).extend({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  content: true,
  type: true,
}).extend({
  type: z.enum(['request', 'donation', 'emergency']),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type ResourceRequest = typeof resourceRequests.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type Volunteer = typeof volunteers.$inferSelect;
export type Emergency = typeof emergencies.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
