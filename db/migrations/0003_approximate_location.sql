ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "location_approximate" boolean DEFAULT false NOT NULL;
