import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://otkrzxbayfayiafublny.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90a3J6eGJheWZheWlhZnVibG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTA3OTYsImV4cCI6MjEwNDI4Njc5Nn0.lWcVCCPaGaxtHajhLEG6J2H5teVW8i2CKa18hnhjJwU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)