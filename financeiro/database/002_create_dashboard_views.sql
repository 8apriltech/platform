-- ==============================================================================
-- PLATAFORMA 8APRIL - MÓDULO COMERCIAL / FINANCEIRO
-- Migration 002: Views do Dashboard (Supabase / PostgreSQL)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_comercial_dashboard_kpis AS
SELECT 
    c.tenant_id,
    COALESCE(SUM(c.valor_total), 0) AS total_valor_contratado,
    COUNT(DISTINCT c.id) AS qtd_contratos_total,
    COUNT(DISTINCT CASE WHEN c.status IN ('Ativo', 'Em execução') THEN c.id END) AS qtd_contratos_ativos,
    COALESCE(SUM(p.valor_pago), 0) AS total_valor_recebido,
    COALESCE(SUM(CASE WHEN p.status IN ('Pendente', 'Parcial', 'Vencido') THEN (p.valor - p.valor_pago) ELSE 0 END), 0) AS total_valor_em_aberto,
    COALESCE(SUM(CASE WHEN p.status = 'Vencido' THEN (p.valor - p.valor_pago) ELSE 0 END), 0) AS total_valor_vencido
FROM public.contratos c
LEFT JOIN public.parcelas p ON c.id = p.contrato_id AND p.status != 'Cancelado'
GROUP BY c.tenant_id;
