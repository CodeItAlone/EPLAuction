export const BASE_PRICE = 30;
export const MAX_SQUAD_SIZE = 8;
export const STARTING_WALLET = 1000;

/**
 * Calculates the maximum bid a team can make for a player,
 * ensuring they keep enough wallet points reserved to buy players
 * for all their remaining slots at base price.
 */
export function calculateMaxAllowedBid(
  currentWalletBalance: number,
  playersOwned: number
): number {
  if (playersOwned < 0 || playersOwned > MAX_SQUAD_SIZE) {
    return 0;
  }
  if (currentWalletBalance < 0) {
    return 0;
  }
  if (playersOwned >= MAX_SQUAD_SIZE) {
    return 0; // Cannot buy more players
  }
  
  const remainingSlots = MAX_SQUAD_SIZE - playersOwned; // includes current player
  const slotsAfterThis = remainingSlots - 1; // slots left after this purchase
  const reserveRequired = slotsAfterThis * BASE_PRICE;
  
  return Math.max(0, currentWalletBalance - reserveRequired);
}

export interface BidValidationResult {
  isValid: boolean;
  reason?: string;
  maxAllowedBid: number;
}

/**
 * Validates if a proposed bid is valid for a team.
 */
export function validateBid(
  proposedBid: number,
  currentWalletBalance: number,
  playersOwned: number,
  currentHighestBid: number
): BidValidationResult {
  // Validate decimal or non-integer bids
  if (!Number.isInteger(proposedBid)) {
    return {
      isValid: false,
      reason: "Bids must be whole integer values",
      maxAllowedBid: calculateMaxAllowedBid(currentWalletBalance, playersOwned),
    };
  }

  // Validate negative or zero bids
  if (proposedBid <= 0) {
    return {
      isValid: false,
      reason: "Bid must be a positive integer greater than zero",
      maxAllowedBid: calculateMaxAllowedBid(currentWalletBalance, playersOwned),
    };
  }

  // Validate inputs
  if (currentWalletBalance < 0) {
    return {
      isValid: false,
      reason: "Team wallet balance cannot be negative",
      maxAllowedBid: 0,
    };
  }

  if (playersOwned < 0 || playersOwned > MAX_SQUAD_SIZE) {
    return {
      isValid: false,
      reason: `Invalid player count: ${playersOwned}. Must be between 0 and ${MAX_SQUAD_SIZE}`,
      maxAllowedBid: 0,
    };
  }

  const maxAllowedBid = calculateMaxAllowedBid(currentWalletBalance, playersOwned);

  if (playersOwned >= MAX_SQUAD_SIZE) {
    return {
      isValid: false,
      reason: `Squad is already complete (${MAX_SQUAD_SIZE}/${MAX_SQUAD_SIZE} players)`,
      maxAllowedBid,
    };
  }

  if (proposedBid < BASE_PRICE) {
    return {
      isValid: false,
      reason: `Proposed bid of ${proposedBid} is below the base price of ${BASE_PRICE}`,
      maxAllowedBid,
    };
  }

  if (proposedBid > maxAllowedBid) {
    const slotsAfterThis = MAX_SQUAD_SIZE - playersOwned - 1;
    const reserveRequired = slotsAfterThis * BASE_PRICE;
    return {
      isValid: false,
      reason: `Bid exceeds the maximum allowed bid of ${maxAllowedBid} (reserve requirement: ${reserveRequired} points for ${slotsAfterThis} remaining slots)`,
      maxAllowedBid,
    };
  }

  if (proposedBid <= currentHighestBid) {
    return {
      isValid: false,
      reason: `Proposed bid of ${proposedBid} must be higher than current highest bid of ${currentHighestBid}`,
      maxAllowedBid,
    };
  }

  return {
    isValid: true,
    maxAllowedBid,
  };
}
