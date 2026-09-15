import { createClient } from "@supabase/supabase-js";
import type { Conversion } from "../converter";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase environment is not configured.");
  return createClient(url, key);
}
export async function listConversions(): Promise<Conversion[]> {
  const client = db();
  const { data, error } = await client.from("conversions").select("*, passengers(name,type), flight_segments(airline,flight_number,origin,destination,departure_at,arrival_at,cabin), hotel_segments(hotel_name,check_in,check_out,nights,room_type)").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).map(row => ({ ...row, flights: row.flight_segments || [], hotels: row.hotel_segments || [], passengers: row.passengers || [] }));
}
export async function getConversion(id: string): Promise<Conversion> {
  const client = db();
  const { data, error } = await client.from("conversions").select("*, passengers(name,type), flight_segments(airline,flight_number,origin,destination,departure_at,arrival_at,cabin), hotel_segments(hotel_name,check_in,check_out,nights,room_type)").eq("id", id).single();
  if (error) throw error;
  return { ...data, flights: data.flight_segments || [], hotels: data.hotel_segments || [], passengers: data.passengers || [] };
}
export async function saveConversion(c: Conversion): Promise<Conversion> {
  const client = db();
  const { passengers, flights, hotels, id, created_at, ...fields } = c;
  void created_at;
  const query = id ? client.from("conversions").update(fields).eq("id", id) : client.from("conversions").insert(fields);
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  const conversionId = data.id as string;
  if (id) {
    for (const table of ["passengers", "flight_segments", "hotel_segments"]) {
      const deleted = await client.from(table).delete().eq("conversion_id", conversionId);
      if (deleted.error) throw deleted.error;
    }
  }
  for (const [table, values] of [["passengers", passengers], ["flight_segments", flights], ["hotel_segments", hotels]] as const) {
    if (values.length) {
      const inserted = await client.from(table).insert(values.map(value => ({ ...value, conversion_id: conversionId })));
      if (inserted.error) throw inserted.error;
    }
  }
  return getConversion(conversionId);
}
export async function deleteConversion(id: string): Promise<void> {
  const { error } = await db().from("conversions").delete().eq("id", id);
  if (error) throw error;
}
