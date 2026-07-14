create table if not exists products (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null,
  price integer not null,
  image_url text not null,
  shade text,
  features jsonb not null default '[]'::jsonb,
  inventory_count integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_restocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_email text not null,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  delivery_city text not null,
  order_notes text,
  subtotal integer not null,
  delivery_fee integer not null,
  total integer not null,
  payment_status text not null default 'pending',
  fulfillment_status text not null default 'new',
  paystack_reference text,
  items jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'website',
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
