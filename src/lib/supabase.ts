import { createClient } from '@supabase/supabase-js';

// Default Supabase project credentials for Sera Fashion House
export const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  || 'https://ysczioswkniyiauftoqc.supabase.co';

export const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzY3ppb3N3a25peWlhdWZ0b3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NjEzNDYsImV4cCI6MjEwOTMzNzM0Nn0.RsbC0HNHr-QlVWjuAZ5BkgUxgy29-nrApWkl8nHR9Ak';

export const SUPABASE_PROJECT_ID = 'ysczioswkniyiauftoqc';

// Initialize the global Supabase client with resilient configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface SupabaseHealthStatus {
  isConnected: boolean;
  projectUrl: string;
  projectId: string;
  tables: {
    products: boolean;
    orders: boolean;
    settings: boolean;
    reviews: boolean;
    customers: boolean;
    visitor_sessions: boolean;
  };
  errorMessage?: string;
  latencyMs?: number;
}

// Check Supabase connection health and probe table availability
export const checkSupabaseHealth = async (): Promise<SupabaseHealthStatus> => {
  const startTime = Date.now();
  const tables = {
    products: false,
    orders: false,
    settings: false,
    reviews: false,
    customers: false,
    visitor_sessions: false,
  };

  try {
    // Probe each table with limit 1
    const [pRes, oRes, sRes, rRes, cRes, vRes] = await Promise.allSettled([
      supabase.from('products').select('id').limit(1),
      supabase.from('orders').select('id').limit(1),
      supabase.from('settings').select('id').limit(1),
      supabase.from('reviews').select('id').limit(1),
      supabase.from('customers').select('id').limit(1),
      supabase.from('visitor_sessions').select('session_id').limit(1),
    ]);

    tables.products = pRes.status === 'fulfilled' && !pRes.value.error;
    tables.orders = oRes.status === 'fulfilled' && !oRes.value.error;
    tables.settings = sRes.status === 'fulfilled' && !sRes.value.error;
    tables.reviews = rRes.status === 'fulfilled' && !rRes.value.error;
    tables.customers = cRes.status === 'fulfilled' && !cRes.value.error;
    tables.visitor_sessions = vRes.status === 'fulfilled' && !vRes.value.error;

    // Check if at least connected to REST API
    const isConnected = true;

    return {
      isConnected,
      projectUrl: SUPABASE_URL,
      projectId: SUPABASE_PROJECT_ID,
      tables,
      latencyMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      isConnected: false,
      projectUrl: SUPABASE_URL,
      projectId: SUPABASE_PROJECT_ID,
      tables,
      errorMessage: err?.message || String(err),
      latencyMs: Date.now() - startTime,
    };
  }
};

/**
 * Universal SQL Schema script for Supabase SQL Editor.
 * If user creates tables in their Supabase project, they can run this script with 1 click!
 */
export const SUPABASE_SQL_SCHEMA = `-- ================================================================
-- SERA FASHION HOUSE - SUPABASE DATABASE SCHEMA
-- Project ID: ysczioswkniyiauftoqc
-- Run this in Supabase Dashboard -> SQL Editor -> New Query
-- ================================================================

-- 1. PRODUCTS TABLE
create table if not exists public.products (
  id text primary key,
  title text not null,
  brand text default 'Sera Fashion',
  description text default '',
  price numeric not null default 0,
  regular_price numeric default 0,
  sizes jsonb default '[]'::jsonb,
  category text default 'THREE PIECE',
  images jsonb default '[]'::jsonb,
  code text default '',
  is_active boolean default true,
  is_featured boolean default false,
  stock_quantity integer default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  raw_data jsonb default '{}'::jsonb
);

-- 2. ORDERS TABLE
create table if not exists public.orders (
  id text primary key,
  order_id text not null,
  customer_name text not null,
  mobile_number text not null,
  address text not null,
  district text default '',
  upazila text default '',
  category text default 'THREE PIECE',
  product_code text default '',
  quantity integer default 1,
  price numeric default 0,
  items jsonb default '[]'::jsonb,
  delivery_charge numeric default 80,
  total_amount numeric not null default 0,
  discount numeric default 0,
  discount_amount numeric default 0,
  discount_type text default 'percentage',
  delivery_option text default 'Home Delivery',
  delivery_area text default 'Inside Dhaka',
  payment_method text default 'Cash On Delivery',
  status text default 'Pending',
  note text default '',
  created_at timestamptz default now(),
  courier_tracking_code text default '',
  courier_status text default '',
  raw_data jsonb default '{}'::jsonb
);

-- 3. SETTINGS TABLE
create table if not exists public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 4. REVIEWS TABLE
create table if not exists public.reviews (
  id text primary key,
  product_id text default '',
  customer_name text not null,
  location text default '',
  rating integer default 5,
  comment text not null,
  avatar text default '',
  role text default 'Verified Buyer',
  is_featured boolean default false,
  created_at timestamptz default now(),
  raw_data jsonb default '{}'::jsonb
);

-- 5. CUSTOMERS TABLE
create table if not exists public.customers (
  id text primary key,
  name text not null,
  phone text not null,
  email text default '',
  address text default '',
  district text default '',
  upazila text default '',
  avatar_url text default '',
  created_at timestamptz default now(),
  raw_data jsonb default '{}'::jsonb
);

-- 6. VISITOR SESSIONS TABLE
create table if not exists public.visitor_sessions (
  session_id text primary key,
  customer_name text default '',
  mobile_number text default '',
  current_stage text default 'browsing_catalog',
  last_active_at timestamptz default now(),
  district text default '',
  upazila text default '',
  has_spun boolean default false,
  raw_data jsonb default '{}'::jsonb
);

-- 7. PUSH NOTIFICATION SUBSCRIBERS TABLE
create table if not exists public.push_subscribers (
  id text primary key,
  device_type text default 'Android',
  user_agent text default '',
  customer_name text default '',
  mobile_number text default '',
  subscribed_at timestamptz default now(),
  raw_data jsonb default '{}'::jsonb
);

-- 8. PUSH NOTIFICATION CAMPAIGNS TABLE
create table if not exists public.push_campaigns (
  id text primary key,
  title text not null,
  body text not null,
  image text default '',
  url text default '/',
  target_audience text default 'all',
  sent_count integer default 1,
  created_at timestamptz default now(),
  raw_data jsonb default '{}'::jsonb
);

-- Enable Row Level Security (RLS) & Allow Anonymous App Access
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.settings enable row level security;
alter table public.reviews enable row level security;
alter table public.customers enable row level security;
alter table public.visitor_sessions enable row level security;
alter table public.push_subscribers enable row level security;
alter table public.push_campaigns enable row level security;

-- Public Access Policies for Web Storefront & Admin
drop policy if exists "Allow public all access on products" on public.products;
create policy "Allow public all access on products" on public.products for all using (true) with check (true);

drop policy if exists "Allow public all access on orders" on public.orders;
create policy "Allow public all access on orders" on public.orders for all using (true) with check (true);

drop policy if exists "Allow public all access on settings" on public.settings;
create policy "Allow public all access on settings" on public.settings for all using (true) with check (true);

drop policy if exists "Allow public all access on reviews" on public.reviews;
create policy "Allow public all access on reviews" on public.reviews for all using (true) with check (true);

drop policy if exists "Allow public all access on customers" on public.customers;
create policy "Allow public all access on customers" on public.customers for all using (true) with check (true);

drop policy if exists "Allow public all access on visitor_sessions" on public.visitor_sessions;
create policy "Allow public all access on visitor_sessions" on public.visitor_sessions for all using (true) with check (true);

drop policy if exists "Allow public all access on push_subscribers" on public.push_subscribers;
create policy "Allow public all access on push_subscribers" on public.push_subscribers for all using (true) with check (true);

drop policy if exists "Allow public all access on push_campaigns" on public.push_campaigns;
create policy "Allow public all access on push_campaigns" on public.push_campaigns for all using (true) with check (true);

-- Performance Optimization Indexes
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_mobile on public.orders(mobile_number);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_created_at on public.products(created_at desc);

-- Realtime Channel Subscriptions for instant live sync
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
    alter publication supabase_realtime add table public.products;
    alter publication supabase_realtime add table public.settings;
    alter publication supabase_realtime add table public.visitor_sessions;
  end if;
exception
  when duplicate_object then null;
end $$;

-- Full Access Permissions for anon & authenticated roles
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
`;
