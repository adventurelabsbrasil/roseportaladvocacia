/**
 * Run Meta Ads history sync from 2025-08-01 until yesterday.
 * Loads .env.local and runs the same logic as POST /api/sync/meta/history.
 * Usage: npm run sync-history (from project root)
 */
import path from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { runHistorySync } from "../lib/marketing/run-history-sync";

config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_SINCE = "2025-08-01";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const urlDisplay = url.replace(/^https:\/\//, "").split(".")[0];
  console.log(`Supabase: ${urlDisplay}.supabase.co (confira se é o mesmo projeto do dashboard)\n`);

  const since = process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2])
    ? process.argv[2]
    : DEFAULT_SINCE;

  console.log(`Syncing Meta Ads history from ${since} until yesterday (por mês)...\n`);

  const output = await runHistorySync(supabase, {
    since,
    delayBetweenChunksMs: 800,
    onChunk(chunkSince, chunkUntil, ok, error, result) {
      if (ok) {
        const detail = result ? ` (${result.ad_rows} linhas Meta → ${result.metrics_upserted} em daily_metrics)` : "";
        console.log(`OK ${chunkSince} a ${chunkUntil}${detail}`);
      } else {
        console.log(`ERRO ${chunkSince} a ${chunkUntil}: ${error ?? "unknown"}`);
      }
    },
  });

  console.log("\n--- Resumo ---");
  console.log(`Período: ${output.since} a ${output.until}`);
  console.log(`Lotes (meses): ${output.chunks_total}`);
  console.log(`Sucesso: ${output.success}`);
  console.log(`Com erro: ${output.errors}`);
}

main().catch((e) => {
  if (e instanceof Error && e.message === "META_ACCESS_TOKEN_EXPIRED") {
    console.error("\n--- Token da Meta expirado ---\n");
    console.error("O META_ACCESS_TOKEN no .env.local expirou. A Meta encerra sessões após um tempo.");
    console.error("Para corrigir:");
    console.error("  1. Acesse o Meta for Developers (developers.facebook.com) ou o Gerenciador de Negócios.");
    console.error("  2. Gere um novo token de acesso com permissões: ads_read, ads_management, business_management.");
    console.error("  3. Atualize a variável META_ACCESS_TOKEN no arquivo .env.local.");
    console.error("  4. Rode novamente: npm run sync-history\n");
  } else if (e instanceof Error && e.message === "META_AD_ACCOUNT_PERMISSION") {
    console.error("\n--- Permissão na conta de anúncios ---\n");
    console.error("O dono da conta de anúncios ainda não concedeu ads_read/ads_management ao app ou ao System User.");
    console.error("Para corrigir:");
    console.error("  1. Acesse business.facebook.com → Configurações do negócio.");
    console.error("  2. Usuários → Usuários do sistema → clique no System User que gera o token.");
    console.error("  3. Aba Contas de anúncios → Adicionar → selecione a conta (META_AD_ACCOUNT_ID) → Acesso total.");
    console.error("  4. Rode novamente: npm run sync-history\n");
  } else {
    console.error(e);
  }
  process.exit(1);
});
