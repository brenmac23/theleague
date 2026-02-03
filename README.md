# 🎲 Board Game Leaderboard

A beautiful, feature-rich leaderboard for tracking your board game group's performance. Built with React + Vite, powered by Supabase, and hosted on Netlify.

![Game Night Leaderboard](https://via.placeholder.com/800x400?text=Game+Night+Leaderboard)

## ✨ Features

- **Dynamic Leaderboard** - Real-time rankings based on a sophisticated scoring system
- **Player Profiles** - Individual stats, game history, best/worst games, and badges
- **Game Library** - All your board games with play history and per-game rankings
- **Rating History** - Visual charts showing performance over time
- **Annual Champions** - Yearly awards with no recency decay
- **Auto-Generated Summaries** - Fun, readable descriptions of recent games
- **Easy Data Entry** - Simple forms to add new games and results

## 📊 Scoring System

The scoring system is designed to be fair and engaging:

| Factor | Description |
|--------|-------------|
| **Base Points** | Non-linear distribution: 1st=100, 2nd=70, 3rd=50, 4th=35, 5th=24, etc. |
| **Player Count** | 5 players = 1.0×, scales from 0.6× (2 players) to 1.2× (8 players) |
| **Duration** | Games over 60 min get bonus; shorter games are slightly reduced |
| **Complexity** | Higher BGG weight = slightly more points (light touch) |
| **Game Type** | Competitive=1.0×, Team=0.75×, Co-op=0.25× |
| **Recency** | Full value for 1 year, then linear decay to 0.25× at 4 years |
| **Participation** | Small bonus (+0.5 per game) to reward playing more |

**Final Score** = Average Points Per Game + Participation Bonus

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- A [Supabase](https://supabase.com) account (free tier works great)
- A [Netlify](https://netlify.com) account (free tier works great)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd board-game-leaderboard
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`
3. (Optional) Create storage buckets for avatars:
   - Go to Storage → Create bucket → Name: `avatars` → Public bucket
   - Go to Storage → Create bucket → Name: `game-images` → Public bucket

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in Supabase: Settings → API → Project URL and `anon` key.

### 4. Import Your Existing Data

If you have existing data in Google Sheets:

1. Export your sheet as CSV
2. Edit `scripts/import-data.mjs`:
   - Add your game metadata (duration, complexity, co-op/team flags)
   - Update the column mappings if needed
3. Run the import:

```bash
npm install csv-parse  # One-time dependency
node scripts/import-data.mjs
```

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173` to see your leaderboard!

### 6. Deploy to Netlify

**Option A: Via Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

**Option B: Via Netlify Dashboard**
1. Push your code to GitHub/GitLab
2. Go to [app.netlify.com](https://app.netlify.com)
3. Click "New site from Git"
4. Connect your repository
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Add environment variables in Site settings → Environment variables

## 📁 Project Structure

```
board-game-leaderboard/
├── src/
│   ├── App.jsx           # Main React application
│   ├── main.jsx          # React entry point
│   └── lib/
│       ├── scoring.js    # Scoring algorithm
│       └── supabase.js   # Database client & helpers
├── supabase/
│   └── schema.sql        # Database schema
├── scripts/
│   └── import-data.mjs   # Data import script
├── index.html            # HTML entry point
├── vite.config.js        # Vite configuration
├── netlify.toml          # Netlify configuration
└── package.json
```

## 🎨 Customization

### Adjusting the Scoring System

Edit `src/lib/scoring.js` to modify:

```javascript
const SCORING_CONFIG = {
  BASE_POINTS: [100, 70, 50, 35, 24, 16, 10, 6],  // Points by placement
  PLAYER_COUNT_MULTIPLIERS: { 2: 0.6, 3: 0.75, ... },
  PARTICIPATION_BONUS_PER_GAME: 0.5,
  // ... etc
};
```

### Adding New Badge Types

Badges are stored in the `badges` table. You can create them programmatically:

```javascript
await supabase.from('badges').insert({
  player_id: 'player-uuid',
  badge_type: 'annual_champion',
  badge_year: 2024,
  description: '2024 Annual Champion'
});
```

### Changing the Color Scheme

Edit the `COLORS` object in `src/App.jsx`:

```javascript
const COLORS = {
  gold: '#D4AF37',
  accent: '#6366F1',  // Change this for a different primary color
  bg: '#0F0F0F',
  // ... etc
};
```

## 🔧 API Reference

### Supabase Tables

| Table | Description |
|-------|-------------|
| `players` | Player profiles (id, name, avatar_url) |
| `games` | Board game definitions (name, duration, complexity, is_coop, is_team) |
| `matches` | Individual game sessions (game_id, date_played) |
| `match_results` | Player placements per match (match_id, player_id, placement) |
| `badges` | Player achievements |

### Key Functions

```javascript
import { calculateMatchPoints, calculatePlayerScore, generateMatchSummary } from './lib/scoring';

// Calculate points for a single result
const points = calculateMatchPoints({
  placement: 1,
  playerCount: 4,
  durationMinutes: 90,
  complexity: 2.5,
  isCoop: false,
  isTeam: false,
  datePlayed: '2024-01-15'
});

// Generate readable summary
const summary = generateMatchSummary(matchData);
// → "Bren wins Wingspan against Aaron, Laura, and Tessa."
```

## 🐛 Troubleshooting

**"Invalid API key" error**
- Make sure your `.env` file has the correct Supabase credentials
- Restart the dev server after changing `.env`

**Data not showing up**
- Check the Supabase dashboard to verify data was imported
- Check browser console for any API errors
- Ensure RLS policies are set up (run the schema.sql completely)

**Charts not rendering**
- Make sure you have at least 2 months of data
- Check that matches have valid dates

## 📝 License

MIT License - feel free to use this for your own game group!

## 🙏 Credits

- Built with [React](https://react.dev) + [Vite](https://vitejs.dev)
- Database by [Supabase](https://supabase.com)
- Hosting by [Netlify](https://netlify.com)
- Icons by [Lucide](https://lucide.dev)
- Charts by [Recharts](https://recharts.org)

---

Made with ❤️ for board game enthusiasts everywhere.
