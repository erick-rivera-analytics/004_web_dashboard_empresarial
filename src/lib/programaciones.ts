import { query } from "@/lib/db";
import { cachedAsync } from "@/lib/server-cache";

// ── Constants ─────────────────────────────────────────────────────────────────

const PROG_TTL_MS = 5 * 60 * 1000; // 5 min

export const ACTIVITY_CODES = ["SPMC", "ILUMINACION"] as const;
export type ActivityCode = (typeof ACTIVITY_CODES)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

type ProgramacionQueryRow = {
  block_id: string | null;
  cycle_key: string | null;
  event_date: string | null;
  activity_code: string | null;
  variety: string | null;
  sp_type: string | null;
  fase: string | null;
  area_id: string | null;
};

export type ProgramacionRecord = {
  blockId: string;
  cycleKey: string;
  eventDate: string;         // "YYYY-MM-DD"
  activityCode: ActivityCode;
  variety: string | null;
  spType: string | null;
  fase: string | null;       // "Planificado" | "Activo" | "Historia"
  areaId: string | null;
};

// ── Query ─────────────────────────────────────────────────────────────────────

export async function getProgramaciones(
  dateFrom: string,
  dateTo: string,
): Promise<ProgramacionRecord[]> {
  const cacheKey = `programaciones:${dateFrom}:${dateTo}`;

  return cachedAsync(cacheKey, PROG_TTL_MS, async () => {
    const result = await query<ProgramacionQueryRow>(
      `
        select
          nullif(trim(v.block_id), '')  as block_id,
          nullif(trim(v.cycle_key), '') as cycle_key,
          to_char(v.event_date, 'YYYY-MM-DD') as event_date,
          v.activity_code,
          nullif(trim(cp.variety), '')  as variety,
          nullif(trim(cp.sp_type), '')  as sp_type,
          case
            when cp.pruning_date >= current_date then 'Planificado'
            when coalesce(cp.harvest_end_date, cp.harvest_start_date, cp.pruning_date) >= current_date
              then 'Activo'
            else 'Historia'
          end as fase,
          area_info.area_id
        from mdl.prod_ref_vegetativo_subset_scd2 v
        left join lateral (
          select
            cp2.variety,
            cp2.sp_type,
            cp2.parent_block,
            cp2.pruning_date,
            cp2.harvest_start_date,
            cp2.harvest_end_date
          from slv.camp_dim_cycle_profile_scd2 cp2
          where cp2.cycle_key = v.cycle_key
          order by cp2.valid_from desc nulls last
          limit 1
        ) cp on true
        left join lateral (
          select nullif(trim(bp.area_id), '') as area_id
          from slv.camp_dim_block_profile_scd2 bp
          where bp.parent_block = cp.parent_block
            and bp.is_current = true
          order by bp.valid_from desc nulls last
          limit 1
        ) area_info on true
        where v.activity_code = any($1::text[])
          and v.event_date >= $2::date
          and v.event_date <= $3::date
          and nullif(trim(v.block_id), '') is not null
        order by v.event_date asc, v.block_id asc
      `,
      [ACTIVITY_CODES as unknown as string[], dateFrom, dateTo],
    );

    return result.rows
      .filter(
        (row): row is ProgramacionQueryRow & { block_id: string; cycle_key: string; event_date: string } =>
          Boolean(row.block_id && row.cycle_key && row.event_date),
      )
      .map((row) => ({
        blockId: row.block_id,
        cycleKey: row.cycle_key,
        eventDate: row.event_date,
        activityCode: (row.activity_code ?? "SMPC") as ActivityCode,
        variety: row.variety ?? null,
        spType: row.sp_type ?? null,
        fase: row.fase ?? null,
        areaId: row.area_id ?? null,
      }));
  });
}
