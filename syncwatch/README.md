# 🎬 WatchParty

A real-time synchronized video watching experience built with Next.js 16, Socket.io, and WebRTC. Watch YouTube videos together with friends, chat in real-time, and see each other via video calls.

## ✨ Features

- **Synchronized Playback**: Play, pause, and seek are locked for all participants
- **Real-time Chat**: Live messaging during video playback
- **Video Calls**: WebRTC-powered video conferencing with PeerJS
- **Reaction System**: Send emoji reactions that appear on the video timeline
- **Room Management**: Create rooms with unique codes or join existing ones
- **Responsive Design**: Beautiful dark-themed UI that works on all devices

## 📁 Project Structure

```
watchparty/
├── syncwatch/                    # Next.js Frontend Application
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API routes
│   │   │   └── rooms/            # Room management endpoints
│   │   │       ├── route.js      # POST /api/rooms (create room)
│   │   │       └── [roomId]/     # Dynamic room endpoints
│   │   │           └── route.js  # GET /api/rooms/[roomId]
│   │   ├── room/                 # Dynamic room pages
│   │   │   └── [roomId]/         # Dynamic room route
│   │   │       └── page.js      # Room page component
│   │   ├── favicon.ico           # Site favicon
│   │   ├── globals.css           # Global styles
│   │   ├── layout.js             # Root layout component
│   │   └── page.js               # Landing page
│   ├── lib/                      # Utility libraries
│   │   ├── db.js                 # MongoDB connection helper
│   │   ├── peer.js               # PeerJS WebRTC configuration
│   │   ├── rateLimit.js          # Rate limiting middleware
│   │   ├── socket.js             # Socket.io client singleton
│   │   └── youtube.js            # YouTube URL parsing utilities
│   ├── models/                   # Database models
│   │   └── Room.js               # Mongoose Room schema
│   ├── public/                   # Static assets
│   ├── .env.example              # Environment variables template
│   ├── .env.local                # Local environment variables (gitignored)
│   ├── .gitignore                # Git ignore rules
│   ├── eslint.config.mjs         # ESLint configuration
│   ├── jsconfig.json             # JavaScript configuration
│   ├── next.config.mjs           # Next.js configuration
│   ├── package.json              # Dependencies and scripts
│   ├── postcss.config.mjs        # PostCSS configuration
│   └── vercel.json               # Vercel deployment config
│
└── syncwatch-server/             # Socket.io Backend Server
    ├── .env                      # Server environment variables
    ├── .gitignore                # Git ignore rules
    ├── conflictResolution.js     # Video state conflict resolution
    ├── db.js                     # MongoDB connection
    ├── index.js                  # Main server entry point
    ├── package.json              # Dependencies and scripts
    └── roomState.js              # In-memory room state management
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd watchparty
```

2. **Install frontend dependencies**
```bash
cd syncwatch
npm install
```

3. **Install backend dependencies**
```bash
cd ../syncwatch-server
npm install
```

### Environment Setup

**Frontend (syncwatch/.env.local)**
```env
NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=
MONGODB_URI=mongodb://localhost:27017/watchparty
NODE_ENV=development
```

**Backend (syncwatch-server/.env)**
```env
PORT=4000
CORS_ORIGIN=*
MONGODB_URI=mongodb://localhost:27017/watchparty
DEBUG_SOCKET=true
```

### Running the Application

1. **Start MongoDB**
```bash
# If using local MongoDB
mongod
```

2. **Start the Socket.io server**
```bash
cd syncwatch-server
npm start
```

3. **Start the Next.js frontend**
```bash
cd syncwatch
npm run dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 File & Folder Descriptions

### Frontend (syncwatch/)

#### `app/` - Next.js App Router
- **`page.js`** - Landing page with room creation/join forms
- **`layout.js`** - Root layout with font configuration
- **`globals.css`** - Global Tailwind CSS styles
- **`favicon.ico`** - Browser tab icon

#### `app/api/rooms/` - Room API Endpoints
- **`route.js`** - Creates new rooms with YouTube video IDs
- **`[roomId]/route.js`** - Fetches room data by ID

#### `app/room/[roomId]/page.js` - Dynamic Room Page
- Main room interface with video player, chat, and video calls
- Handles Socket.io connections for real-time sync
- Manages PeerJS for video conferencing
- Implements retry logic for API calls

#### `lib/` - Utility Libraries
- **`db.js`** - MongoDB connection helper for API routes
- **`peer.js`** - PeerJS singleton with ICE server configuration
- **`rateLimit.js`** - In-memory rate limiting middleware
- **`socket.js`** - Socket.io client singleton with reconnection logic
- **`youtube.js`** - YouTube URL validation and video ID extraction

#### `models/` - Database Models
- **`Room.js`** - Mongoose schema for room persistence

### Backend (syncwatch-server/)

#### `index.js` - Main Server
- Express server with Socket.io integration
- Handles all socket events (join, play, pause, seek, chat, reactions)
- Room state management and participant tracking
- Health check endpoint for deployment platforms

#### `roomState.js` - Room State Management
- In-memory state for active rooms
- Conflict resolution for simultaneous playback controls
- Host management and participant tracking
- Reaction storage

#### `conflictResolution.js` - Playback Conflict Resolution
- Resolves conflicting playback commands from multiple users
- Host-based authority system
- Timestamp-based event ordering

#### `db.js` - Database Connection
- MongoDB connection setup
- Room model export

## 🔧 Configuration

### Socket.io Configuration
- **Transports**: WebSocket with polling fallback
- **Reconnection**: Infinite attempts with exponential backoff
- **CORS**: Configurable origin whitelist

### PeerJS Configuration
- **ICE Servers**: Google STUN + OpenRelay TURN
- **Debug Level**: Configurable logging verbosity

### Rate Limiting
- **Room Creation**: 10 requests per minute per IP
- **Configurable**: Window size and max requests

## 🌐 Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_SOCKET_SERVER_URL` (your deployed socket server URL)
   - `MONGODB_URI`
3. Deploy

### Render/Railway (Backend)

1. Deploy the `syncwatch-server` directory
2. Set environment variables:
   - `PORT` (default: 4000)
   - `MONGODB_URI`
   - `CORS_ORIGIN` (your frontend URL)
3. The health check endpoint (`/`) ensures the service stays active

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SOCKET_SERVER_URL` | Socket.io server URL | Yes |
| `NEXT_PUBLIC_API_URL` | API base URL (optional) | No |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `PORT` | Backend server port | No (default: 4000) |
| `CORS_ORIGIN` | Allowed CORS origins | No (default: *) |
| `DEBUG_SOCKET` | Enable socket logging | No (default: true) |

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Express.js, Socket.io 4
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io (signaling), PeerJS (WebRTC)
- **Video**: YouTube IFrame API
- **Styling**: Tailwind CSS with custom design system

## 📝 Development

### Adding New Features

1. **Socket Events**: Add handlers in `syncwatch-server/index.js`
2. **API Routes**: Create in `syncwatch/app/api/`
3. **UI Components**: Add to appropriate `app/` directory
4. **Database Models**: Define in `syncwatch/models/`

### Debugging

- **Frontend**: Check browser console for `[Socket]`, `[Room]`, `[Peer]`, `[Media]` logs
- **Backend**: Check server console for `[socket]` logs (enable with `DEBUG_SOCKET=true`)
- **Network**: Use browser DevTools Network tab to inspect API calls

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Socket.io for real-time communication
- PeerJS for WebRTC simplification
- OpenRelay for free TURN servers
