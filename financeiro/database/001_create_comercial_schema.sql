-- ==============================================================================
-- PLATAFORMA 8APRIL - MÓDULO COMERCIAL / FINANCEIRO
-- Migration 001: Schema Completo PostgreSQL / Supabase
-- Arquitetura Multi-tenant com RLS, FKs, Índices e Cascades
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS DOMINIAIS
DO $$ BEGIN
    CREATE TYPE tipo_contrato_enum AS ENUM (
        'valor_unico',
        'parcelado',
        'por_etapas',
        'recorrente'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE status_contrato_enum AS ENUM (
        'Em negociação',
        'Aguardando assinatura',
        'Ativo',
        'Em execução',
        'Finalizado',
        'Cancelado'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE status_parcela_enum AS ENUM (
        'Pendente',
        'Pago',
        'Vencido',
        'Cancelado',
        'Parcial'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE forma_pagamento_enum AS ENUM (
        'pix',
        'boleto',
        'cartao_credito',
        'cartao_debito',
        'transferencia',
        'dinheiro',
        'outro'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- TABELA: clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(30),
    email VARCHAR(255),
    telefone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: contratos
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo tipo_contrato_enum NOT NULL DEFAULT 'parcelado',
    valor_total NUMERIC(15, 2) NOT NULL CHECK (valor_total >= 0),
    status status_contrato_enum NOT NULL DEFAULT 'Em negociação',
    data_inicio DATE NOT NULL,
    previsao_termino DATE,
    responsavel_nome VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: parcelas
CREATE TABLE IF NOT EXISTS public.parcelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    numero_parcela INT NOT NULL DEFAULT 1,
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
    valor_pago NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (valor_pago >= 0),
    vencimento DATE NOT NULL,
    status status_parcela_enum NOT NULL DEFAULT 'Pendente',
    forma_pagamento forma_pagamento_enum DEFAULT 'pix',
    data_pagamento TIMESTAMPTZ,
    link_boleto TEXT,
    pix_copia_cola TEXT,
    gateway VARCHAR(50),
    external_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: recebimentos
CREATE TABLE IF NOT EXISTS public.recebimentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    parcela_id UUID NOT NULL REFERENCES public.parcelas(id) ON DELETE CASCADE,
    valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
    data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    forma_pagamento forma_pagamento_enum NOT NULL DEFAULT 'pix',
    comprovante_url TEXT,
    observacoes TEXT,
    usuario_nome VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: historico_auditoria
CREATE TABLE IF NOT EXISTS public.historico_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
    parcela_id UUID REFERENCES public.parcelas(id) ON DELETE CASCADE,
    entidade VARCHAR(50) NOT NULL,
    acao VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    usuario_nome VARCHAR(255) DEFAULT 'Sistema',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_contratos_tenant ON public.contratos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON public.parcelas(vencimento);
CREATE INDEX IF NOT EXISTS idx_recebimentos_parcela ON public.recebimentos(parcela_id);

-- RLS (ROW LEVEL SECURITY)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_contratos ON public.contratos USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY tenant_parcelas ON public.parcelas USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY tenant_recebimentos ON public.recebimentos USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
