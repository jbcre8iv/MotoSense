# MotoSense Database Schema

## Overview
Backend infrastructure using **Supabase** (PostgreSQL + Real-time + Auth)

---

## Tables

### 1. **users** (Supabase Auth handles this)
Extended with custom profile data via `profiles` table

### 2. **profiles**
User profile data synced from local app
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  total_predictions INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) DEFAULT 0,
  racing_iq_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  favorite_riders TEXT[], -- Array of rider IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. **groups**
Competition groups/leagues
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE, -- 6-character code for invites
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching public groups
CREATE INDEX idx_groups_public ON groups(is_public) WHERE is_public = true;
CREATE INDEX idx_groups_invite_code ON groups(invite_code);
```

### 4. **group_members**
Group membership
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
```

### 5. **competitions**
Seasons (Supercross, Motocross, SMX Playoffs)
```sql
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- "2025 Supercross"
  series TEXT NOT NULL, -- 'supercross', 'motocross', 'smx'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'active', 'completed'
  scoring_rules JSONB, -- Custom scoring configuration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_dates ON competitions(start_date, end_date);
```

### 6. **races**
Individual races within competitions
```sql
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Anaheim 1"
  round INTEGER NOT NULL,
  track_name TEXT NOT NULL,
  track_city TEXT,
  track_state TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  race_date TIMESTAMPTZ NOT NULL,
  race_type TEXT DEFAULT 'main', -- 'practice', 'qualifying', 'heat', 'main'
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'live', 'completed'

  -- Weather data (can be updated as race approaches)
  weather JSONB,

  -- Results (populated after race)
  results JSONB, -- Array of {riderId, position, dnf}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(competition_id, round)
);

CREATE INDEX idx_races_competition ON races(competition_id);
CREATE INDEX idx_races_date ON races(race_date);
CREATE INDEX idx_races_status ON races(status);
```

### 7. **predictions**
User predictions for races
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  predictions JSONB NOT NULL, -- [{riderId, predictedPosition}]
  confidence_score INTEGER, -- Optional 1-100
  points_earned INTEGER DEFAULT 0, -- Calculated after race completes
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, race_id) -- One prediction per race per user
);

CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_race ON predictions(race_id);
CREATE INDEX idx_predictions_user_race ON predictions(user_id, race_id);
```

### 8. **group_competitions**
Link groups to competitions (groups can join multiple seasons)
```sql
CREATE TABLE group_competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, competition_id)
);

CREATE INDEX idx_group_competitions_group ON group_competitions(group_id);
CREATE INDEX idx_group_competitions_comp ON group_competitions(competition_id);
```

### 9. **leaderboards**
Materialized view for fast leaderboard queries
```sql
CREATE MATERIALIZED VIEW leaderboards AS
SELECT
  gc.group_id,
  gc.competition_id,
  p.user_id,
  prof.username,
  prof.display_name,
  prof.avatar_url,
  COUNT(pred.id) as total_predictions,
  COALESCE(SUM(pred.points_earned), 0) as total_points,
  COALESCE(AVG(pred.points_earned), 0) as avg_points,
  MAX(pred.submitted_at) as last_prediction_at
FROM group_competitions gc
JOIN group_members gm ON gm.group_id = gc.group_id
JOIN profiles p ON p.id = gm.user_id
LEFT JOIN predictions pred ON pred.user_id = p.user_id
LEFT JOIN races r ON r.id = pred.race_id AND r.competition_id = gc.competition_id
LEFT JOIN profiles prof ON prof.id = p.user_id
GROUP BY gc.group_id, gc.competition_id, p.user_id, prof.username, prof.display_name, prof.avatar_url;

CREATE INDEX idx_leaderboards_group_comp ON leaderboards(group_id, competition_id);

-- Refresh function to update leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboards;
END;
$$ LANGUAGE plpgsql;
```

### 10. **chat_messages**
Real-time group chat
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'system', 'prediction_share'
  metadata JSONB, -- For rich messages (predictions, achievements, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

CREATE INDEX idx_chat_group ON chat_messages(group_id, created_at DESC);
CREATE INDEX idx_chat_user ON chat_messages(user_id);
```

### 11. **group_invites**
Track pending invites
```sql
CREATE TABLE group_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES profiles(id),
  email TEXT,
  user_id UUID REFERENCES profiles(id), -- If inviting existing user
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invites_group ON group_invites(group_id);
CREATE INDEX idx_invites_email ON group_invites(email);
CREATE INDEX idx_invites_user ON group_invites(user_id);
```

### 12. **achievements**
Cloud-synced achievements
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tier TEXT, -- 'bronze', 'silver', 'gold', 'platinum'
  category TEXT, -- 'predictions', 'accuracy', 'streaks', 'special'
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER NOT NULL,
  is_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  reward_points INTEGER DEFAULT 0,

  UNIQUE(user_id, achievement_type)
);

CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_achievements_unlocked ON achievements(user_id, is_unlocked);
```

---

## Row Level Security (RLS) Policies

### Profiles
```sql
-- Users can read all profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

### Groups
```sql
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public groups viewable by everyone" ON groups FOR SELECT USING (is_public = true);
CREATE POLICY "Private groups viewable by members" ON groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid())
);
CREATE POLICY "Owners can update groups" ON groups FOR UPDATE USING (owner_id = auth.uid());
```

### Chat Messages
```sql
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by group members" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = chat_messages.group_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert messages in their groups" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = chat_messages.group_id AND user_id = auth.uid())
);
```

---

## Real-time Subscriptions

### Chat
```typescript
// Subscribe to new messages in a group
supabase
  .channel(`chat:${groupId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` },
    (payload) => {
      // New message received
      handleNewMessage(payload.new);
    }
  )
  .subscribe();
```

### Leaderboard Updates
```typescript
// Subscribe to leaderboard changes
supabase
  .channel(`leaderboard:${groupId}:${competitionId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'predictions' },
    () => {
      // Refresh leaderboard
      refreshLeaderboard();
    }
  )
  .subscribe();
```

---

## API Functions (Supabase Edge Functions)

### 1. `calculate-prediction-score`
Called after race results are posted
```typescript
// Calculate points based on prediction accuracy
// Update predictions.points_earned
// Trigger leaderboard refresh
```

### 2. `generate-invite-code`
Create unique 6-character invite code
```typescript
// Generate code like "MX24AB"
// Check for uniqueness
// Return code
```

### 3. `scrape-race-schedule` (Future)
Automated schedule scraping
```typescript
// Scrape SuperMotocross website
// Parse schedule data
// Create/update races and competitions
// Notify groups of new races
```

---

## Migration Strategy

### Phase 1: Core Tables
1. profiles
2. groups
3. group_members
4. chat_messages

### Phase 2: Competition System
5. competitions
6. races
7. predictions
8. group_competitions

### Phase 3: Leaderboards & Social
9. leaderboards (materialized view)
10. achievements
11. group_invites

---

## Next Steps
1. Create Supabase project
2. Run migrations to create tables
3. Set up RLS policies
4. Install Supabase client in React Native
5. Build authentication flow
6. Implement features incrementally
