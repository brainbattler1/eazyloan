/*
  # Create notification system functions

  1. Functions
    - `get_user_notifications` - Retrieves notifications for a specific user
    - `get_active_system_messages` - Retrieves active system messages for user role
    - `create_notification` - Creates a new notification
    - `create_system_message` - Creates a new system message
    - `mark_notification_read` - Marks a notification as read
    - `mark_all_notifications_read` - Marks all notifications as read for a user
    - `get_user_role` - Gets the role of a user

  2. Tables
    - `notifications` - User-specific notifications
    - `system_messages` - System-wide messages

  3. Security
    - Enable RLS on both tables
    - Add appropriate policies for CRUD operations
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  read boolean DEFAULT false,
  read_at timestamptz,
  action_url text,
  action_label text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system_messages table
CREATE TABLE IF NOT EXISTS system_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'maintenance')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  target_audience text DEFAULT 'all' CHECK (target_audience IN ('all', 'users', 'admins', 'super_admins')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_system_messages_active ON system_messages(is_active);
CREATE INDEX IF NOT EXISTS idx_system_messages_target_audience ON system_messages(target_audience);
CREATE INDEX IF NOT EXISTS idx_system_messages_expires_at ON system_messages(expires_at);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role = 'super_admin'
  );
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(check_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(role, 'user') 
  FROM user_roles 
  WHERE user_id = check_user_id;
$$;

-- Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_target_user_id uuid,
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
LANGUAGE sql
SECURITY DEFINER
AS $$
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
  WHERE n.user_id = p_target_user_id
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
$$;

-- Function to get active system messages
CREATE OR REPLACE FUNCTION get_active_system_messages(p_user_role text DEFAULT 'user')
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  type text,
  priority text,
  target_audience text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    sm.id,
    sm.title,
    sm.content,
    sm.type,
    sm.priority,
    sm.target_audience,
    sm.created_at,
    sm.expires_at
  FROM system_messages sm
  WHERE sm.is_active = true
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
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    action_url,
    action_label,
    expires_at
  ) VALUES (
    target_user_id,
    notification_title,
    notification_message,
    notification_type,
    notification_priority,
    notification_action_url,
    notification_action_label,
    notification_expires_at
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
BEGIN
  INSERT INTO system_messages (
    title,
    content,
    type,
    priority,
    target_audience,
    created_by,
    expires_at
  ) VALUES (
    message_title,
    message_content,
    message_type,
    message_priority,
    message_target_audience,
    auth.uid(),
    message_expires_at
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
BEGIN
  UPDATE notifications 
  SET read = true, read_at = now(), updated_at = now()
  WHERE id = notification_id 
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET read = true, read_at = now(), updated_at = now()
  WHERE user_id = target_user_id 
    AND user_id = auth.uid()
    AND read = false;
  
  RETURN FOUND;
END;
$$;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for system_messages
CREATE POLICY "Everyone can view active system messages"
  ON system_messages
  FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage system messages"
  ON system_messages
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_messages_updated_at
  BEFORE UPDATE ON system_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();