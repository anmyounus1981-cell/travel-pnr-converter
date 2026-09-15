import { createClient } from "../supabase/server";
import type { Conversion } from "../converter";

export async function listConversions(userId: string): Promise<Conversion[]> {
  const client = await createClient();
  const { data, error } = await client.from("conversions").select("*, passengers(name,type), flight_segments(airline,flight_number,origin,destination,departure_at,arrival_at,cabin), hotel_segments(hotel_name,check_in,check_out,nights,room_type)").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).map(({ flight_segments, hotel_segments, ...row }) => ({ ...row, flights: flight_segments || [], hotels: hotel_segments || [], passengers: row.passengers || [] }));
}
export async function getConversion(id: string, userId: string): Promise<Conversion> {
  const client = await createClient();
  const { data, error } = await client.from("conversions").select("*, passengers(name,type), flight_segments(airline,flight_number,origin,destination,departure_at,arrival_at,cabin), hotel_segments(hotel_name,check_in,check_out,nights,room_type)").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Conversion not found.");
  const { flight_segments, hotel_segments, ...row } = data;
  return { ...row, flights: flight_segments || [], hotels: hotel_segments || [], passengers: row.passengers || [] };
}
export async function saveConversion(c: Conversion, userId: string): Promise<Conversion> {
  const client = await createClient();
  const { passengers, flights, hotels, id, created_at, user_id, ...fields } = c as Conversion & { user_id?: string };
  void created_at;
  void user_id;
  const owned = { ...fields, user_id: userId };
  const query = id ? client.from("conversions").update(owned).eq("id", id).eq("user_id", userId) : client.from("conversions").insert(owned);
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  const conversionId = data.id as string;
  if (id) {
    for (const table of ["passengers", "flight_segments", "hotel_segments"]) {
      const deleted = await client.from(table).delete().eq("conversion_id", conversionId).eq("user_id", userId);
      if (deleted.error) throw deleted.error;
    }
  }
  for (const [table, values] of [["passengers", passengers], ["flight_segments", flights], ["hotel_segments", hotels]] as const) {
    if (values.length) {
      const inserted = await client.from(table).insert(values.map(value => ({ ...value, conversion_id: conversionId, user_id: userId })));
      if (inserted.error) throw inserted.error;
    }
  }
  return getConversion(conversionId, userId);
}
export async function deleteConversion(id: string, userId: string): Promise<void> {
  const { error } = await (await createClient()).from("conversions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
