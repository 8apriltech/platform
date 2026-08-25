-- ==============================================================================
-- PLATAFORMA 8APRIL - MÓDULO COMERCIAL / FINANCEIRO
-- Migration 003: Function & Trigger para Recálculo Automático
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_recalcular_status_parcela()
RETURNS TRIGGER AS $$
DECLARE
    v_parcela_id UUID;
    v_valor_total NUMERIC(15,2);
    v_total_recebido NUMERIC(15,2);
    v_vencimento DATE;
    v_novo_status status_parcela_enum;
BEGIN
    v_parcela_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.parcela_id ELSE NEW.parcela_id END;

    SELECT valor, vencimento INTO v_valor_total, v_vencimento
    FROM public.parcelas WHERE id = v_parcela_id;

    IF v_valor_total IS NULL THEN RETURN NULL; END IF;

    SELECT COALESCE(SUM(valor), 0.00) INTO v_total_recebido
    FROM public.recebimentos WHERE parcela_id = v_parcela_id;

    IF v_total_recebido >= v_valor_total THEN
        v_novo_status := 'Pago';
    ELSIF v_total_recebido > 0 THEN
        v_novo_status := 'Parcial';
    ELSIF v_vencimento < CURRENT_DATE THEN
        v_novo_status := 'Vencido';
    ELSE
        v_novo_status := 'Pendente';
    END IF;

    UPDATE public.parcelas
    SET valor_pago = v_total_recebido, status = v_novo_status
    WHERE id = v_parcela_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recebimentos_recalculo ON public.recebimentos;
CREATE TRIGGER trg_recebimentos_recalculo
AFTER INSERT OR UPDATE OR DELETE ON public.recebimentos
FOR EACH ROW EXECUTE FUNCTION public.fn_recalcular_status_parcela();
