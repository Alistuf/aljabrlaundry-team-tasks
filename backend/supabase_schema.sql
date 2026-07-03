create table if not exists app_documents (
    collection text not null,
    id text not null,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (collection, id)
);

create index if not exists idx_app_documents_collection
    on app_documents (collection);

create index if not exists idx_app_documents_data_gin
    on app_documents using gin (data);
