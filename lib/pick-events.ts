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

  const row =
    event.kind === "champion_pick"
      ? {
          kind: event.kind,
          user_display_name: event.userDisplayName,
          team_name: event.teamName,
        }
      : {
          kind: event.kind,
          user_display_name: event.userDisplayName,
          match_id: event.matchId,
          allocations: event.allocations,
        };

  const { error } = await supabase.from("pick_events").insert(row);
  if (error) {
    console.error("[pick-events] insert failed", error);
  }
}
