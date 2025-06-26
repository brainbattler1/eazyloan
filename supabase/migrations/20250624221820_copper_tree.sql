/*
  # Fix Notification System Migration

  1. Database Structure
    - Create notifications table with proper constraints
    - Create system_messages table for broadcasts
    - Create notification_preferences table for user settings
    - Add comprehensive indexes for performance

  2. Security
    - Enable RLS on all tables
    - Create proper policies for data access
    - Add admin permission functions

  3. Functions
    - get_user_notifications: Fetch user notifications
    - get_active_system_messages: Fetch system messages
    - create_notification: Create individual notifications
    - create_system_message: Create system broadcasts
    - mark_notification_read: Mark notifications as read
    - mark_all_notifications_read: Mark all as read
    - send_bulk_notification: Send to multiple users

  4. Real-time Features
    - Automatic loan status notifications via triggers
    - Cleanup functions for expired notifications
*/

-- Drop existing notification system completely to avoid conflicts
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_messages CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Drop all notification-related functions
DROP FUNCTION IF EXISTS get_user_notifications(uuid, boolean, integer) CASCADE;
DROP FUNCTION IF EXISTS get_active_system_messages(text) CASCADE;
DROP FUNCTION IF EXISTS create_notification(uuid, text, text, text, text, text, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS create_system_message(text, text, text, text, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS send_bulk_notification(uuid[], text, text, text, text, text, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_notifications() CASCADE;
DROP FUNCTION IF EXISTS get_notification_count(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS create_user_notification_preferences(uuid) CASCADE;
DROP FUNCTION IF EXISTS initialize_user_notification_preferences() CASCADE;

-- Drop helper functions with unique names
DROP FUNCTION IF EXISTS is_notification_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_notification_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_admin_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin_user(uuid) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS loan_status_notification_trigger ON loan_applications;
DROP TRIGGER IF EXISTS initialize_notification_preferences_trigger ON auth.users;

-- Drop the trigger function
DROP FUNCTION IF EXISTS create_loan_status_notification() CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  
  CONSTRAINT valid_notification_types 
    CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'loan_update', 'system', 'security')),
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
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  
  CONSTRAINT valid_system_message_types 
    CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'maintenance', 'security')),
  CONSTRAINT valid_system_message_priorities 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_target_audiences 
    CHECK (target_audience IN ('all', 'users', 'admins', 'super_admins'))
);

-- Create notification_preferences table
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  loan_updates boolean DEFAULT true,
  system_announcements boolean DEFAULT true,
  security_alerts boolean DEFAULT true,
  marketing boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create performance indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

CREATE INDEX idx_system_messages_active ON system_messages(active);
CREATE INDEX idx_system_messages_target_audience ON system_messages(target_audience);
CREATE INDEX idx_system_messages_created_at ON system_messages(created_at DESC);
CREATE INDEX idx_system_messages_expires_at ON system_messages(expires_at);
CREATE INDEX idx_system_messages_active_audience ON system_messages(active, target_audience) WHERE active = true;

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Helper function to check if user is admin (with unique name to avoid conflicts)
CREATE OR REPLACE FUNCTION check_notification_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE 
    WHEN check_user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = check_user_id 
      AND role IN ('admin', 'super_admin')
    ) THEN true
    ELSE false
  END;
$$;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION check_notification_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE 
    WHEN check_user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = check_user_id 
      AND role = 'super_admin'
    ) THEN true
    ELSE false
  END;
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
  created_at timestamptz,
  metadata jsonb
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
  IF final_user_id != current_user_id AND NOT check_notification_admin(current_user_id) THEN
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
    n.created_at,
    n.metadata
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
  expires_at timestamptz,
  metadata jsonb
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
    sm.expires_at,
    sm.metadata
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
  notification_expires_at timestamptz DEFAULT NULL,
  notification_metadata jsonb DEFAULT '{}'
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
  IF current_user_id IS NOT NULL AND NOT check_notification_admin(current_user_id) THEN
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
    created_by,
    metadata
  ) VALUES (
    target_user_id,
    notification_title,
    notification_message,
    notification_type,
    notification_priority,
    notification_action_url,
    notification_action_label,
    notification_expires_at,
    current_user_id,
    notification_metadata
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
  message_expires_at timestamptz DEFAULT NULL,
  message_metadata jsonb DEFAULT '{}'
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
  IF NOT check_notification_admin(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Only admins can create system messages';
  END IF;
  
  INSERT INTO system_messages (
    title,
    message,
    type,
    priority,
    target_audience,
    expires_at,
    created_by,
    metadata
  ) VALUES (
    message_title,
    message_content,
    message_type,
    message_priority,
    message_target_audience,
    message_expires_at,
    current_user_id,
    message_metadata
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
  notification_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Get the notification's user_id
  SELECT user_id INTO notification_user_id 
  FROM notifications 
  WHERE id = notification_id;
  
  -- Check if notification exists
  IF notification_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update notification if user owns it or is admin
  UPDATE notifications 
  SET read = true, read_at = now(), updated_at = now()
  WHERE id = notification_id 
    AND (user_id = current_user_id OR check_notification_admin(current_user_id));
  
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
  IF final_user_id != current_user_id AND NOT check_notification_admin(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Cannot mark notifications for other users';
  END IF;
  
  UPDATE notifications 
  SET read = true, read_at = now(), updated_at = now()
  WHERE user_id = final_user_id 
    AND read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to send bulk notifications
CREATE OR REPLACE FUNCTION send_bulk_notification(
  user_ids uuid[],
  notification_title text,
  notification_message text,
  notification_type text DEFAULT 'info',
  notification_priority text DEFAULT 'medium',
  notification_action_url text DEFAULT NULL,
  notification_action_label text DEFAULT NULL,
  notification_expires_at timestamptz DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  inserted_count integer := 0;
  user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT check_notification_admin(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Only admins can send bulk notifications';
  END IF;
  
  -- Insert notifications for each user
  FOREACH user_id IN ARRAY user_ids
  LOOP
    BEGIN
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
        user_id,
        notification_title,
        notification_message,
        notification_type,
        notification_priority,
        notification_action_url,
        notification_action_label,
        notification_expires_at,
        current_user_id
      );
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip invalid users
      CONTINUE;
    END;
  END LOOP;
  
  RETURN inserted_count;
END;
$$;

-- Function to get notification count
CREATE OR REPLACE FUNCTION get_notification_count(
  target_user_id uuid DEFAULT NULL,
  unread_only boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  final_user_id uuid;
  current_user_id uuid;
  notification_count integer;
BEGIN
  current_user_id := auth.uid();
  final_user_id := COALESCE(target_user_id, current_user_id);
  
  IF final_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Check permissions
  IF final_user_id != current_user_id AND NOT check_notification_admin(current_user_id) THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*)::integer INTO notification_count
  FROM notifications
  WHERE user_id = final_user_id
    AND (NOT unread_only OR read = false)
    AND (expires_at IS NULL OR expires_at > now());
  
  RETURN notification_count;
END;
$$;

-- Function to clean up expired notifications
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
  SET active = false, updated_at = now()
  WHERE expires_at IS NOT NULL 
    AND expires_at < now()
    AND active = true;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
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
  USING (check_notification_admin(auth.uid()));

CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Function handles authorization

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
  USING (check_notification_admin(auth.uid()));

-- RLS Policies for system_messages
CREATE POLICY "Everyone can view active system messages"
  ON system_messages
  FOR SELECT
  TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage system messages"
  ON system_messages
  FOR ALL
  TO authenticated
  USING (check_notification_admin(auth.uid()))
  WITH CHECK (check_notification_admin(auth.uid()));

CREATE POLICY "Super admins can delete system messages"
  ON system_messages
  FOR DELETE
  TO authenticated
  USING (check_notification_super_admin(auth.uid()));

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own preferences"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (check_notification_admin(auth.uid()));

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
  notification_metadata jsonb;
BEGIN
  -- Only create notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Prepare metadata
    notification_metadata := jsonb_build_object(
      'loan_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'amount', NEW.amount,
      'application_date', NEW.created_at,
      'source', 'system_trigger'
    );
    
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
      created_by,
      metadata
    ) VALUES (
      NEW.user_id,
      notification_title,
      notification_message,
      notification_type,
      notification_priority,
      '/applications',
      'View Application',
      NULL, -- System generated
      notification_metadata
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

-- Insert sample system messages for testing
INSERT INTO system_messages (title, message, type, priority, target_audience, created_by, metadata) VALUES
('Welcome to EazyLoan!', 'Thank you for joining EazyLoan. We are here to help you with all your financial needs.', 'success', 'low', 'all', NULL, '{"category": "welcome", "auto_generated": true}'),
('System Maintenance Notice', 'We will be performing scheduled maintenance tonight from 2:00 AM to 4:00 AM. Some services may be temporarily unavailable.', 'warning', 'medium', 'all', NULL, '{"category": "maintenance", "scheduled_time": "2024-06-25T02:00:00Z"}'),
('New Features Available!', 'We have released new features to improve your loan application experience. Check them out in your dashboard!', 'announcement', 'medium', 'all', NULL, '{"category": "feature_release", "version": "2.1.0"}'),
('Security Update Required', 'For your security, please update your password. We recommend using a strong, unique password.', 'security', 'high', 'all', NULL, '{"category": "security", "action_required": true}');