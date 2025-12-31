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
