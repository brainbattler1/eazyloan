-- Migration: Create create_support_ticket function for support tickets

CREATE OR REPLACE FUNCTION create_support_ticket(
  ticket_subject text,
  ticket_description text,
  ticket_category text DEFAULT 'general',
  ticket_priority text DEFAULT 'medium'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subject text,
  description text,
  category text,
  priority text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_ticket_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  INSERT INTO support_tickets (
    user_id,
    subject,
    description,
    category,
    priority,
    status,
    created_at
  ) VALUES (
    v_user_id,
    ticket_subject,
    ticket_description,
    ticket_category,
    ticket_priority,
    'open',
    now()
  )
  RETURNING support_tickets.id INTO v_ticket_id;

  RETURN QUERY
  SELECT 
    st.id,
    st.user_id,
    st.subject,
    st.description,
    st.category,
    st.priority,
    st.status,
    st.created_at
  FROM support_tickets st
  WHERE st.id = v_ticket_id;
END;
$$; 