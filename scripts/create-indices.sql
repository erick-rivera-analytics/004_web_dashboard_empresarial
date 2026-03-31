-- ============================================================
-- STRATEGIC DATABASE INDICES
-- ============================================================
-- Execute in DBeaver against datalakehouse (10.0.2.70:5432)
-- Safe to run multiple times (IF NOT EXISTS)
-- To rollback: see DROP statements at the bottom
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FENOGRAMA (materialized view: gld.mv_prod_fenograma_cur)
-- Used by: /api/fenograma/pivot, /api/fenograma/block/*
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fenograma_parent_block
  ON gld.mv_prod_fenograma_cur(parent_block);

CREATE INDEX IF NOT EXISTS idx_fenograma_cycle_area
  ON gld.mv_prod_fenograma_cur(cycle_key, area);

CREATE INDEX IF NOT EXISTS idx_fenograma_sp_date
  ON gld.mv_prod_fenograma_cur(sp_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_fenograma_iso_week
  ON gld.mv_prod_fenograma_cur(iso_week_id);

-- ────────────────────────────────────────────────────────────
-- MORTALITY / KARDEX
-- Used by: /api/mortality, /api/mortality/curve
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_kardex_cycle
  ON gld.mv_camp_kardex_cycle_plants_cur(cycle_key, valid_from DESC);

-- ────────────────────────────────────────────────────────────
-- PROFILES (SCD2 tables — slow changing dimensions)
-- Used by: fenograma drill-down, mortality drill-down
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cycle_profile_key
  ON slv.camp_dim_cycle_profile_scd2(cycle_key, valid_from DESC);

CREATE INDEX IF NOT EXISTS idx_block_profile_current
  ON slv.camp_dim_block_profile_scd2(parent_block, is_current, valid_from DESC);

CREATE INDEX IF NOT EXISTS idx_bed_profile_cycle
  ON slv.camp_dim_bed_profile_scd2(cycle_key);

CREATE INDEX IF NOT EXISTS idx_valve_profile_cycle
  ON slv.camp_dim_valve_profile_scd2(cycle_key);

-- ────────────────────────────────────────────────────────────
-- PROGRAMACIONES (activity schedules)
-- Used by: /api/programaciones
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vegetativo_activity_date
  ON mdl.prod_ref_vegetativo_subset_scd2(activity_code, event_date);

CREATE INDEX IF NOT EXISTS idx_vegetativo_cycle_activity
  ON mdl.prod_ref_vegetativo_subset_scd2(cycle_key, activity_code);

-- ────────────────────────────────────────────────────────────
-- USERS (authentication)
-- Used by: login validation
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_username
  ON public.users(username);

-- ============================================================
-- VERIFY: Check that indices were created
-- ============================================================
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY schemaname, tablename, indexname;

-- ============================================================
-- ROLLBACK (uncomment to remove all indices)
-- ============================================================
-- DROP INDEX IF EXISTS gld.idx_fenograma_parent_block;
-- DROP INDEX IF EXISTS gld.idx_fenograma_cycle_area;
-- DROP INDEX IF EXISTS gld.idx_fenograma_sp_date;
-- DROP INDEX IF EXISTS gld.idx_fenograma_iso_week;
-- DROP INDEX IF EXISTS gld.idx_kardex_cycle;
-- DROP INDEX IF EXISTS slv.idx_cycle_profile_key;
-- DROP INDEX IF EXISTS slv.idx_block_profile_current;
-- DROP INDEX IF EXISTS slv.idx_bed_profile_cycle;
-- DROP INDEX IF EXISTS slv.idx_valve_profile_cycle;
-- DROP INDEX IF EXISTS mdl.idx_vegetativo_activity_date;
-- DROP INDEX IF EXISTS mdl.idx_vegetativo_cycle_activity;
-- DROP INDEX IF EXISTS public.idx_users_username;
