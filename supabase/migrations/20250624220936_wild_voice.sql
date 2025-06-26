-- Fix notification system migration with proper dependency handling

-- First, drop the trigger that depends on the function
DROP TRIGGER IF EXISTS loan_status_notification_trigger ON loan_applications;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS create_loan_status_notification();

-- Drop other notification-specific functions
DROP FUNCTION IF EXISTS get_user_notifications(uuid, boolean, integer);
DROP FUNCTION IF EXISTS get_active_system_messages(text);
DROP FUNCTION IF EXISTS create_notification(uuid, text, text, text, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS create_system_message(text, text, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS mark_notification_read(uuid);
DROP FUNCTION IF EXISTS mark_all_notifications_read(uuid);
DROP FUNCTION IF EXISTS cleanup_expired_notifications();

-- Drop existing notification tables
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_messages CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'medium',
  read boolean DEFAULT false,
  read_at timestamptz,
  action_url text,
  action_label text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_notification_types 
    CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'loan_update', 'system')),
  CONSTRAINT valid_notification_priorities 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Create system_messages table
CREATE TABLE system_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'medium',
  target_audience text NOT NULL DEFAULT 'all',
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_system_message_types 
    CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'maintenance')),
  CONSTRAINT valid_system_message_priorities 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_target_audiences 
    CHECK (target_audience IN ('all', 'users', 'admins', 'super_admins'))
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

-- Create performance indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);

CREATE INDEX idx_system_messages_active ON system_messages(active);
CREATE INDEX idx_system_messages_target_audience ON system_messages(target_audience);
CREATE INDEX idx_system_messages_created_at ON system_messages(created_at DESC);
CREATE INDEX idx_system_messages_expires_at ON system_messages(expires_at);

-- Helper function to check if user is admin (use unique name to avoid conflicts)
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = check_user_id 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Helper function to check if user is super admin (use unique name to avoid conflicts)
CREATE OR REPLACE FUNCTION is_super_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = check_user_id 
    AND role = 'super_admin'
  );
$$;

-- Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_target_user_id uuid DEFAULT NULL,
  p_include_read boolean DEFAULT true,
  p_limit_count integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  type text,
  priority text,
  read boolean,
  read_at timestamptz,
  action_url text,
  action_label text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  final_user_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Use provided user_id or current authenticated user
  final_user_id := COALESCE(p_target_user_id, current_user_id);
  
  -- If no user ID available, return empty result
  IF final_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user can access these notifications
  IF final_user_id != current_user_id AND (current_user_id IS NULL OR NOT is_admin_user(current_user_id)) THEN
    RAISE EXCEPTION 'Access denied: Cannot view notifications for other users';
  END IF;
  
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.read,
    n.read_at,
    n.action_url,
    n.action_label,
    n.expires_at,
    n.created_at
  FROM notifications n
  WHERE n.user_id = final_user_id
    AND (p_include_read = true OR n.read = false)
    AND (n.expires_at IS NULL OR n.expires_at > now())
  ORDER BY 
    CASE n.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    n.created_at DESC
  LIMIT p_limit_count;
END;
$$;

-- Function to get active system messages
CREATE OR REPLACE FUNCTION get_active_system_messages(p_user_role text DEFAULT 'user')
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  type text,
  priority text,
  target_audience text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.title,
    sm.message,
    sm.type,
    sm.priority,
    sm.target_audience,
    sm.created_at,
    sm.expires_at
  FROM system_messages sm
  WHERE sm.active = true
    AND (sm.expires_at IS NULL OR sm.expires_at > now())
    AND (
      sm.target_audience = 'all' OR
      (sm.target_audience = 'users' AND p_user_role IN ('user', 'admin', 'super_admin')) OR
      (sm.target_audience = 'admins' AND p_user_role IN ('admin', 'super_admin')) OR
      (sm.target_audience = 'super_admins' AND p_user_role = 'super_admin')
    )
  ORDER BY 
    CASE sm.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    sm.created_at DESC;
END;
$$;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id uuid,
  notification_title text,
  notification_message text,
  notification_type text DEFAULT 'info',
  notification_priority text DEFAULT 'medium',
  notification_action_url text DEFAULT NULL,
  notification_action_label text DEFAULT NULL,
  notification_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_notification_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is admin (for manual notifications) or allow system calls (when current_user_id is NULL)
  IF current_user_id IS NOT NULL AND NOT is_admin_user(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Only admins can create notifications';
  END IF;
  
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    action_url,
    action_label,
    expires_at,
    created_by
  ) VALUES (
    target_user_id,
    notification_title,
    notification_message,
    notification_type,
    notification_priority,
    notification_action_url,
    notification_action_label,
    notification_expires_at,
    current_user_id
  ) RETURNING id INTO new_notification_id;
  
  RETURN new_notification_id;
END;
$$;

-- Function to create system message
CREATE OR REPLACE FUNCTION create_system_message(
  message_title text,
  message_content text,
  message_type text DEFAULT 'info',
  message_priority text DEFAULT 'medium',
  message_target_audience text DEFAULT 'all',
  message_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_message_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is admin
  IF current_user_id IS NULL OR NOT is_admin_user(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Only admins can create system messages';
  END IF;
  
  INSERT INTO system_messages (
    title,
    message,
    type,
    priority,
    target_audience,
    expires_at,
    created_by
  ) VALUES (
    message_title,
    message_content,
    message_type,
    message_priority,
    message_target_audience,
    message_expires_at,
    current_user_id
  ) RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  UPDATE notifications 
  SET read = true, read_at = now()
  WHERE id = notification_id 
    AND (user_id = current_user_id OR (current_user_id IS NOT NULL AND is_admin_user(current_user_id)));
  
  RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  final_user_id uuid;
  updated_count integer;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Use provided user_id or current authenticated user
  final_user_id := COALESCE(target_user_id, current_user_id);
  
  -- If no user ID available, return 0
  IF final_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Check if user can mark these notifications
  IF final_user_id != current_user_id AND (current_user_id IS NULL OR NOT is_admin_user(current_user_id)) THEN
    RAISE EXCEPTION 'Access denied: Cannot mark notifications for other users';
  END IF;
  
  UPDATE notifications 
  SET read = true, read_at = now()
  WHERE user_id = final_user_id 
    AND read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- RLS Policies for system_messages
CREATE POLICY "Everyone can view active system messages"
  ON system_messages
  FOR SELECT
  TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can insert system messages"
  ON system_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update system messages"
  ON system_messages
  FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Super admins can delete system messages"
  ON system_messages
  FOR DELETE
  TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- Function to automatically create loan status notifications
CREATE OR REPLACE FUNCTION create_loan_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_title text;
  notification_message text;
  notification_type text;
  notification_priority text;
BEGIN
  -- Only create notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'approved' THEN
        notification_title := 'Loan Application Approved! 🎉';
        notification_message := 'Congratulations! Your loan application for ' || 
          COALESCE(to_char(NEW.amount, 'FM$999,999,999'), 'N/A') || 
          ' has been approved. Funds will be disbursed shortly.';
        notification_type := 'success';
        notification_priority := 'high';
      WHEN 'rejected' THEN
        notification_title := 'Loan Application Update';
        notification_message := 'Your loan application for ' || 
          COALESCE(to_char(NEW.amount, 'FM$999,999,999'), 'N/A') || 
          ' has been reviewed. Please contact support for more information.';
        notification_type := 'warning';
        notification_priority := 'medium';
      WHEN 'under_review' THEN
        notification_title := 'Application Under Review';
        notification_message := 'Your loan application is now under review. We will notify you once the review is complete.';
        notification_type := 'info';
        notification_priority := 'medium';
      ELSE
        RETURN NEW; -- No notification for other status changes
    END CASE;
    
    -- Create the notification (bypass admin check for system triggers)
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      action_label,
      created_by
    ) VALUES (
      NEW.user_id,
      notification_title,
      notification_message,
      notification_type,
      notification_priority,
      '/applications',
      'View Application',
      NULL -- System generated
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic loan status notifications
CREATE TRIGGER loan_status_notification_trigger
  AFTER UPDATE ON loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_loan_status_notification();

-- Function to clean up expired notifications and messages
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer := 0;
  temp_count integer;
BEGIN
  -- Clean up expired notifications
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < now();
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Clean up expired system messages
  UPDATE system_messages 
  SET active = false
  WHERE expires_at IS NOT NULL 
    AND expires_at < now()
    AND active = true;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$;

-- Insert sample system messages for testing
INSERT INTO system_messages (title, message, type, priority, target_audience, created_by) VALUES
('Welcome to EazyLoan!', 'Thank you for joining EazyLoan. We are here to help you with all your financial needs.', 'success', 'low', 'all', NULL),
('System Maintenance Notice', 'We will be performing scheduled maintenance tonight from 2:00 AM to 4:00 AM. Some services may be temporarily unavailable.', 'warning', 'medium', 'all', NULL),
('New Features Available!', 'We have released new features to improve your loan application experience. Check them out in your dashboard!', 'announcement', 'medium', 'all', NULL);