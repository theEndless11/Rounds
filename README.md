# Rounds - Medical Social Network

A social networking app for medical professionals built with Vue 3, Ionic, and Capacitor.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier)

## Installation

### 1. Clone and Install Dependencies
```bash
cd rounds-app
npm install
```

### 2. Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Create `.env` file:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Setup Database

1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `database/schema.sql`
3. Run the SQL commands

### 4. Configure Phone Authentication

1. In Supabase Dashboard → Authentication → Providers
2. Enable "Phone" provider
3. Choose SMS provider (Twilio recommended for testing)
4. Add credentials

## Development

### Run Web App
```bash
npm run dev
```

Open http://localhost:5173

### Run on Android
```bash
# First time setup
npx cap add android

# Build and run
npm run android
```

### Run on iOS
```bash
# First time setup (macOS only)
npx cap add ios

# Build and run
npm run ios
```

## Project Structure
```
rounds-app/
├── src/
│   ├── components/      # Reusable components
│   ├── views/          # Page components
│   ├── stores/         # Pinia stores
│   ├── router/         # Vue Router config
│   ├── supabase.js     # Supabase client
│   ├── App.vue         # Root component
│   └── main.js         # Entry point
├── database/           # SQL schema files
├── public/            # Static assets
└── capacitor.config.json
```

## Features Implemented

- ✅ Phone OTP Authentication
- ✅ User Profiles
- ✅ Text Posts
- ✅ Feed with Infinite Scroll
- ✅ Pull to Refresh
- ⏳ Likes & Comments (coming soon)
- ⏳ Image Upload (coming soon)
- ⏳ Video Streaming (coming soon)
- ⏳ Push Notifications (coming soon)

## Tech Stack

- **Frontend:** Vue 3, Ionic Framework
- **Mobile:** Capacitor
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **State Management:** Pinia
- **Routing:** Vue Router

## Troubleshooting

### Supabase Connection Issues
- Check `.env` file exists and has correct values
- Verify Supabase project is running
- Check network connectivity

### Phone Auth Not Working
- Enable Phone provider in Supabase
- Configure SMS provider credentials
- Check phone number format (+91XXXXXXXXXX)

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## License

MIT