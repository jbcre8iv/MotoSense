-- Add DELETE policy for predictions table
-- This allows users to delete their own predictions

CREATE POLICY "Users can delete own predictions"
  ON predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'DELETE policy for predictions table added successfully!';
END $$;
