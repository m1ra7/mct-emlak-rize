import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  uuid,
  uniqueIndex,
  index,
  check,
  jsonb,
  bigint,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
const times = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};
export const user = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    role: text("role").default("user").notNull(),
    active: boolean("active").default(true).notNull(),
    phone: text("phone"),
    ...times,
  },
  (t) => [check("user_role", sql`${t.role} in ('admin','user')`)],
);
export const session = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...times,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
export const account = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...times,
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    uniqueIndex("provider_account_unique").on(t.providerId, t.accountId),
  ],
);
export const verification = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ...times,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
export const rateLimit = pgTable("auth_rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const cities = pgTable("cities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});
export const districts = pgTable(
  "districts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (t) => [uniqueIndex("district_unique").on(t.cityId, t.slug)],
);
export const neighborhoods = pgTable(
  "neighborhoods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    districtId: uuid("district_id")
      .notNull()
      .references(() => districts.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("neighborhood_unique").on(t.districtId, t.name)],
);
export const propertyTypes = pgTable("property_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  allowSale: boolean("allow_sale").default(true).notNull(),
  allowRent: boolean("allow_rent").default(true).notNull(),
});
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 16, scale: 2 }).notNull(),
    currency: text("currency").default("TRY").notNull(),
    listingType: text("listing_type").notNull(),
    propertyTypeId: uuid("property_type_id")
      .notNull()
      .references(() => propertyTypes.id, { onDelete: "restrict" }),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "restrict" }),
    districtId: uuid("district_id")
      .notNull()
      .references(() => districts.id, { onDelete: "restrict" }),
    neighborhoodId: uuid("neighborhood_id").references(() => neighborhoods.id, {
      onDelete: "restrict",
    }),
    address: text("address").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    roomCount: text("room_count").notNull(),
    areaM2: integer("area_m2"),
    buildingAge: integer("building_age").default(0).notNull(),
    floor: integer("floor").default(0).notNull(),
    totalFloors: integer("total_floors").default(1).notNull(),
    heatingType: text("heating_type").notNull(),
    bathroomCount: integer("bathroom_count").default(1).notNull(),
    balcony: boolean("balcony").default(false).notNull(),
    elevator: boolean("elevator").default(false).notNull(),
    parking: boolean("parking").default(false).notNull(),
    furnished: boolean("furnished").default(false).notNull(),
    complex: boolean("complex").default(false).notNull(),
    seaView: boolean("sea_view").default(false).notNull(),
    status: text("status").default("pending").notNull(),
    featured: boolean("featured").default(false).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...times,
  },
  (t) => [
    index("listing_search_idx").on(
      t.status,
      t.listingType,
      t.districtId,
      t.price,
    ),
    index("listing_new_idx").on(t.status, t.createdAt),
    index("listing_owner_idx").on(t.userId),
    check("positive_price", sql`${t.price}>0`),
    check("positive_area", sql`${t.areaM2}>0`),
    check(
      "listing_status",
      sql`${t.status} in ('draft','pending','published','archived')`,
    ),
    check("listing_type", sql`${t.listingType} in ('satilik','kiralik')`),
  ],
);
export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    altText: text("alt_text").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("image_listing_idx").on(t.listingId),
    uniqueIndex("one_primary_image")
      .on(t.listingId)
      .where(sql`${t.isPrimary}=true`),
  ],
);
export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("favorite_unique").on(t.userId, t.listingId),
    index("favorite_listing_idx").on(t.listingId),
  ],
);
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("message_inbox_idx").on(t.recipientId, t.createdAt),
    index("message_sender_idx").on(t.senderId, t.createdAt),
  ],
);
export const listingFeatures = pgTable(
  "listing_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: text("value").notNull(),
  },
  (t) => [uniqueIndex("feature_unique").on(t.listingId, t.name)],
);
export const appRateLimits = pgTable("app_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").default(1).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const storageJobs = pgTable("storage_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  storageKey: text("storage_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetId: text("target_id").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
