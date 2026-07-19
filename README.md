# Auction Management Website 🏏

A high-energy, real-time, dark-themed tournament auction dashboard and management system designed for cricket-style live player auctions (similar to IPL auctions).

## Quick Start

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd Auction_Management_system
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory and populate it with your Firebase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
- **Public Keys**: Used by client-side Firestore listeners.
- **Private Admin SDK Keys**: Used for secure server-side validations in Next.js API routes.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features

- ⚡ **Real-Time Auction Sync**: Live updates pushed to all connected users within ~1 second using Firebase Firestore listeners.
- 🛠️ **Administrative Control**: Secure login, add/edit/delete operations for players and teams, starting/pausing auctions, and bidding controls.
- 📐 **Maximum-Bid Constraint**: Server-side validation formula ensuring team owners cannot violate budget boundaries or squad requirements.
- 👥 **Public Dashboard**: Read-only view for viewers showing live player states, rosters, remaining budgets, and status tables.

---

## Configuration

| Environment Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client & Server | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client & Server | Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client & Server | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client & Server | Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client & Server | Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client & Server | Application ID |
| `FIREBASE_PROJECT_ID` | Server Only | Private Admin SDK Project ID |
| `FIREBASE_CLIENT_EMAIL` | Server Only | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Server Only | Firebase service account private key |

---

## Documentation

To explore specific sections of the implementation and design, view the following documents:

- 🏗️ [Architecture & Technical Design](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/docs/architecture.md) — Details on file layout, components, and Firestore schemas.
- 🧮 [Business Rules & Math Constraints](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/docs/business-rules.md) — The Maximum-Bid algorithm details, worked examples, and validation rules.
- 🔌 [API & Security Reference](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/docs/api-reference.md) — Details on Next.js server-side endpoint handlers and database security rules.

---

## License

MIT
