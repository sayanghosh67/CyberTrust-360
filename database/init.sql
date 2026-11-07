-- CyberTrust 360 - Database Initialization Script
-- Technix Pro Engineering Team

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log initialization
DO $$
BEGIN
   RAISE NOTICE 'CyberTrust 360 database initialized successfully.';
END $$;
