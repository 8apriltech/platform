-- =========================================================
   8APRIL ORÇAMENTOS - SCRIPT DDL SUPABASE (PRODUÇÃO)
   =========================================================
-- Cole e execute este script completo no "SQL Editor" do seu projeto Supabase.

-- 1. Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Criar a Tabela de Orçamentos
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero VARCHAR(30) UNIQUE NOT NULL,        -- Ex: ORC-2026-0001
    sequencial INT NOT NULL,                    -- Numérico sequencial (1, 2, 3...)
    ano INT NOT NULL,                           -- Ano de emissão (ex: 2026)
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_empresa VARCHAR(255),
    validade_dias VARCHAR(100) DEFAULT '15 dias',
    condicoes_pagamento TEXT,
    prazo_execucao VARCHAR(255),
    observacoes TEXT,
    valor_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Array de itens [{descricao, quantidade, valor_unitario, valor_total}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON public.orcamentos USING btree (cliente_nome);
CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON public.orcamentos USING btree (numero);
CREATE INDEX IF NOT EXISTS idx_orcamentos_ano_seq ON public.orcamentos USING btree (ano, sequencial DESC);

-- 4. Habilitar Row Level Security (RLS) e Políticas de Acesso
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- Liberar acesso total para a chave pública anon do app
DROP POLICY IF EXISTS "Permitir acesso completo aos orçamentos" ON public.orcamentos;
CREATE POLICY "Permitir acesso completo aos orçamentos" ON public.orcamentos
    FOR ALL
    USING (true)
    WITH CHECK (true);
