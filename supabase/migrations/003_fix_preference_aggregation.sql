-- Migration: Fix preference aggregation to handle arrays correctly
-- The aggregation function was creating nested arrays when values were already arrays

-- Drop and recreate the aggregation function
DROP FUNCTION IF EXISTS aggregate_party_preferences(UUID);

CREATE OR REPLACE FUNCTION aggregate_party_preferences(party_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  aggregated JSONB := '{}'::jsonb;
BEGIN
  -- Combine all member preferences
  -- Flatten arrays properly to avoid nested arrays
  SELECT jsonb_object_agg(key, value)
  INTO aggregated
  FROM (
    SELECT 
      key,
      -- Collect all individual string values (flattening arrays)
      jsonb_agg(DISTINCT elem::text ORDER BY elem::text) FILTER (WHERE elem IS NOT NULL) as value
    FROM party_members pm,
    LATERAL jsonb_each(pm.preferences) AS pref(key, val),
    LATERAL (
      -- If value is an array, expand it; if it's a string, use it directly
      SELECT jsonb_array_elements_text(val) AS elem
      WHERE jsonb_typeof(val) = 'array'
      UNION ALL
      SELECT val::text AS elem
      WHERE jsonb_typeof(val) != 'array' AND val IS NOT NULL AND val != 'null'::jsonb
    ) AS expanded
    WHERE pm.party_id = party_uuid
    AND pm.status = 'active'
    AND pm.has_submitted_preferences = true
    GROUP BY key
  ) sub;
  
  RETURN COALESCE(aggregated, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

