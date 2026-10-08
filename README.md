# LeadPilot AI V2

V2 adds real authentication and persistent leads through Supabase.

## 1. Create Supabase project
Create a project at https://supabase.com/

## 2. Create database
Open Supabase SQL Editor and run `database/schema.sql`.

## 3. Configure frontend
Copy `client/.env.example` to `client/.env` and put your Supabase Project URL and anon/publishable key there.

## 4. Run
Terminal 1:
cd client
npm install
npm run dev

Terminal 2:
cd server
npm install
npm run dev

Without Supabase environment variables, the UI still runs in demo mode. With them, users can sign up/sign in and leads are stored in the database.
