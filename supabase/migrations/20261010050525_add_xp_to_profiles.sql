-- Add xp column to profiles for tracking experience points
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp int NOT NULL DEFAULT 0;
