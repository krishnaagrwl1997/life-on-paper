import type { SupabaseClient } from "@supabase/supabase-js";

/** The local-first memory graph that gets synced for multi-device continuity. */
export type CloudGraph = {
  decisions?: unknown;
  notToday?: string[];
  careDismissed?: string[];
  monthlyShown?: string;
  weaves?: unknown;
};

export async function loadCloudGraph(client: SupabaseClient, ownerId: string): Promise<CloudGraph | null> {
  const { data, error } = await client.rpc("load_my_graph", { p_owner_id: ownerId });
  if (error) return null;
  return (data as CloudGraph) ?? null;
}

export async function saveCloudGraph(client: SupabaseClient, ownerId: string, graph: CloudGraph): Promise<void> {
  await client.rpc("save_my_graph", { p_owner_id: ownerId, p_payload: graph });
}
