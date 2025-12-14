# TradePool UI - Design System v2.0

## 🎨 Design Philosophy

Modern DeFi/Crypto aesthetic with:
- Dark navy/slate theme
- Glowing cyan & purple accents
- Glass morphism effects
- Smooth animations
- Professional typography

## Color Palette

### Base Colors
```css
--color-background: rgb(13, 20, 35)    /* Dark navy */
--color-surface: rgb(20, 27, 45)       /* Surface layer */
--color-accent-cyan: rgb(6, 182, 212)  /* Cyan accent */
--color-accent-purple: rgb(147, 51, 234) /* Purple accent */
```

### Gradients
- **Primary**: `from-cyan-500 to-purple-600`
- **Text**: `from-cyan-400 via-blue-400 to-purple-500`
- **Background**: `from-slate-900 via-slate-800 to-slate-900`

## Typography

### Font Stack
```css
Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

### Text Styles
- **Gradient Text**: `.gradient-text` - Cyan to purple gradient
- **Glow Text**: `.gradient-text-glow` - With drop shadow effect
- **Body**: `text-gray-300` to `text-white`
- **Muted**: `text-gray-400` to `text-gray-500`

## Components

### Buttons

#### Hero Button (`.btn-hero`)
- Gradient background (cyan → purple)
- Glowing box shadow
- Hover: Stronger glow + lift effect
- Use for: Primary CTAs

#### Hero Outline (`.btn-hero-outline`)
- Transparent with cyan border
- Subtle gradient background
- Hover: Brighter border + glow
- Use for: Secondary actions

#### Glow Button (`.btn-glow`)
- Gradient background
- Medium glow effect
- Use for: Action buttons

#### Standard Variants
- `.btn-primary` - White background
- `.btn-secondary` - Slate with blur
- `.btn-success` - Emerald green
- `.btn-danger` - Red

### Cards

#### Glass Card (`.card-glow`)
```css
background: linear-gradient(135deg, rgba(20,27,45,0.8), rgba(30,37,55,0.6))
backdrop-filter: blur(16px)
border: 1px solid rgba(255,255,255,0.1)
box-shadow: Multiple layers with glow
```

Features:
- Glass morphism effect
- Subtle cyan/purple glow
- Backdrop blur
- White border highlight

### Form Inputs

#### Input Fields (`.input`)
- Dark semi-transparent background
- White border (10% opacity)
- Focus: Cyan glow ring
- Placeholder: Gray 400

#### Labels (`.label`)
- Text: Gray 300
- Font: Medium weight
- Margin bottom: 0.5rem

### Info Boxes

Themed message boxes with matching borders and backgrounds:

- `.info-box-cyan` - Cyan theme
- `.info-box-purple` - Purple theme
- `.info-box-green` - Success/active
- `.info-box-red` - Error/danger

## Animations

### Keyframes

#### float (10s)
```css
Moves particles smoothly in Y/X with opacity changes
```

#### pulse-slow (10s)
```css
Gentle scale (1.0 → 1.08) and opacity (0.08 → 0.15)
```

#### glow-pulse (3s)
```css
Pulsing glow effect for buttons/cards
```

#### shimmer (3s)
```css
Background position animation for loading states
```

#### spin-slow (20s)
```css
Slow rotation for decorative rings
```

### Utilities

- `.animate-float` - Floating particles
- `.animate-pulse-slow` - Slow pulse
- `.animate-glow-pulse` - Glowing pulse
- `.animate-shimmer` - Shimmer effect
- `.animate-spin-slow` - Slow rotation

### Glow Effects

- `.glow-cyan` - Cyan box shadow
- `.glow-purple` - Purple box shadow
- `.glow-cyan-strong` - Stronger cyan glow
- `.text-glow-cyan` - Cyan text shadow
- `.text-glow-purple` - Purple text shadow

## Background Effects

### Layers (Bottom to Top)

1. **Gradient Mesh** - Pulsing cyan/purple gradient
2. **Grid Pattern** - Subtle 80x80px cyan grid
3. **Large Orbs** - 3 massive blurred gradient orbs
4. **Medium Orbs** - 2 smaller accent orbs
5. **Particles** - 7 floating glowing dots (cyan & purple)
6. **Spinning Rings** - 2 rotating border rings

### Particle Count
- Cyan particles: 4
- Purple particles: 3
- Total: 7 animated particles

### Orb Configuration
- Large: 3 orbs (800px, 700px, 1000px)
- Medium: 2 orbs (400px, 350px)
- All with heavy blur (90px-180px)

## Layout

### Header
- Sticky top positioning
- Backdrop blur
- Logo with glow effect
- Subtle border bottom

### Main Content
- Container max-width
- 8-unit vertical spacing
- Responsive grid (1 col → 2 cols)

### Footer
- Border top
- Backdrop blur
- Centered content
- Version indicator

## Responsive Design

### Breakpoints
- Mobile: < 768px (1 column)
- Desktop: >= 1024px (2 columns)

### Grid
```css
grid-cols-1 lg:grid-cols-2
```

## Usage Examples

### Welcome Card
```tsx
<div className="card-glow animate-glow-pulse">
  <h2 className="gradient-text-glow">Welcome</h2>
  <button className="btn-hero">Connect</button>
</div>
```

### Pool Card
```tsx
<div className="card-glow">
  <h3 className="gradient-text">Pool Name</h3>
  <div className="info-box-cyan">
    <p className="text-cyan-300">Details</p>
  </div>
</div>
```

### Action Button
```tsx
<button className="btn-glow">
  <span className="flex items-center gap-2">
    <Icon />
    Execute
  </span>
</button>
```

## Best Practices

### Do's ✅
- Use `card-glow` for main containers
- Apply gradient text to headings
- Use glow buttons for CTAs
- Add hover effects for interactivity
- Maintain consistent spacing

### Don'ts ❌
- Don't overuse glow effects
- Avoid mixing too many colors
- Don't use heavy animations on mobile
- Avoid low contrast text
- Don't nest glass cards deeply

## Accessibility

- Maintains WCAG AA contrast ratios
- Reduced motion support (via prefers-reduced-motion)
- Focus indicators with glow rings
- Semantic HTML structure
- Screen reader friendly

## Performance

- GPU-accelerated transforms
- Optimized blur values
- Minimal re-paints
- Efficient keyframe animations
- Lazy-loaded heavy effects

---

**Version**: 2.0.0
**Last Updated**: 2025-12-14
**Design Lead**: TradePool Team

---

## ✨ Design Consistency Update (2025-12-14)

### Unified Dimensions

All interactive elements (buttons, inputs, selects) now share **identical dimensions** for visual harmony:

#### Specifications
```css
Border Radius: 8px (rounded-lg)
Vertical Padding: 10px (py-2.5)
Horizontal Padding: 16px (px-4)
Transition: 300ms
Resulting Height: ~42px
```

#### Button Base Class
```css
.btn {
  @apply px-4 py-2.5 rounded-lg font-medium 
         transition-all duration-300 
         disabled:opacity-50 disabled:cursor-not-allowed 
         relative overflow-hidden;
}
```

#### Input Base Class
```css
.input {
  @apply w-full px-4 py-2.5 rounded-lg 
         text-white placeholder-gray-400 
         transition-all duration-300 backdrop-blur-sm;
}
```

### Applied To
- ✅ All button variants (hero, glow, success, danger, warning)
- ✅ All input fields
- ✅ All select dropdowns
- ✅ All textarea elements

### Visual Harmony
When buttons and form fields are used together (e.g., in forms), they now have:
- Same height
- Same border radius
- Same padding
- Same transition timing
- Professional, polished appearance

**Result**: Perfect visual alignment across all UI elements! 🎯
