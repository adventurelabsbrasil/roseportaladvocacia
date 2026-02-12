import type { SupabaseClient } from "@supabase/supabase-js";
import { syncMetaForRange } from "@/lib/marketing/sync-meta-range";
import { getYesterday, monthlyChunks } from "@/lib/date";

const CHANNEL_ID = "meta_ads";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type HistorySyncResult = {
  since: string;
  until: string;
  ok: boolean;
  error?: string;
};

export type RunHistorySyncOptions = {
  since: string;
  delayBetweenChunksMs?: number;
  onChunk?: (
    since: string,
    until: string,
    ok: boolean,
    error?: string,
    result?: { ad_rows: number; metrics_upserted: number }
  ) => void;
};

export type RunHistorySyncOutput = {
  since: string;
  until: string;
  chunks_total: number;
  success: number;
  errors: number;
  details: HistorySyncResult[];
};

/**
 * Delete yesterday's metrics for the channel, then sync from since until yesterday (inclusive)
 * in monthly chunks. One Meta Insights request per month + per-day conversation calls with delay.
 * Faster and within Meta rate limits.
 */
export async function runHistorySync(
  supabase: SupabaseClient,
  options: RunHistorySyncOptions
): Promise<RunHistorySyncOutput> {
  const { since, delayBetweenChunksMs = 800, onChunk } = options;
  const yesterday = getYesterday();

  await supabase
    .from("daily_metrics")
    .delete()
    .eq("channel_id", CHANNEL_ID)
    .eq("date", yesterday);

  const chunks = monthlyChunks(since, yesterday);
  const results: HistorySyncResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const { since: chunkSince, until: chunkUntil } = chunks[i];
    try {
      const result = await syncMetaForRange(supabase, chunkSince, chunkUntil);
      results.push({ since: chunkSince, until: chunkUntil, ok: true });
      onChunk?.(chunkSince, chunkUntil, true, undefined, {
        ad_rows: result.ad_rows,
        metrics_upserted: result.metrics_upserted,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ since: chunkSince, until: chunkUntil, ok: false, error: message });
      onChunk?.(chunkSince, chunkUntil, false, message);
      // Token expirado: só code 190 ou mensagens explícitas de sessão/token inválido
      if (
        message.includes("Session has expired") ||
        message.includes("Error validating access token") ||
        /"code":190/.test(message)
      ) {
        const err = new Error("META_ACCESS_TOKEN_EXPIRED");
        (err as Error & { metaMessage?: string }).metaMessage = message;
        throw err;
      }
      // Permissão na conta de anúncios: dono não concedeu ads_read/ads_management ao app/System User
      if (message.includes("has NOT grant ads_management or ads_read") || /"code":200/.test(message)) {
        const err = new Error("META_AD_ACCOUNT_PERMISSION");
        (err as Error & { metaMessage?: string }).metaMessage = message;
        throw err;
      }
    }
    if (i < chunks.length - 1) await delay(delayBetweenChunksMs);
  }

  const okCount = results.filter((r) => r.ok).length;
  const errCount = results.filter((r) => !r.ok).length;

  return {
    since,
    until: yesterday,
    chunks_total: chunks.length,
    success: okCount,
    errors: errCount,
    details: results,
  };
}
