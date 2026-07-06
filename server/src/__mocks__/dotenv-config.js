// Mock dotenv/config for tests — prevents missing .env from crashing
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_BUCKET = 'test-bucket';
