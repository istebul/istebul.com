-- GarsonAI P3-A Restaurant SaaS Foundation

create table if not exists branches (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    name text not null,
    address text,
    phone text,
    is_active boolean default true,
    created_at timestamptz default now()
);

create table if not exists business_settings (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null unique references businesses(id) on delete cascade,
    currency text default 'TRY',
    timezone text default 'Europe/Istanbul',
    language text default 'tr',
    created_at timestamptz default now()
);

create table if not exists opening_hours (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    branch_id uuid references branches(id) on delete cascade,
    day_of_week int not null,
    open_time time,
    close_time time,
    is_closed boolean default false
);

create table if not exists whatsapp_channels (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    phone_number text not null,
    phone_number_id text,
    status text default 'pending',
    created_at timestamptz default now()
);


alter table branches enable row level security;
alter table business_settings enable row level security;
alter table opening_hours enable row level security;
alter table whatsapp_channels enable row level security;


create policy "tenant branches access"
on branches
for all
using (
    business_id in (
        select business_id
        from profiles
        where id = auth.uid()
    )
);


create policy "tenant settings access"
on business_settings
for all
using (
    business_id in (
        select business_id
        from profiles
        where id = auth.uid()
    )
);


create policy "tenant hours access"
on opening_hours
for all
using (
    business_id in (
        select business_id
        from profiles
        where id = auth.uid()
    )
);


create policy "tenant whatsapp access"
on whatsapp_channels
for all
using (
    business_id in (
        select business_id
        from profiles
        where id = auth.uid()
    )
);

