-- Fix for PGRST202 errors: Create the missing exec_sql function
-- This function is needed for various database operations in the application

-- Create the exec_sql function
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Verify the function was created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'exec_sql' AND routine_schema = 'public';

-- Test the function
SELECT public.exec_sql('SELECT 1') AS test_result;

COMMENT ON FUNCTION public.exec_sql(text) IS 'Utility function to execute dynamic SQL statements';