# API & Security Reference

This document covers the Next.js API routes, Firebase Server-side Authentication verification, and Firestore database security structures.

---

## 1. Next.js API Routes

All operations that write or modify database records must go through backend endpoints where calculations are audited.

### 1.1 `/api/players`
Manages the player roster.
- **GET**: Returns the list of all players in the database.
- **POST**: Creates a new player profile (requires Admin credentials).
  - *Payload*: `{ name: string, role: string, basePrice: number, stats: object }`
- **PUT**: Updates existing player stats or photo details.
- **DELETE**: Removes a player from the system.

### 1.2 `/api/teams`
Manages team entries.
- **GET**: Returns the list of 5 franchises.
- **POST**: Registers a new franchise (requires Admin credentials).
- **PUT/DELETE**: Modifies or removes existing team structures.

### 1.3 `/api/bid` (POST)
Validates and logs a confirmed player sale.
- *Request Payload*:
  ```json
  {
    "playerId": "player_id_123",
    "teamId": "team_id_abc",
    "bidAmount": 150
  }
  ```
- *Actions performed*:
  1. Verifies the caller is an authenticated Admin.
  2. Pulls target player and team docs from Firestore.
  3. Re-runs `validateBid()` server-side using the `calculateMaxAllowedBid` formula from [bidValidation.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/lib/bidValidation.ts).
  4. Updates the player status to `"sold"`, sets `soldPrice`, and sets `soldToTeamId`.
  5. Adjusts team's `walletRemaining` and appends `playerId` to their roster array.
  6. Writes an audit document to the `bids` collection.

### 1.4 `/api/bid/undo` (POST)
Reverses a mistaken player sale transaction.
- *Request Payload*: `{ playerId: string }`
- *Actions performed*:
  1. Verifies the caller is an authenticated Admin.
  2. Resets the player status back to `"pool"`, clearing `soldPrice` and `soldToTeamId`.
  3. Finds the team that bought the player and returns their spent points to their `walletRemaining`.
  4. Decrements the team's player count and removes the player ID from the roster.
  5. Deletes or marks the corresponding bid log in the `bids` collection as void.

---

## 2. Authentication & Authorization

- **Firebase Authentication**: Email and password authentication is configured for Administrators.
- **Token Verification**: Admin UI requests attach the Firebase ID Token in the Authorization header:
  `Authorization: Bearer <ID_TOKEN>`
- **Server Verification**: The server-side API handler extracts and validates this token using `firebaseAdmin.auth().verifyIdToken()`. If the token is invalid or does not correspond to an authorized admin ID, a `401 Unauthorized` or `403 Forbidden` response is returned.

---

## 3. Firestore Security Rules

To guarantee database integrity even if frontend checks are bypassed:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Read-only permissions for public users, Admin write verification
    match /players/{playerId} {
      allow read: if true;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    match /teams/{teamId} {
      allow read: if true;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /bids/{bidId} {
      allow read: if true;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    match /auctionState/{stateId} {
      allow read: if true;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
  }
}
```
