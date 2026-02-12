import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("channels")
      .select("id, name")
      .eq("enabled", true)
      .order("name");
    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? []);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load channels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
