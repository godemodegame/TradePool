# Background Effects Component

## Overview
Added advanced background effects component with animated elements to enhance the visual appeal of the TradePool UI.

## Features

### 1. Grid Pattern
- Subtle grid overlay (60x60px)
- Very low opacity (0.02) for minimal distraction
- Linear gradient lines in both horizontal and vertical directions

### 2. Gradient Orbs
- **Three large gradient orbs** with blur effects:
  - Top-left: 600x600px blue orb with 120px blur
  - Bottom-right: 500x500px purple orb with 100px blur (2s delay)
  - Center: 800x800px blue orb with 150px blur (static)
- Slow pulse animation (8s cycle)
- Very subtle opacity (3-5%) for ambient lighting

### 3. Floating Particles
- **Five animated particles** at different positions
- Sizes: 1px to 2px
- Colors: Blue and purple with varying opacity (30-50%)
- Float animation: 8s cycle with smooth easing
- Staggered animation delays (0s, 1s, 1.5s, 2s, 3s)

## Animations

### Float Animation (8s cycle)
- Moves particles in Y and X directions
- Opacity transitions for fade in/out effect
- Creates organic, floating movement

### Pulse-Slow Animation (8s cycle)
- Subtle scale transformation (1.0 to 1.05)
- Opacity pulsing (0.05 to 0.1)
- Applied to gradient orbs for ambient glow

## Implementation

### Component Location
`src/components/BackgroundEffects.tsx`

### CSS Utilities
Added in `src/index.css`:
- `@keyframes float` - Particle floating animation
- `@keyframes pulse-slow` - Orb pulsing animation
- `.animate-float` - Float animation utility class
- `.animate-pulse-slow` - Pulse animation utility class

### Integration
Imported and rendered in `App.tsx` as the first element:
```tsx
<BackgroundEffects />
```

## Technical Details

### Layer Management
- Fixed positioning with `pointer-events-none` to avoid blocking interactions
- Positioned behind all content using z-index layering
- Overflow hidden to prevent scrollbars

### Performance
- Uses CSS transforms and opacity for GPU acceleration
- Minimal DOM elements (9 total)
- Blur effects are hardware-accelerated

### Colors
- Blue: `bg-blue-400`, `bg-blue-500`
- Purple: `bg-purple-400`, `bg-purple-500`
- All with opacity modifiers (/3, /5, /30, /40, /50)

## Visual Impact
- Creates depth and ambiance
- Subtle, non-distracting movement
- Professional, modern aesthetic
- Complements the dark navy theme
- Enhances the overall user experience

