# **AUCTION MANAGEMENT WEBSITE** 

_Product & Technical Specification Document_ 

**Tech Stack:  Next.js  •  Node.js  •  Firebase** 

40 Players  •  5 Team Owners  •  8 Players per Team  •  1000-Point Wallet 

_Version 1.0_ 

## **1. Project Overview** 

The Auction Management Website is a real-time, role-based web application designed to conduct a live player auction — similar in spirit to IPL-style cricket auctions. The platform allows an administrator to run the auction (assigning players to teams and recording final bid prices) while all participants and viewers can watch live, always-updated auction data through a public dashboard. 

The system enforces strict business rules around wallet points and squad size so that no team owner can ever end up in a position where they cannot complete their mandatory squad of 8 players — the application proactively blocks any bid that would violate this constraint. 

### **1.1 Goals** 

- Provide a fast, real-time auction experience where sold/unsold status and prices update instantly for every connected viewer. 

- Give the admin full control over the auction — marking players sold/unsold, assigning teams, and setting the final bid price. 

- Guarantee financial fairness through automated wallet and squad-size validation, preventing any owner from overspending. 

- Keep the viewer-facing panel simple, read-only, and accessible without login. 

- Restrict all write operations (player status changes, bid confirmation, team assignment) strictly to authenticated admins. 

## **2. Technology Stack** 

|**Layer**|**Technology & Purpose**|
|---|---|
|Frontend Framework|Next.js (React) — server-rendered pages, file-based routing, API routes<br>for lightweight backend logic, and fast client-side navigation between<br>Admin and User panels.|
|Backend / Business Logic|Node.js — either via Next.js API routes or a standalone Express server,<br>hosting the bid-validation engine, authentication middleware, and<br>Firebase Admin SDK operations.|
|Database|Firebase Firestore — NoSQL, real-time document database storing<br>players, teams, bids, and auction state, with live listeners (onSnapshot)<br>pushing instant updates to every connected client.|
|Authentication|Firebase Authentication (Email/Password) — used only for the Admin<br>role; the User role requires no login.|
|File Storage|Firebase Storage — hosts player photos and team logos.|
|Hosting / Deployment|Vercel (for Next.js frontend + API routes) and Firebase Hosting/Functions<br>if a dedicated Node.js server is used.|
|State Management|React Context / Zustand for local UI state; Firestore listeners as the real-<br>time source of truth.|
|Styling|Tailwind CSS for a responsive, utility-first UI across both panels.|



## **3. User Roles & Authentication** 

On landing, every visitor sees a simple role-selection screen with two options: Admin and User. 

### **3.1 Role Selection Flow** 

1. Visitor opens the website and is shown two buttons: "Continue as Admin" and "Continue as User." 

2. If "User" is selected → the visitor is redirected immediately to the public dashboard (no credentials required). 

3. If "Admin" is selected → a login form (username/email + password) is shown. On successful authentication via Firebase Auth, the visitor is redirected to the Admin Dashboard. On failure, an inline error is shown and access is denied. 

### **3.2 Role Capabilities** 

|**Role**|**Access**|**Permissions**|
|---|---|---|
|Admin|Username/password login required<br>(Firebase Auth)|Add/edit players, start bidding on a player,<br>mark player Sold/Unsold, assign winning<br>team, set final bid price, edit<br>teams/owners, reset or manage the auction.|
|User|No login — direct redirect to dashboard|Read-only view of total players, sold<br>players, unsold players, team-wise rosters,<br>and team-wise wallet balances. Cannot<br>alter any data.|



### **3.3 Security Approach** 

- Firebase Authentication issues a session/ID token to logged-in admins; this token is verified on every write request. 

- Firestore Security Rules restrict all write operations (create/update/delete on players, teams, bids) to requests carrying a valid admin custom claim or matching an "admins" allowlist collection. 

- The User panel only ever performs read (get/listen) operations, which are open to unauthenticated clients under the security rules. 

- All bid-validation logic (wallet checks, squad-size checks) is re-verified on the server/API side, never trusted from the client alone — this prevents a manipulated client from bypassing the rules. 

## **4. Core Business Rules** 

### **4.1 Players & Base Price** 

- Total players in the auction pool: 40. 

- Base price for every player: 30 points (the floor price — no player can be sold below this). 

- Each player has exactly one of three statuses at any time: Unsold Pool (not yet auctioned / passed), Sold, or Unsold (auctioned but no team bought them). 

### **4.2 Team Owners & Wallet** 

- Total team owners: 5. 

- Starting wallet per owner: 1000 points. 

- Mandatory squad size per team: exactly 8 players — no more, no less. 

- A team's remaining wallet is recalculated after every successful purchase: remainingWallet = 1000 − (sum of all winning bid prices so far). 

### **4.3 The Maximum-Bid Constraint (Core Rule)** 

Because every team must finish with exactly 8 players, and every remaining player still costs at least the 30-point base price, an owner must always keep enough points in reserve to cover the base price of every player slot still remaining after the current one. This is the single most important rule in the platform and must be enforced on every bid attempt. 

#### **Formula** 

```
playersOwned      = number of players this team has already won
remainingSlots    = 8 - playersOwned            (includes the player being bid on now)
slotsAfterThis    = remainingSlots - 1           (slots left AFTER winning current
player)
reserveRequired   = slotsAfterThis * BASE_PRICE  (BASE_PRICE = 30)
maxAllowedBid     = currentWalletBalance - reserveRequired
A bid is REJECTED if:  proposedBid > maxAllowedBid   OR   proposedBid < BASE_PRICE
```

#### **Worked Example (as specified by the client)** 

An owner has already bought 5 players for a combined 800 points, leaving a wallet balance of 200 points. They are now bidding on their 6th player. 

|playersOwned|5|
|---|---|
|remainingSlots (8 − 5)|3  (this is the 6th, 7th and 8th player)|
|slotsAfterThis (3 − 1)|2  (the 7th and 8th player still to be bought)|
|reserveRequired (2 × 30)|60 points|
|currentWalletBalance|200 points|
|maxAllowedBid (200 − 60)|140 points|



If the admin (or a live bidding interface) tries to place a bid of 141 points or more for this owner on the 6th player, the system blocks it and shows: "You can't bid — insufficient points to complete your remaining squad." This guarantees the owner can always afford the base price for every remaining mandatory slot. 

#### **Additional Validations** 

- A team that has already secured 8 players is automatically excluded from any further bidding on any player. 

- A bid below the current player's base price (30) or below the current highest bid + minimum increment is rejected. 

- If an owner's maxAllowedBid falls below the base price (i.e., they can no longer even afford the base price for the current player once reserve is considered), the system marks that owner as ineligible to bid on the current player. 

## **5. Feature List** 

### **5.1 Admin Panel Features** 

- Secure login (Firebase Auth — username/email + password). 

- Add / edit / remove player profiles (name, photo, role, stats, base price). 

- Add / edit team & owner profiles (owner name, team name, team logo, starting wallet). 

- Live auction control screen: bring up the next player, accept bid amount, choose the winning team from a dropdown (auto-filtered to only eligible/affordable teams), and confirm as Sold — or mark as Unsold if no team buys. 

- Automatic recalculation of each team's wallet balance and player count immediately after every sale. 

- Real-time enforcement of the maximum-bid constraint (Section 4.3) before any sale is confirmed. 

- Edit or reverse a sale (undo) in case of a mistaken entry, with wallet/roster figures automatically re-adjusted. 

- View and export the full player list, sold list, unsold list, team rosters, and wallet summary. 

- Reset/restart auction (dangerous action, confirmation required). 

### **5.2 User Panel Features (Read-Only)** 

- Total Player List — every player in the pool with photo, name, role/stats, and current status. 

- Sold Player List — players already bought, showing final price and the team that bought them. 

- Unsold Player List — players who went under the hammer but were not bought by any team. 

- Team-wise Player List — roster view per team, showing all players bought by that team so far. 

- Team-wise Wallet — remaining wallet balance and points spent per team, updated live. 

- Live auction view — shows the current player under auction and the live status of the process (optional real-time "currently bidding" screen). 

### **5.3 Player Card — Display Fields** 

|**Field**|**Description**|
|---|---|
|Photo|Player's headshot/photo image.|
|Name|Full name of the player.|
|Role / Stats icon|Playing role — Batsman, Bowler, All-rounder, or Wicket-Keeper —<br>shown with an icon.|
|Base Price|Fixed at 30 points for every player.|
|Status|Unsold Pool / Sold / Unsold.|
|Sold Price & Team|(Shown only once sold) final bid price and the buying team's name/logo.|



### **5.4 Team Card — Display Fields** 

|**Field**|**Description**|
|---|---|
|Team Logo|Uploaded logo image for the team.|
|Team Name|Name of the franchise/team.|
|Owner Name|Name of the person who owns/manages the team.|
|Players Bought|Count out of 8 (e.g., 5/8).|
|Wallet Remaining|Points left out of the starting 1000.|
|Max Allowed Bid|Live-calculated ceiling for the next bid, per the Section 4.3 formula.|



## **6. Data Model (Firestore Schema)** 

Firestore is a document/collection-based NoSQL database. The following collections model the auction domain. 

### **6.1 players (collection)** 

```
players/{playerId}
{
  name: string,
  photoUrl: string,
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicket-Keeper",
  stats: { matches, runs, wickets, average, ... },   // flexible stat map
  basePrice: number,          // fixed = 30
  status: "pool" | "sold" | "unsold",
  soldPrice: number | null,
  soldToTeamId: string | null,
  createdAt: timestamp,
  updatedAt: timestamp
```

```
}
```

### **6.2 teams (collection)** 

```
teams/{teamId}
{
  teamName: string,
  ownerName: string,
  logoUrl: string,
  startingWallet: number,      // fixed = 1000
  walletRemaining: number,     // auto-updated on every sale
  playersBoughtCount: number,  // auto-updated, max 8
  playerIds: array<string>,    // references into players collection
  createdAt: timestamp
}
```

### **6.3 bids (collection) — Auction Log** 

```
bids/{bidId}
{
  playerId: string,
  teamId: string,
  bidAmount: number,
  isWinningBid: boolean,
  placedBy: "admin",         // admin uid
  timestamp: timestamp
}
```

### **6.4 auctionState (single document) — Live Control** 

```
auctionState/current
{
  currentPlayerId: string | null,
  currentHighestBid: number,
  currentHighestTeamId: string | null,
  status: "idle" | "in-progress" | "paused" | "completed",
  updatedAt: timestamp
}
```

### **6.5 admins (collection) — Authorization Allowlist** 

```
admins/{uid}
{
  email: string,
  role: "admin",
  createdAt: timestamp
}
```

## **7. Application Architecture** 

### **7.1 High-Level Flow** 

4. Next.js frontend renders the Role Selection screen, Admin Login, Admin Dashboard, and User Dashboard as separate route groups (e.g. /admin/* and /dashboard/*). 

5. Node.js API routes (under /pages/api/ or /app/api/ in Next.js, or a separate Express service) host the protected business logic: bid validation, sale confirmation, player/team CRUD. 

6. Firebase Admin SDK (server-side) performs all writes to Firestore from within these API routes, after independently revalidating the Section 4.3 constraint — never trusting client-submitted numbers blindly. 

7. Firestore onSnapshot real-time listeners are used on both Admin and User panels so that every screen updates instantly the moment the admin confirms a sale, with no manual refresh. 

8. Firebase Storage holds player photos and team logos, referenced by URL in the player/team documents. 

### **7.2 Suggested Folder Structure (Next.js)** 

```
/app
  /admin
    /login/page.tsx
    /dashboard/page.tsx
    /players/page.tsx        (add/edit players)
    /teams/page.tsx           (add/edit teams)
    /live-auction/page.tsx    (run the auction)
  /dashboard                 (public User panel)
    /page.tsx                 (overview)
    /players/page.tsx
    /sold/page.tsx
    /unsold/page.tsx
    /teams/page.tsx
  /api
    /players/route.ts
    /teams/route.ts
    /bid/route.ts             (validates + confirms a sale)
    /auth/route.ts
/lib
  firebaseClient.ts
  firebaseAdmin.ts
  bidValidation.ts           (Section 4.3 formula, shared logic)
/components
  PlayerCard.tsx, TeamCard.tsx, RoleSelector.tsx, ...
```

### **7.3 Firestore Security Rules (Concept)** 

```
match /players/{id} {
  allow read: if true;                         // public read for User panel
  allow write: if request.auth != null
               && exists(/databases/$(db)/documents/admins/$(request.auth.uid));
}
match /teams/{id}  { allow read: if true; allow write: if isAdmin(); }
match /bids/{id}   { allow read: if true; allow write: if isAdmin(); }
match /auctionState/{id} { allow read: if true; allow write: if isAdmin(); }
```

## **8. Screen-by-Screen UI Flow** 

### **8.1 Landing / Role Selection** 

- Two large buttons: "Admin" and "User". 

- Clean, tournament-style branding area (logo, auction name, date). 

### **8.2 Admin Login** 

- Username/Email + Password fields, "Login" button, inline error on invalid credentials. 

### **8.3 Admin Dashboard** 

- Summary cards: Total Players, Sold, Unsold, Remaining in Pool. 

- Quick links to: Manage Players, Manage Teams, Live Auction, Reports. 

### **8.4 Live Auction Screen (Admin)** 

- Large card showing the current player (photo, name, role, stats, base price). 

- Bid entry field + team selector, restricted to teams whose maxAllowedBid ≥ entered amount and who have < 8 players. 

- "Confirm Sold" and "Mark Unsold" action buttons. 

- Live sidebar listing all 5 teams with wallet remaining, players bought, and their individually computed max allowed bid for the current player. 

### **8.5 Manage Players / Manage Teams (Admin)** 

- Table/grid view with Add, Edit, Delete actions; image upload for photos/logos. 

### **8.6 User Dashboard (Public)** 

- Tabs or nav links: Total Players, Sold Players, Unsold Players, Team-wise Players, Team-wise Wallet. 

- Each list uses the Player Card / Team Card layouts defined in Sections 5.3 and 5.4. 

- All data refreshes live via Firestore listeners — no login, no write access. 

## **9. Non-Functional Requirements** 

- Real-time sync: any admin action must reflect on all open User panel screens within ~1 second, via Firestore listeners. 

- Responsiveness: both panels must work well on desktop and mobile/tablet (Tailwind responsive breakpoints). 

- Data integrity: all bid-limit and squad-size checks are enforced server-side (Node.js/API layer + Firestore rules), not just in the browser. 

- Auditability: every confirmed sale is logged in the bids collection with a timestamp and admin id, enabling later review or undo. 

- Scalability of media: player photos and team logos are stored in Firebase Storage (not inline base64) and served via CDN URLs. 

- Simplicity for viewers: the User panel requires zero setup or login, so it can be shared as a public link during a live event. 

## **10. Optional Future Enhancements** 

- Multi-admin support with granular permissions (e.g., a second "assistant admin" who can add players but not confirm sales). 

- Live bidding timer per player (auto-move to next player after a countdown). 

- Owner-side bidding interface (each owner logs in and places their own bids in real time, instead of the admin entering on their behalf). 

- Auction analytics dashboard — most expensive players, spend distribution across teams, role-wise spend breakdown. 

- Export sold/unsold/team lists to PDF or Excel directly from the Admin panel. 

_----- End of Document -----_ 

