# Todo App - Offline-First PWA

A mobile-first, offline-capable PWA todo application built with Nuxt 4, inspired by Apple Calendar's list view. Features Auth0 authentication, IndexedDB persistence, and automatic sync.

## Features

- 📱 **iOS-Optimized PWA** - Standalone mode, splash screens, Apple touch icons
- 🔐 **Auth0 Authentication** - Google and Microsoft OAuth providers
- 💾 **Offline-First** - IndexedDB storage with background sync
- 📅 **Calendar List View** - Apple Calendar-inspired vertical list UI
- 🎨 **Color Coding** - 8 colors for visual organization
- 🔄 **Auto Rollover** - Uncompleted todos automatically move to the next day
- 📱 **Push Notifications** - Daily reminders (iOS 16.4+ when installed)
- ⚡ **Optimistic Updates** - Instant UI feedback with background sync

## Tech Stack

- **Framework**: Nuxt 4
- **Styling**: Tailwind CSS (mobile-first)
- **PWA**: @vite-pwa/nuxt
- **Auth**: Auth0 Vue SDK
- **Database**: Dexie.js (IndexedDB)
- **Reactive Queries**: @vueuse/rxjs

## Getting Started

### Prerequisites

- Node.js 20+
- Auth0 account with configured application

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure Auth0 credentials in .env
```

### Auth0 Configuration

1. Create a new Single Page Application in Auth0
2. Configure allowed callback URLs: `http://localhost:3000`
3. Enable Google and Microsoft social connections
4. Copy domain, client ID, and audience to `.env`

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
todo_app/
├── app/
│   ├── assets/css/          # Tailwind styles
│   ├── components/
│   │   ├── todo/            # Todo-specific components
│   │   ├── BottomNav.vue    # Navigation
│   │   └── Pwa*.vue         # PWA components
│   ├── composables/
│   │   ├── useAuth.ts       # Authentication
│   │   ├── useTodos.ts      # Todo CRUD
│   │   └── useOfflineSync.ts # Sync layer
│   ├── layouts/
│   │   └── default.vue      # Main layout
│   ├── middleware/
│   │   └── auth.ts          # Route protection
│   ├── pages/
│   │   ├── index.vue        # Today view
│   │   ├── calendar.vue     # Calendar list view
│   │   ├── global.vue       # Inbox view
│   │   ├── settings.vue     # Settings
│   │   └── login.vue        # Login page
│   └── utils/
│       ├── db.ts            # Dexie database
│       └── rollover.ts      # Rollover logic
├── server/
│   ├── api/
│   │   ├── todos/           # Todo API endpoints
│   │   └── sync/            # Sync endpoint
│   └── utils/
│       ├── auth.ts          # JWT validation
│       └── store.ts         # In-memory store (demo)
├── shared/
│   └── types/               # Shared TypeScript types
└── public/
    ├── pwa-*.svg            # PWA icons
    └── splash/              # iOS splash screens
```

## Todo Model

```typescript
interface Todo {
  id: string
  title: string
  completed: boolean
  completedAt?: string
  scope: 'day' | 'global'
  dueDate?: string
  color: TodoColor
  rolloverRule: 'next-day' | 'next-week' | 'none'
  rolloverFromId?: string
  userId: string
  createdAt: string
  updatedAt: string
  syncStatus: 'pending' | 'synced' | 'conflict' | 'deleted'
  version: number
  sortOrder: number
}
```

## Sync Strategy

- **Optimistic Updates**: Changes are applied locally immediately
- **Sync Queue**: Pending changes are queued for background sync
- **Last-Write-Wins**: Conflict resolution based on version numbers
- **Idempotent APIs**: All endpoints support retry without side effects

## iOS PWA Notes

- Push notifications require iOS 16.4+ and home screen installation
- Splash screens need to be generated for each device size
- `apple-touch-icon` is required alongside manifest icons
- No background sync - triggers on app focus only

## License

MIT
