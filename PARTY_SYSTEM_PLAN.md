# Party System Database Schema & Architecture Plan

## Overview
Transform the single-user movie preference app into a multi-user party system where friends can join via a shareable link and collaboratively rate movies together.

## Database Schema

### 1. `parties` Table
Stores party/group information.

```sql
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "movie-night-2024")
  name TEXT, -- Optional party name
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'collecting_preferences', 'swiping', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Party settings
  max_members INTEGER DEFAULT 10,
  min_members INTEGER DEFAULT 1,
  
  -- Aggregated preferences (stored as JSONB for flexibility)
  aggregated_preferences JSONB, -- Combined preferences from all members
  
  -- Generated movies (stored as JSONB array)
  movies JSONB, -- Array of 10 movies with their initial data
  
  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb -- Additional settings (e.g., voting rules)
);
```

**Indexes:**
- `CREATE INDEX idx_parties_slug ON parties(slug);`
- `CREATE INDEX idx_parties_created_by ON parties(created_by);`
- `CREATE INDEX idx_parties_status ON parties(status);`

**Realtime:** Enable for `status`, `movies`, `aggregated_preferences` updates

---

### 2. `party_members` Table
Many-to-many relationship between users and parties.

```sql
CREATE TABLE party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('host', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
  
  -- User's individual preferences for this party
  preferences JSONB, -- User's preferences (genres, era, etc.)
  spotify_urls TEXT[], -- User's Spotify URLs
  
  -- Progress tracking
  has_submitted_preferences BOOLEAN DEFAULT FALSE,
  has_completed_swiping BOOLEAN DEFAULT FALSE,
  swipes_completed INTEGER DEFAULT 0,
  
  UNIQUE(party_id, user_id)
);
```

**Indexes:**
- `CREATE INDEX idx_party_members_party_id ON party_members(party_id);`
- `CREATE INDEX idx_party_members_user_id ON party_members(user_id);`
- `CREATE INDEX idx_party_members_status ON party_members(status);`

**Realtime:** Enable for member join/leave events, preference submissions, swipe progress

---

### 3. `party_movies` Table
Stores the 10 movies for each party with aggregated ELO ratings.

```sql
CREATE TABLE party_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL, -- Internal movie ID (e.g., "m1", "m2")
  title TEXT NOT NULL,
  genres TEXT[] NOT NULL,
  expected_score NUMERIC(3,2) NOT NULL CHECK (expected_score >= 0 AND expected_score <= 1),
  
  -- Aggregated ELO rating (updated as users swipe)
  elo_rating NUMERIC(6,2) DEFAULT 1200.0,
  
  -- Statistics
  total_swipes INTEGER DEFAULT 0,
  right_swipes INTEGER DEFAULT 0,
  left_swipes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(party_id, movie_id)
);
```

**Indexes:**
- `CREATE INDEX idx_party_movies_party_id ON party_movies(party_id);`
- `CREATE INDEX idx_party_movies_elo ON party_movies(party_id, elo_rating DESC);`

**Realtime:** Enable for `elo_rating`, `total_swipes`, `right_swipes`, `left_swipes` updates

---

### 4. `user_swipes` Table
Tracks individual user swipes on movies within a party.

```sql
CREATE TABLE user_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL, -- References party_movies.movie_id
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  elo_change NUMERIC(6,2), -- ELO change from this swipe (for audit)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(party_id, user_id, movie_id) -- One swipe per user per movie
);
```

**Indexes:**
- `CREATE INDEX idx_user_swipes_party_user ON user_swipes(party_id, user_id);`
- `CREATE INDEX idx_user_swipes_party_movie ON user_swipes(party_id, movie_id);`

**Realtime:** Enable for new swipe events (to show live activity)

---

## Row Level Security (RLS) Policies

### `parties` Table
```sql
-- Anyone can read parties (for joining via slug)
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view parties"
  ON parties FOR SELECT
  USING (true);

-- Only authenticated users can create parties
CREATE POLICY "Users can create parties"
  ON parties FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only party creator can update
CREATE POLICY "Creators can update parties"
  ON parties FOR UPDATE
  USING (auth.uid() = created_by);
```

### `party_members` Table
```sql
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;

-- Members can view their party memberships
CREATE POLICY "Users can view their party memberships"
  ON party_members FOR SELECT
  USING (auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM party_members pm 
                 WHERE pm.party_id = party_members.party_id 
                 AND pm.user_id = auth.uid()));

-- Users can join parties (insert themselves)
CREATE POLICY "Users can join parties"
  ON party_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership
CREATE POLICY "Users can update their own membership"
  ON party_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Hosts can update any member in their party
CREATE POLICY "Hosts can update members"
  ON party_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.party_id = party_members.party_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'host'
    )
  );
```

### `party_movies` Table
```sql
ALTER TABLE party_movies ENABLE ROW LEVEL SECURITY;

-- Party members can view movies
CREATE POLICY "Party members can view movies"
  ON party_movies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.party_id = party_movies.party_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
    )
  );
```

### `user_swipes` Table
```sql
ALTER TABLE user_swipes ENABLE ROW LEVEL SECURITY;

-- Users can view their own swipes
CREATE POLICY "Users can view their swipes"
  ON user_swipes FOR SELECT
  USING (auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM party_members pm 
                 WHERE pm.party_id = user_swipes.party_id 
                 AND pm.user_id = auth.uid()));

-- Users can create their own swipes
CREATE POLICY "Users can create their swipes"
  ON user_swipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Supabase Realtime Subscriptions

### 1. Party Status Updates
```typescript
// Subscribe to party status changes
supabase
  .channel(`party:${partyId}`)
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'parties', filter: `id=eq.${partyId}` },
    (payload) => {
      // Handle status changes (waiting → collecting_preferences → swiping → completed)
      console.log('Party status updated:', payload.new);
    }
  )
  .subscribe();
```

### 2. Member Join/Leave Events
```typescript
// Subscribe to member changes
supabase
  .channel(`party:${partyId}:members`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'party_members', filter: `party_id=eq.${partyId}` },
    (payload) => {
      // Handle member join/leave/update
      if (payload.eventType === 'INSERT') {
        console.log('New member joined:', payload.new);
      } else if (payload.eventType === 'DELETE') {
        console.log('Member left:', payload.old);
      }
    }
  )
  .subscribe();
```

### 3. Live Movie Rating Updates
```typescript
// Subscribe to ELO rating changes
supabase
  .channel(`party:${partyId}:movies`)
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'party_movies', filter: `party_id=eq.${partyId}` },
    (payload) => {
      // Update movie ratings in real-time
      console.log('Movie rating updated:', payload.new);
    }
  )
  .subscribe();
```

### 4. Live Swipe Activity
```typescript
// Subscribe to new swipes (optional - for showing "X just swiped" notifications)
supabase
  .channel(`party:${partyId}:swipes`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'user_swipes', filter: `party_id=eq.${partyId}` },
    (payload) => {
      // Show live activity feed
      console.log('New swipe:', payload.new);
    }
  )
  .subscribe();
```

---

## Database Functions & Triggers

### 1. Update `updated_at` Timestamp
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parties_updated_at
  BEFORE UPDATE ON parties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_party_movies_updated_at
  BEFORE UPDATE ON party_movies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Aggregate Party Preferences Function
```sql
CREATE OR REPLACE FUNCTION aggregate_party_preferences(party_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  aggregated JSONB := '{}'::jsonb;
BEGIN
  -- Combine all member preferences
  SELECT jsonb_object_agg(key, value)
  INTO aggregated
  FROM (
    SELECT 
      key,
      jsonb_agg(DISTINCT value) FILTER (WHERE value IS NOT NULL) as value
    FROM party_members pm,
    LATERAL jsonb_each(pm.preferences)
    WHERE pm.party_id = party_uuid
    AND pm.status = 'active'
    AND pm.has_submitted_preferences = true
    GROUP BY key
  ) sub;
  
  RETURN aggregated;
END;
$$ LANGUAGE plpgsql;
```

### 3. Update Movie ELO After Swipe
```sql
CREATE OR REPLACE FUNCTION update_movie_elo_after_swipe()
RETURNS TRIGGER AS $$
DECLARE
  movie_record RECORD;
  k_factor NUMERIC := 32;
  actual_score NUMERIC;
  expected_score NUMERIC;
  elo_change NUMERIC;
  new_elo NUMERIC;
BEGIN
  -- Get movie details
  SELECT * INTO movie_record
  FROM party_movies
  WHERE party_id = NEW.party_id AND movie_id = NEW.movie_id;
  
  -- Calculate ELO change
  actual_score := CASE WHEN NEW.direction = 'right' THEN 1.0 ELSE 0.0 END;
  expected_score := movie_record.expected_score;
  elo_change := k_factor * (actual_score - expected_score);
  new_elo := movie_record.elo_rating + elo_change;
  
  -- Update movie ELO and statistics
  UPDATE party_movies
  SET 
    elo_rating = new_elo,
    total_swipes = total_swipes + 1,
    right_swipes = right_swipes + CASE WHEN NEW.direction = 'right' THEN 1 ELSE 0 END,
    left_swipes = left_swipes + CASE WHEN NEW.direction = 'left' THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE party_id = NEW.party_id AND movie_id = NEW.movie_id;
  
  -- Store ELO change in swipe record
  NEW.elo_change := elo_change;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_movie_elo
  BEFORE INSERT ON user_swipes
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_elo_after_swipe();
```

---

## Project Structure Recommendations

```
app/
  party/
    [slug]/
      page.tsx              # Main party page (handles routing based on status)
      loading.tsx
      error.tsx
    create/
      page.tsx              # Create new party
    join/
      page.tsx              # Join party via slug (redirects to [slug])
  
  api/
    party/
      route.ts              # POST: create party, GET: get party by slug
      [slug]/
        route.ts            # GET: party details, PUT: update party
        members/
          route.ts          # GET: list members, POST: join party
        preferences/
          route.ts          # POST: submit preferences, GET: aggregated preferences
        movies/
          route.ts          # GET: party movies, POST: generate movies
        swipes/
          route.ts          # POST: record swipe, GET: user's swipes
        results/
          route.ts          # GET: final rankings

components/
  party/
    party-header.tsx        # Party name, member count, status
    member-list.tsx         # Show active members
    preference-form.tsx     # Collect user preferences
    party-tinder-cards.tsx  # Tinder interface for party movies
    party-results.tsx       # Show final rankings
    party-status-banner.tsx # Show current party status
    join-party-form.tsx     # Join party via slug
    create-party-form.tsx   # Create new party

lib/
  party/
    party-service.ts        # Party CRUD operations
    member-service.ts       # Member management
    preference-service.ts   # Preference aggregation
    movie-service.ts        # Movie generation & ELO updates
    swipe-service.ts        # Swipe recording
    realtime.ts             # Realtime subscription helpers
    elo-calculator.ts       # ELO calculation logic (extracted from movie_rating.ts)
```

---

## Key Implementation Considerations

### 1. Party Lifecycle States
- **`waiting`**: Party created, waiting for members to join
- **`collecting_preferences`**: Members are submitting preferences
- **`swiping`**: Movies generated, members are swiping
- **`completed`**: All members finished swiping, results ready

### 2. Preference Aggregation Strategy
- **Option A**: Combine all preferences (union of all genres, actors, etc.)
- **Option B**: Use most common preferences (intersection)
- **Option C**: Weighted average based on member count
- **Recommendation**: Start with Option A (union), allow customization later

### 3. Movie Generation
- Generate movies once when party moves to `swiping` state
- Use aggregated preferences from all members
- Store in `party_movies` table
- All members see the same 10 movies

### 4. ELO Rating Strategy
- **Option A**: Shared ELO pool (all swipes affect same ratings)
- **Option B**: Individual ELO per user, then aggregate
- **Recommendation**: Option A (shared pool) - simpler and creates consensus

### 5. Slug Generation
- Use `nanoid` or similar for URL-safe slugs
- Format: `{adjective}-{noun}-{4digits}` (e.g., "happy-movie-7k2x")
- Ensure uniqueness in database

### 6. Real-time Updates
- Show member count updates
- Show when members submit preferences
- Show live ELO rating changes
- Show progress (X/10 movies swiped)
- Optional: Show "X just swiped on Y" notifications

### 7. Edge Cases to Handle
- Member leaves mid-session
- Host removes member
- Party reaches max members
- Member doesn't submit preferences (skip or use defaults?)
- Member doesn't complete swiping (show partial results?)
- Duplicate swipes (prevent via unique constraint)

---

## Next Steps

1. **Create database schema** - Run SQL migrations in Supabase
2. **Set up RLS policies** - Ensure proper security
3. **Enable Realtime** - Configure Supabase Realtime for relevant tables
4. **Create API routes** - Build Next.js API routes for party operations
5. **Build UI components** - Create party management UI
6. **Integrate Realtime** - Add real-time subscriptions
7. **Test with multiple users** - Verify concurrent operations work

---

## Migration Script Template

```sql
-- migrations/001_create_party_system.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create parties table
-- (paste table definition from above)

-- Create party_members table
-- (paste table definition from above)

-- Create party_movies table
-- (paste table definition from above)

-- Create user_swipes table
-- (paste table definition from above)

-- Create indexes
-- (paste index definitions from above)

-- Create functions
-- (paste function definitions from above)

-- Create triggers
-- (paste trigger definitions from above)

-- Enable RLS
-- (paste RLS policies from above)

-- Enable Realtime (run in Supabase dashboard or via API)
-- ALTER PUBLICATION supabase_realtime ADD TABLE parties;
-- ALTER PUBLICATION supabase_realtime ADD TABLE party_members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE party_movies;
-- ALTER PUBLICATION supabase_realtime ADD TABLE user_swipes;
```

