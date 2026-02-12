/**
 * Meta Messaging / Page Insights - conversations started
 * Optional: set META_PAGE_ID to get conversation metrics for that page.
 */

const BASE = "https://graph.facebook.com/v21.0";

export function getPageId(): string | null {
  return process.env.META_PAGE_ID ?? null;
}

/**
 * Fetch "page_messages_started_conversations" or similar for a given day.
 * Requires META_PAGE_ID and a Page Access Token (or user token with pages_show_list, pages_read_engagement, read_insights).
 */
export async function fetchConversationsStartedForDay(
  date: string
): Promise<number> {
  const pageId = getPageId();
  if (!pageId) return 0;

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return 0;

  const since = `${date}T00:00:00`;
  const until = `${date}T23:59:59`;
  const params = new URLSearchParams({
    metric: "page_messages_started_conversations",
    since,
    until,
    access_token: token,
  });
  const url = `${BASE}/${pageId}/insights?${params}`;
  const res = await fetch(url);
  if (!res.ok) return 0;

  const data = (await res.json()) as {
    data?: Array< { values?: Array<{ value: string }> } >;
  };
  const values = data.data?.[0]?.values;
  if (!values?.length) return 0;
  return values.reduce((sum, v) => sum + (parseInt(v.value, 10) || 0), 0);
}
