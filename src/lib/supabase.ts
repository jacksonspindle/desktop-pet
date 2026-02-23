import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PetRow {
  id: string;
  pet_code: string;
  name: string;
  breed: string;
  color: string;
  online: boolean;
  last_seen: string;
}

export interface FriendshipRow {
  id: string;
  pet_id: string;
  friend_id: string;
  created_at: string;
}

export interface VisitRow {
  id: string;
  from_pet_id: string;
  to_pet_id: string;
  message: string;
  breed: string;
  color: string;
  name: string;
  created_at: string;
  consumed: boolean;
}

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generatePetCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}
