# ClientHub - Client Management System

A comprehensive client intake and management system. Designed for case managers, social workers, and service providers.

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm
- Supabase account (free tier works)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Set up Supabase database**
   - Create a new Supabase project
   - Go to SQL Editor
   - Run the schema from `supabase/schema.sql`

4. **Set up Supabase Storage**

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Enrollment start dates

Quick Add creates an Interested Employment Support enrollment. Changing its status
to Enrolled records the current Pacific calendar date when no start date is set.
Creating an enrollment directly as Enrolled does the same. Existing start dates
are preserved unless staff supplies a different date in the enrollment form.

For existing databases, run
[`20261022000000_backfill_enrollment_start_dates.sql`](supabase/migrations/20261022000000_backfill_enrollment_start_dates.sql)
in the Supabase SQL Editor. It fills blank dates from the earliest recorded
transition into Enrolled, using Pacific time. Records without an enrollment
transition stay blank. The migration can be run again without changing dates
that have already been filled. Re-export the engagement report after applying it.

The SQL regression test can be run against an empty test database with:

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/backfill_enrollment_start_dates.sql
```

## Supabase Storage Setup

The application uses Supabase Storage for file uploads. Follow these steps to configure storage:

### 1. Create Storage Buckets

In your Supabase dashboard, go to **Storage** and create these buckets:

| Bucket Name | Public | Description |
|-------------|--------|-------------|
| `profile-pictures` | Yes | User profile photos |
| `client-documents` | No | Client documents (ID, income, etc.) |
| `signatures` | No | Digital signatures |

### 2. Apply Storage Policies

Run the SQL from `supabase/storage-policies.sql` in the SQL Editor to set up access policies:

```sql
-- This creates RLS policies for secure file access
-- Only authenticated users can upload/view their own files
-- Admin users can access all files
```
