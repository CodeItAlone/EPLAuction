# Architecture & Technical Design

This document details the system design, file layout, reusable UI components, and the Firestore database schemas.

---

## 1. Directory Structure

```
/app
  /admin                  # Admin-specific routes
    /dashboard            # Admin summary page
    /live-auction         # Controls to run the live bidding
    /login                # Admin authentication login
    /players              # Admin CRUD dashboard for player database
    /teams                # Admin CRUD dashboard for franchise teams
    layout.tsx
  /api                    # Protected API routes
    /auction              # Live state controls
    /bid                  # Process and confirm bids
    /debug                # Reset and utility endpoints
    /players              # CRUD backend endpoints for players
    /teams                # CRUD backend endpoints for teams
  /dashboard              # Public user-facing read-only panels
  /projector              # Live projection display view
/components               # Reusable presentation and utility React components
/lib                      # Firebase initializers and backend business logic
/public                   # Static assets (icons, placeholders)
```

---

## 2. Key Components & Utilities

- 🗺️ **State Orchestration**: Firestore real-time listeners (`onSnapshot`) are used inside dashboards to sync UI state changes instantly.
- 🎨 **Visual Themes**: Immersive dark theme configured using Tailwind CSS. Specific design tokens and rules can be referenced in [DESIGN.md](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/DESIGN.md).

### UI Components

- 🎫 **[PlayerCard.tsx](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/components/PlayerCard.tsx)**: Displays player stats, photos, playing roles, base price, and status badges.
- 🛡️ **[TeamCard.tsx](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/components/TeamCard.tsx)**: Renders team details, wallet balances, squad counts, and the team's live-calculated Maximum Allowed Bid.
- 🎇 **[SoldCelebrationOverlay.tsx](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/components/SoldCelebrationOverlay.tsx)**: Dynamic neon/particles overlay animation triggered upon confirming a player sale.
- 🧭 **[Navbar.tsx](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/components/Navbar.tsx)**: Standard header navigation across panels.

### Utilities & Helpers

- 🧠 **[bidValidation.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/lib/bidValidation.ts)**: Contains the core mathematical checks enforcing the Maximum-Bid Constraint.
- 🔑 **[authHelper.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/lib/authHelper.ts)**: Helper functions managing credentials and session state.
- 🌐 **[firebaseClient.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/lib/firebaseClient.ts)** & **[firebaseAdmin.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/lib/firebaseAdmin.ts)**: Initialization wrappers for the Firebase Client and Server-Side Admin SDK respectively.

---

## 3. Database Schema (Firestore)

Firestore is structured into the following NoSQL collections:

### 3.1 `players` (Collection)
Stores player profiles, stats, and current auction statuses.
```json
{
  "name": "Virat Kohli",
  "photoUrl": "https://storage.googleapis.com/...",
  "role": "Batsman",
  "stats": {
    "matches": 234,
    "runs": 7263,
    "average": 52.3
  },
  "basePrice": 30,
  "status": "pool" | "sold" | "unsold",
  "soldPrice": 150,
  "soldToTeamId": "team_abc_123"
}
```

### 3.2 `teams` (Collection)
Stores franchise profiles, budget remaining, and rosters.
```json
{
  "teamName": "Royal Challengers Bangalore",
  "ownerName": "Mr. RCB",
  "logoUrl": "https://storage.googleapis.com/...",
  "startingWallet": 1000,
  "walletRemaining": 850,
  "playersBoughtCount": 1,
  "playerIds": ["player_xyz_789"]
}
```

### 3.3 `bids` (Collection)
Logs individual bid logs for audits and undo operations.
```json
{
  "playerId": "player_xyz_789",
  "teamId": "team_abc_123",
  "bidAmount": 150,
  "isWinningBid": true,
  "placedBy": "admin_uid_001",
  "timestamp": "2026-07-19T14:00:00Z"
}
```

### 3.4 `auctionState` (Document: `auctionState/current`)
Single configuration document holding the current live auction screen information.
```json
{
  "currentPlayerId": "player_xyz_789",
  "currentHighestBid": 60,
  "currentHighestTeamId": "team_def_456",
  "status": "in-progress"
}
```

### 3.5 `admins` (Collection)
Allows admin users backend check bypasses.
```json
{
  "email": "admin@auction.com",
  "role": "admin"
}
```
