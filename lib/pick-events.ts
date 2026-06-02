import { getSupabaseServerClient } from "@/lib/supabase/server";

type PickEventInput =
  | { kind: "champion_pick"; userDisplayName: string; teamName: string }
  | {
      kind: "match_pick";
      userDisplayName: string;
      matchId: string;
      allocations: unknown;
    };

export async function logPickEvent(event: PickEventInput) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const row: Record<string, unknown> = {
    kind: event.kind,
    user_display_name: event.userDisplayName,
  };

  if (event.kind === "champion_pick") {
    row.team_name = event.teamName;
  } else {
    row.match_id = event.matchId;
    row.allocations = event.allocations;
  }

  const { error } = await supabase.from("pick_events").insert(row as never);
  if (error) {
    console.error("[pick-events] insert failed", error);
  }
}
