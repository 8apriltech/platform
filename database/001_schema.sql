create extension if not exists pgcrypto;

create table empresas (

    id uuid primary key default gen_random_uuid(),

    nome varchar(150) not null,

    razao_social varchar(200),

    cnpj varchar(18),

    inscricao_estadual varchar(30),

    telefone varchar(30),

    email varchar(150),

    site varchar(200),

    cep varchar(10),

    logradouro varchar(200),

    numero varchar(20),

    complemento varchar(100),

    bairro varchar(100),

    cidade varchar(100),

    estado varchar(2),

    ativo boolean default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);