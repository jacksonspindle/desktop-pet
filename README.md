# Desktop Pet

A little AI-powered cat that lives on your desktop. It roams around, reacts to what you're doing, chats with you, and can hang out with your friends' cats.

<p align="center">
  <img src="src-tauri/icons/icon.png" width="64" height="64" style="image-rendering: pixelated;" alt="Desktop Pet">
</p>

<p align="center">
  <a href="https://jacksonspindle.github.io/desktop-pet/">Download</a> &middot;
  <a href="https://github.com/jacksonspindle/desktop-pet/releases">Releases</a>
</p>

## Features

**Your Cat Companion**
- Cat roams your desktop, takes naps, and walks around on its own
- Drag it anywhere, send it home, or put it to sleep
- Always on top of all windows with click-through transparency

**AI Chat**
- Talk to your cat and get witty, context-aware responses (powered by Claude)
- Cat reacts to the app you're using and comments on what you're doing
- Web search mode — ask your cat to look things up
- Spontaneous dialogue — cat speaks on its own every few minutes

**Friends & Hangouts**
- Register your cat with a unique code and share it with friends
- Add friends by code — once both sides add each other, you're mutual friends
- Click "Hangout" and both cats visit each other's desktops simultaneously
- Chat with visiting cats — messages are delivered as speech bubbles

**Customization**
- 6 breeds: Normal, Chonky, Siamese, Persian, Kitten, Calico
- 5 colors: Orange, Gray, Black, White, Tux
- Import your own custom sprite sheets

**Achievements**
- 32 achievements across tiered and hidden categories
- Track chats, searches, naps, streaks, session time, and more
- Toast notifications with cat commentary on each unlock

**Journal**
- AI-generated daily diary entries written from your cat's perspective
- Based on your actual activity — chats, searches, naps, achievements
- Stores up to 30 entries

**Ambient Music**
- Synthesized ambient soundscape using Web Audio API oscillators
- No external audio files — generated in real-time

## Download

Go to the [landing page](https://jacksonspindle.github.io/desktop-pet/) or grab the latest build from [Releases](https://github.com/jacksonspindle/desktop-pet/releases):

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `Desktop.Pet_x.x.x_aarch64.dmg` |
| macOS (Intel) | `Desktop.Pet_x.x.x_x64.dmg` |

> On first launch, macOS may block the app. Right-click the app and select **Open** to bypass Gatekeeper.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+
- Xcode Command Line Tools (`xcode-select --install`)

### Environment Variables

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...          # Required for AI chat
VITE_SUPABASE_URL=https://...         # Required for friends system
VITE_SUPABASE_ANON_KEY=eyJ...        # Required for friends system
```

The AI chat features require an [Anthropic API key](https://console.anthropic.com/). The friends system requires a [Supabase](https://supabase.com/) project (see [Database Setup](#database-setup)).

### Install & Run

```bash
npm install
npm run tauri dev
```

### Build

```bash
# Apple Silicon
npm run tauri build

# Intel Mac (cross-compile from Apple Silicon)
rustup target add x86_64-apple-darwin
npm run tauri build -- --target x86_64-apple-darwin
```

Output is in `src-tauri/target/release/bundle/dmg/`.

## Database Setup

The friends system uses Supabase with three tables. Create them in your Supabase SQL editor:

```sql
-- Registered pets
create table pets (
  id uuid primary key default gen_random_uuid(),
  pet_code text unique not null,
  name text not null default 'Cat',
  breed text not null default 'normal',
  color text not null default 'orange',
  online boolean not null default false,
  last_seen timestamptz not null default now()
);

-- Friendships (directional — mutual when both sides exist)
create table friendships (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade,
  friend_id uuid references pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(pet_id, friend_id)
);

-- Visits / hangout messages
create table visits (
  id uuid primary key default gen_random_uuid(),
  from_pet_id uuid not null,
  to_pet_id uuid not null,
  message text not null default '',
  breed text not null default 'normal',
  color text not null default 'orange',
  name text not null default 'Cat',
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable realtime for visits (required for live visit delivery)
alter publication supabase_realtime add table visits;
```

## Project Structure

```
desktop-pet/
├── src/                          # React frontend
│   ├── App.tsx                   # Root component, state orchestration
│   ├── components/
│   │   ├── Pet.tsx               # Sprite rendering + drag handling
│   │   ├── RadialMenu.tsx        # 9-action radial menu
│   │   ├── ChatInput.tsx         # Chat/search input
│   │   ├── SpeechBubble.tsx      # Dialogue display
│   │   ├── VisitingPet.tsx       # Friend's visiting cat
│   │   ├── FriendsPanel.tsx      # Friends list & management
│   │   ├── SettingsPanel.tsx     # Breed/color/theme settings
│   │   ├── JournalPanel.tsx      # Daily journal entries
│   │   ├── AchievementsPanel.tsx # Achievement tracker
│   │   └── AchievementToast.tsx  # Unlock notifications
│   ├── hooks/
│   │   ├── usePetMovement.ts     # Position, walking, napping
│   │   ├── useDialogue.ts       # Claude API chat generation
│   │   ├── useTheme.ts           # Breeds, colors, custom sprites
│   │   ├── useFriends.ts         # Supabase friends & visits
│   │   ├── useAchievements.ts    # Achievement tracking
│   │   ├── useJournal.ts         # Journal generation
│   │   ├── useEventTracker.ts    # Activity counting
│   │   ├── useActiveWindow.ts    # Active app detection
│   │   ├── useAmbientMusic.ts    # Web Audio synthesis
│   │   └── useCursorPassthrough.ts # Click-through window logic
│   ├── lib/
│   │   └── supabase.ts           # Supabase client & types
│   ├── styles/                   # Component CSS
│   └── assets/sprites/           # Sprite sheets (8-frame PNGs)
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Window setup, tray, Tauri commands
│   │   ├── dialogue.rs           # Claude API integration
│   │   └── active_window.rs      # macOS active window detection
│   └── tauri.conf.json           # Window & bundle config
├── docs/                         # Landing page (GitHub Pages)
└── .env                          # API keys (not committed)
```

## How It Works

**Window Management** — The app runs as a transparent, always-on-top, borderless window that covers the screen. A Rust-side polling loop checks the mouse position every 50ms and toggles cursor passthrough so clicks go through the window except when hovering over the cat (or a visiting cat's menu).

**AI Dialogue** — Chat requests are sent to Claude (Haiku) via the Rust backend with a system prompt that defines the cat's personality. The cat knows your active app and window title for context-aware responses. Search mode enables Claude's web search tool.

**Friends System** — Pets register in Supabase with unique codes. Friendships are directional rows — mutual when both sides add each other. Hangouts insert two visit rows simultaneously (one per direction). Visits are delivered via Supabase realtime subscriptions with a 5-second polling fallback for reliability.

**Sprites** — All animations use horizontal sprite sheets (8 frames) rendered with CSS `background-position` animation and `steps()` timing for crisp pixel art. The `image-rendering: pixelated` property keeps sprites sharp at any scale.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Desktop**: Tauri 2 (Rust)
- **AI**: Anthropic Claude API
- **Database**: Supabase (PostgreSQL + Realtime)
- **Audio**: Web Audio API

## License

MIT
