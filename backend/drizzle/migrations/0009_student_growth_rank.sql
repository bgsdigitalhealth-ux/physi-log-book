CREATE OR REPLACE FUNCTION public.student_growth_stats()
RETURNS TABLE(avg_pct numeric, certified integer, rank integer, total_students integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH student_scores AS (
    SELECT s.student_id,
           AVG(s.marks::numeric / NULLIF(s.max_marks, 0) * 100) AS pct,
           COUNT(*) AS cert
    FROM public.submissions s
    WHERE s.status = 'approved' AND s.marks IS NOT NULL
    GROUP BY s.student_id
  ),
  ranked AS (
    SELECT student_id, pct, cert,
           RANK() OVER (ORDER BY pct DESC, cert DESC) AS rnk
    FROM student_scores
  )
  SELECT COALESCE(r.pct, 0)::numeric,
         COALESCE(r.cert, 0)::integer,
         COALESCE(r.rnk, (SELECT COUNT(*) FROM student_scores) + 1)::integer,
         GREATEST((SELECT COUNT(*) FROM student_scores), 1)::integer
  FROM (SELECT 1) AS x
  LEFT JOIN ranked r ON r.student_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.student_growth_stats() TO authenticated;