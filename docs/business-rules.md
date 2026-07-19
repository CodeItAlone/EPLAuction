# Business Rules & Math Constraints

This system enforces strict auction governance rules to guarantee that every team owner can successfully build a full squad without overspending.

---

## 1. Core Auction Specifications

- **Total Players**: 40 players in the auction pool.
- **Total Teams**: 5 franchise team owners.
- **Squad Requirement**: Exactly **8 players** per team (no more, no less).
- **Starting Wallet**: **1,000 points** per franchise.
- **Base Price**: **30 points** minimum per player (no player can be sold below this).

---

## 2. The Maximum-Bid Constraint

The central business rule prevents a team owner from spending too much on early players, which would render them unable to afford the remaining slots at their base price of 30 points. The system calculates a dynamic ceiling on every bid attempt.

### 2.1 The Mathematical Formula

```
playersOwned      = number of players currently in squad
remainingSlots    = 8 - playersOwned
slotsAfterThis    = remainingSlots - 1
reserveRequired   = slotsAfterThis * 30 (BASE_PRICE)
maxAllowedBid     = currentWalletBalance - reserveRequired
```

### 2.2 Worked Example

A team owner has **5 players** and **200 points** remaining in their wallet. They want to place a bid on a **6th player**:

| Parameter | Calculation / Value | Description |
|---|---|---|
| `playersOwned` | **5** | Currently secured players |
| `remainingSlots` | 8 - 5 = **3** | Slots left to fill (6th, 7th, 8th) |
| `slotsAfterThis` | 3 - 1 = **2** | Slots left *after* the player currently being bid on (7th, 8th) |
| `reserveRequired` | 2 * 30 = **60 points** | Absolute reserve required to buy 7th and 8th player at base price |
| `currentWalletBalance` | **200 points** | Remaining budget |
| **`maxAllowedBid`** | 200 - 60 = **140 points** | The absolute maximum they are allowed to bid on this 6th player |

If the administrator tries to enter a bid of **141 points** or higher for this team, the application will automatically block it and report:
> *Bid exceeds the maximum allowed bid of 140 (reserve requirement: 60 points for 2 remaining slots)*

---

## 3. Bid Validation Rules

The logic is exported in [bidValidation.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/Auction_Management_system/lib/bidValidation.ts) and handles several validation checks:

1. **Integer Validation**: Bids must be whole integer values (`Number.isInteger`).
2. **Positive Value**: The bid amount must be greater than zero.
3. **Wallet Integrity**: Negative wallet balances or invalid squad size counts (>8) are rejected immediately.
4. **Base Price Check**: Bids cannot be below the base price of 30.
5. **Increment Check**: Any new bid must be strictly greater than the current highest bid (unless it is the first bid on a player and equals the base price of 30).
6. **Maximum Wallet/Reserve Check**: Evaluated on the server using `validateBid()` to prevent client tampering.
7. **Squad Completion Exclusion**: Teams that have already bought 8 players are excluded from bidding on additional players.
