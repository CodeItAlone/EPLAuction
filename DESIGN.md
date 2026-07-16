---
name: Dark Tournament Vibe
colors:
  primary: "#0B0F19"
  secondary: "#1E293B"
  accent: "#3B82F6"
  success: "#10B981"
  error: "#EF4444"
  neutral-light: "#F8FAFC"
  neutral-muted: "#94A3B8"
typography:
  headline-display: { fontFamily: Inter, fontSize: 36px, fontWeight: 800, lineHeight: 1.2 }
  headline-lg: { fontFamily: Inter, fontSize: 24px, fontWeight: 700, lineHeight: 1.3 }
  body-md: { fontFamily: Inter, fontSize: 16px, fontWeight: 400, lineHeight: 1.5 }
  label-sm: { fontFamily: Inter, fontSize: 12px, fontWeight: 600, lineHeight: 1.0 }
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  card:
    backgroundColor: "{colors.secondary}"
    rounded: "{rounded.lg}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: 12px
---

# Auction Management Website - DESIGN.md

## Overview
A high-energy, immersive dark-themed interface designed for live cricket-style player auctions. The interface provides high visual feedback, real-time reactive components, and bold neon status indicators.

## Colors
- **Primary (#0B0F19)**: Deep slate/dark background for the entire application.
- **Secondary (#1E293B)**: Elevated cards, containers, and table row backgrounds.
- **Accent (#3B82F6)**: Electric blue for primary buttons, active player highlights, and bid increments.
- **Success (#10B981)**: Neon emerald green for "Sold" players, budget additions, and success alerts.
- **Error (#EF4444)**: Neon red for "Unsold" status, budget warnings, and destructive actions.

## Do's and Don'ts
- **Do** use uppercase and bold typography for prices, points, and wallet balances to feel like a sports scoreboard.
- **Do** animate bid updates with a temporary scale/flash effect to capture attention.
- **Don't** use standard browser inputs; style all inputs with dark slate borders, primary focus rings, and high-contrast white text.
