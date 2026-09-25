export type PersonDepthRow = {
  id: string;
  display_name: string;
  relation: string;
  birth_precision: "none" | "exact" | "date" | "year";
  is_minor: boolean;
  is_self?: boolean;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_lat?: number | null;
  birth_lng?: number | null;
  tz_offset_min?: number | null;
  passed_at?: string | null;
  died_on?: string | null;
  star_color?: string | null;
  memorial_constellation?: string | null;
  custom_position?: { angle: number; radius_pct: number } | null;
  star_scale?: number | null;
  linked_user_id?: string | null;
  exclude_from_dailies?: boolean | null;
};

export const PERSON_DEPTH_SELECT =
  "id, display_name, relation, birth_precision, is_minor, is_self, birth_date, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min, passed_at, died_on, star_color, memorial_constellation, custom_position, star_scale, linked_user_id, exclude_from_dailies";
