-- Missing Admin Functions Migration
-- This migration adds functions that are called by the AdminPanel but missing from the initial schema

-- =====================================================
-- MISSING ADMIN FUNCTIONS
-- =====================================================

-- Function to get maintenance status
CREATE OR REPLACE FUNCTION get_maintenance_status()
RETURNS TABLE (
  id uuid,
  is_enabled boolean,
  message text,
  enabled_by uuid,
  enabled_at timestamptz,
  disabled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.is_enabled,
    m.message,
    m.enabled_by,
    m.enabled_at,
    m.disabled_at
  FROM maintenance_mode m
  ORDER BY m.enabled_at DESC
  LIMIT 1;
END;
$$;

-- Function to get admin statistics
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_loans bigint,
  pending_loans bigint,
  approved_loans bigint,
  rejected_loans bigint,
  total_users bigint,
  active_users bigint,
  total_tickets bigint,
  open_tickets bigint,
  total_referrals bigint,
  completed_referrals bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM loan_applications)::bigint as total_loans,
    (SELECT COUNT(*) FROM loan_applications WHERE status = 'pending')::bigint as pending_loans,
    (SELECT COUNT(*) FROM loan_applications WHERE status = 'approved')::bigint as approved_loans,
    (SELECT COUNT(*) FROM loan_applications WHERE status = 'rejected')::bigint as rejected_loans,
    (SELECT COUNT(*) FROM user_profiles)::bigint as total_users,
    (SELECT COUNT(*) FROM user_profiles WHERE is_active = true)::bigint as active_users,
    (SELECT COUNT(*) FROM support_tickets)::bigint as total_tickets,
    (SELECT COUNT(*) FROM support_tickets WHERE status = 'open')::bigint as open_tickets,
    (SELECT COUNT(*) FROM referrals)::bigint as total_referrals,
    (SELECT COUNT(*) FROM referrals WHERE status = 'completed')::bigint as completed_referrals;
END;
$$;

-- Function to update loan status with notification
CREATE OR REPLACE FUNCTION update_loan_status(
  loan_id uuid,
  new_status text,
  admin_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  loan_record RECORD;
  notification_title text;
  notification_message text;
BEGIN
  -- Get loan details
  SELECT * INTO loan_record FROM loan_applications WHERE id = loan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan application not found';
  END IF;
  
  -- Update loan status
  UPDATE loan_applications 
  SET status = new_status, updated_at = now()
  WHERE id = loan_id;
  
  -- Create notification based on status
  CASE new_status
    WHEN 'approved' THEN
      notification_title := '🎉 Loan Approved!';
      notification_message := 'Congratulations! Your loan application for $' || loan_record.amount || ' has been approved.';
    WHEN 'rejected' THEN
      notification_title := '❌ Loan Application Update';
      notification_message := 'We regret to inform you that your loan application for $' || loan_record.amount || ' has been declined.';
    WHEN 'under_review' THEN
      notification_title := '🔍 Application Under Review';
      notification_message := 'Your loan application for $' || loan_record.amount || ' is currently under review.';
    ELSE
      notification_title := '📋 Loan Status Update';
      notification_message := 'Your loan application status has been updated to: ' || new_status;
  END CASE;
  
  -- Insert notification
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    created_by,
    metadata
  ) VALUES (
    loan_record.user_id,
    notification_title,
    notification_message,
    CASE new_status WHEN 'approved' THEN 'success' WHEN 'rejected' THEN 'error' ELSE 'info' END,
    CASE new_status WHEN 'approved' THEN 'high' WHEN 'rejected' THEN 'high' ELSE 'medium' END,
    admin_user_id,
    jsonb_build_object(
      'loan_id', loan_id,
      'loan_amount', loan_record.amount,
      'previous_status', loan_record.status,
      'new_status', new_status
    )
  );
  
  -- Log admin action if admin_user_id is provided
  IF admin_user_id IS NOT NULL THEN
    PERFORM log_admin_action(
      CASE new_status WHEN 'approved' THEN 'loan_approval' WHEN 'rejected' THEN 'loan_rejection' ELSE 'status_update' END,
      'loan_application',
      admin_user_id,
      jsonb_build_object(
        'loan_id', loan_id,
        'previous_status', loan_record.status,
        'new_status', new_status,
        'loan_amount', loan_record.amount
      )
    );
  END IF;
END;
$$;

-- Function to assign user role with logging
CREATE OR REPLACE FUNCTION assign_user_role(
  target_user_id uuid,
  new_role text,
  admin_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  previous_role text;
BEGIN
  -- Validate role
  IF new_role NOT IN ('user', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Get previous role
  SELECT role INTO previous_role FROM user_roles WHERE user_id = target_user_id;
  
  -- Upsert role
  INSERT INTO user_roles (user_id, role, updated_at)
  VALUES (target_user_id, new_role, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;
  
  -- Log admin action if admin_user_id is provided
  IF admin_user_id IS NOT NULL THEN
    PERFORM log_admin_action(
      'role_assignment',
      'user',
      admin_user_id,
      jsonb_build_object(
        'target_user_id', target_user_id,
        'previous_role', COALESCE(previous_role, 'none'),
        'new_role', new_role
      )
    );
  END IF;
END;
$$;

-- Function to toggle maintenance mode
CREATE OR REPLACE FUNCTION toggle_maintenance_mode(
  enable_maintenance boolean,
  maintenance_message text DEFAULT NULL,
  admin_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF enable_maintenance THEN
    -- Enable maintenance mode
    INSERT INTO maintenance_mode (is_enabled, message, enabled_by, enabled_at)
    VALUES (true, COALESCE(maintenance_message, 'The application is currently under maintenance. Please check back later.'), admin_user_id, now())
    ON CONFLICT (id) DO UPDATE SET
      is_enabled = true,
      message = COALESCE(maintenance_message, 'The application is currently under maintenance. Please check back later.'),
      enabled_by = admin_user_id,
      enabled_at = now(),
      disabled_at = NULL;
  ELSE
    -- Disable maintenance mode
    UPDATE maintenance_mode 
    SET 
      is_enabled = false,
      disabled_at = now()
    WHERE is_enabled = true;
  END IF;
  
  -- Log admin action if admin_user_id is provided
  IF admin_user_id IS NOT NULL THEN
    PERFORM log_admin_action(
      'system_config',
      'system',
      admin_user_id,
      jsonb_build_object(
        'action', CASE WHEN enable_maintenance THEN 'enable_maintenance' ELSE 'disable_maintenance' END,
        'message', maintenance_message
      )
    );
  END IF;
END;
$$;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  total_loans bigint,
  active_loans bigint,
  total_referrals bigint,
  successful_referrals bigint,
  last_login timestamptz,
  account_created timestamptz,
  is_active boolean,
  user_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    (SELECT COUNT(*) FROM loan_applications la WHERE la.user_id = target_user_id)::bigint as total_loans,
    (SELECT COUNT(*) FROM loan_applications la WHERE la.user_id = target_user_id AND la.status IN ('pending', 'under_review', 'approved'))::bigint as active_loans,
    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = target_user_id)::bigint as total_referrals,
    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = target_user_id AND r.status = 'completed')::bigint as successful_referrals,
    au.last_sign_in_at as last_login,
    up.created_at as account_created,
    up.is_active,
    COALESCE(ur.role, 'user') as user_role
  FROM user_profiles up
  LEFT JOIN user_roles ur ON ur.user_id = up.user_id
  LEFT JOIN auth.users au ON au.id = up.user_id
  WHERE up.user_id = target_user_id;
END;
$$;

-- Function to generate referral code (enhanced version)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE referral_code = code) INTO exists_check;
    
    -- If code doesn't exist, return it
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_maintenance_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_loan_status(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_maintenance_mode(boolean, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;

-- Grant to service role for admin operations
GRANT EXECUTE ON FUNCTION get_maintenance_status() TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO service_role;
GRANT EXECUTE ON FUNCTION update_loan_status(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION assign_user_role(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION toggle_maintenance_mode(boolean, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION generate_referral_code() TO service_role;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Missing admin functions migration completed successfully!';
  RAISE NOTICE 'Added functions:';
  RAISE NOTICE '- get_maintenance_status()';
  RAISE NOTICE '- get_admin_stats()';
  RAISE NOTICE '- update_loan_status(uuid, text, uuid)';
  RAISE NOTICE '- assign_user_role(uuid, text, uuid)';
  RAISE NOTICE '- toggle_maintenance_mode(boolean, text, uuid)';
  RAISE NOTICE '- get_user_activity_summary(uuid)';
  RAISE NOTICE '- generate_referral_code() [enhanced]';
END $$;