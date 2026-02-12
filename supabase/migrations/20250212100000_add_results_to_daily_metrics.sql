-- Métrica principal: Resultados (mensagem iniciada / conversa ou resultados do objetivo da campanha)
ALTER TABLE daily_metrics
ADD COLUMN IF NOT EXISTS results INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN daily_metrics.results IS 'Resultados do objetivo (ex.: mensagem iniciada, conversa, lead) vindo do Meta Ads Insights';
