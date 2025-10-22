-- Migration 008: Group Chat
-- Add support for real-time group chat functionality

-- Create group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  reply_to UUID REFERENCES group_messages(id) ON DELETE SET NULL,

  -- Indexes for performance
  CONSTRAINT group_messages_message_not_empty CHECK (length(trim(message)) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_user_id ON group_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_reply_to ON group_messages(reply_to);

-- Row Level Security
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages from groups they're members of
CREATE POLICY "Users can read messages from their groups"
  ON group_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- Users can insert messages to groups they're members of
CREATE POLICY "Users can send messages to their groups"
  ON group_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON group_messages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON group_messages
  FOR DELETE
  USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_group_messages_updated_at
  BEFORE UPDATE ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_group_messages_updated_at();

-- Add last_message_at to groups table for sorting
ALTER TABLE groups ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- Create function to update last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_group_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups
  SET last_message_at = NEW.created_at
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_group_last_message
  AFTER INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_group_last_message();

-- Add message count to groups for quick access
ALTER TABLE groups ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Create function to update message count
CREATE OR REPLACE FUNCTION update_group_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET message_count = message_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET message_count = message_count - 1 WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_group_message_count
  AFTER INSERT OR DELETE ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_group_message_count();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON group_messages TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE group_messages IS 'Stores real-time chat messages within groups';
COMMENT ON COLUMN group_messages.reply_to IS 'Optional reference to another message (for threading/replies)';
COMMENT ON COLUMN group_messages.is_edited IS 'Indicates if the message has been edited after creation';
