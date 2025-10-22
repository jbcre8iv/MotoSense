-- Fix RLS policies to avoid infinite recursion
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "Users can view public groups" ON groups;
DROP POLICY IF EXISTS "Group members can view their membership" ON group_members;
DROP POLICY IF EXISTS "Group members can view other members" ON group_members;

-- Create simplified policies without recursion
-- Groups policies
CREATE POLICY "Anyone can view public groups"
  ON groups FOR SELECT
  USING (is_public = true);

CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id
      FROM group_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their groups"
  ON groups FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their groups"
  ON groups FOR DELETE
  USING (auth.uid() = owner_id);

-- Group members policies (simplified to avoid recursion)
CREATE POLICY "Anyone can view group members"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Group owners can manage members"
  ON group_members FOR DELETE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
    )
  );
