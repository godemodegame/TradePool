# TradePool UI - Form Elements Guide

## 🎨 Enhanced Form Styling

All form elements now feature the premium DeFi aesthetic with glass morphism and glowing effects.

---

## Input Fields

### Base Input (`.input`)

```tsx
<input 
  type="text"
  className="input"
  placeholder="Enter value"
/>
```

**Styling:**
- Background: Semi-transparent slate with backdrop blur
- Border: 1px solid white/10
- Padding: 16px × 10px (matches buttons)
- Border radius: 8px (rounded-lg)
- Transition: 300ms

**States:**
- **Default**: Semi-transparent with subtle border
- **Hover**: Brighter background (0.6 opacity) + brighter border
- **Focus**: Cyan border + cyan glow ring
- **Disabled**: 50% opacity, no hover effects

---

## Select Dropdowns ✨ Enhanced

### Standard Select

```tsx
<select className="input">
  <option value="">Choose...</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

**Enhanced Features:**
- ✨ Custom cyan arrow icon (SVG)
- ✨ Brighter cyan arrow on focus
- ✨ Gradient background on option hover/select
- ✨ Smooth transitions
- ✨ Cursor pointer
- ✨ Extra padding-right for arrow (44px)

**Arrow Colors:**
- Default: `#06b6d4` (cyan-500)
- Focus: `#22d3ee` (cyan-400, brighter)

**Option Styling:**
- Background: Dark slate `rgb(15, 23, 42)`
- Hover/Selected: Cyan-purple gradient overlay
- Color: White text
- Padding: 12px

---

## Labels

### Standard Label

```tsx
<label className="label">
  Field Name
</label>
```

### Required Field

```tsx
<label className="label label-required">
  Email Address
</label>
```
*Displays red asterisk automatically*

### Optional Field

```tsx
<label className="label label-optional">
  Middle Name
</label>
```
*Displays "(optional)" in gray automatically*

---

## Number Inputs

### Auto-styled Number Input

```tsx
<input 
  type="number"
  className="input"
  step="0.01"
  placeholder="0.00"
/>
```

**Features:**
- ✨ Browser spin buttons hidden
- ✨ Clean appearance
- ✨ Custom number controls (optional)
- ✨ Matches text input styling

### With Custom Controls (Optional)

```tsx
<div className="input-number-wrapper">
  <input 
    type="number"
    className="input"
    value={amount}
    onChange={(e) => setAmount(e.target.value)}
  />
  <div className="input-number-controls">
    <button 
      className="input-number-btn"
      onClick={() => setAmount(prev => prev + 1)}
    >
      ▲
    </button>
    <button 
      className="input-number-btn"
      onClick={() => setAmount(prev => prev - 1)}
    >
      ▼
    </button>
  </div>
</div>
```

---

## Textarea

### Multi-line Input

```tsx
<textarea 
  className="input"
  placeholder="Enter description"
  rows={4}
/>
```

**Features:**
- Minimum height: 100px
- Resize: Vertical only
- All standard input styling
- Smooth transitions

---

## Complete Form Example

```tsx
<div className="space-y-4">
  {/* Required Text Input */}
  <div>
    <label className="label label-required">
      Pool Name
    </label>
    <input 
      type="text"
      className="input"
      placeholder="Enter pool name"
      required
    />
  </div>

  {/* Select Dropdown */}
  <div>
    <label className="label">
      Token Type
    </label>
    <select className="input">
      <option value="">Select token...</option>
      <option value="usdc">USDC</option>
      <option value="usdt">USDT</option>
    </select>
  </div>

  {/* Optional Number Input */}
  <div>
    <label className="label label-optional">
      Amount
    </label>
    <input 
      type="number"
      className="input"
      placeholder="0.00"
      step="0.01"
    />
  </div>

  {/* Textarea */}
  <div>
    <label className="label label-optional">
      Description
    </label>
    <textarea 
      className="input"
      placeholder="Add details..."
      rows={3}
    />
  </div>

  {/* Submit Button */}
  <button className="btn btn-hero w-full">
    Create Pool
  </button>
</div>
```

---

## Visual States

### Input States

| State | Border | Background | Glow |
|-------|--------|------------|------|
| Default | white/10 | slate/50 | None |
| Hover | white/20 | slate/60 | None |
| Focus | cyan/50 | slate/50 | Cyan ring |
| Disabled | white/10 | slate/30 | None (dimmed) |

### Select States

| State | Arrow Color | Border | Glow |
|-------|-------------|--------|------|
| Default | #06b6d4 | white/10 | None |
| Hover | #06b6d4 | white/20 | None |
| Focus | #22d3ee | cyan/50 | Cyan ring |

---

## Accessibility

All form elements include:
- ✅ Proper contrast ratios (WCAG AA)
- ✅ Keyboard navigation support
- ✅ Clear focus indicators (cyan glow)
- ✅ Disabled state styling
- ✅ Placeholder text visibility
- ✅ Screen reader friendly labels

---

## Custom Arrow SVG

The select dropdown uses a custom SVG arrow:

**Default (Cyan #06b6d4):**
```svg
<svg width='12' height='8' viewBox='0 0 12 8'>
  <path d='M1 1L6 6L11 1' 
        stroke='#06b6d4' 
        stroke-width='2' 
        stroke-linecap='round'/>
</svg>
```

**Focus (Bright Cyan #22d3ee):**
```svg
<svg width='12' height='8' viewBox='0 0 12 8'>
  <path d='M1 1L6 6L11 1' 
        stroke='#22d3ee' 
        stroke-width='2' 
        stroke-linecap='round'/>
</svg>
```

---

## Best Practices

### Do's ✅
- Use `.input` class for all form elements
- Add `label-required` for required fields
- Use `label-optional` for optional clarity
- Match button styling (same height)
- Provide clear placeholder text
- Show validation feedback

### Don'ts ❌
- Don't mix input styles
- Don't skip labels (accessibility)
- Don't use different padding
- Don't forget disabled states
- Don't use browser default selects
- Don't ignore mobile users

---

## Validation States

### Error State

```tsx
<div>
  <label className="label label-required">
    Email
  </label>
  <input 
    className="input border-red-500/50"
    type="email"
  />
  <p className="text-xs text-red-400 mt-1">
    Please enter a valid email
  </p>
</div>
```

### Success State

```tsx
<div>
  <label className="label">
    Username
  </label>
  <input 
    className="input border-green-500/50"
    type="text"
  />
  <p className="text-xs text-green-400 mt-1">
    Username available!
  </p>
</div>
```

---

## Performance Notes

- SVG arrows are inline (no HTTP requests)
- Backdrop blur is GPU-accelerated
- Transitions use transform (60fps)
- Minimal DOM manipulation
- Efficient CSS selectors

---

**Version**: 2.1.0  
**Updated**: 2025-12-14  
**Includes**: Enhanced dropdown styling with custom arrows

---

*Built for the Sui ecosystem with ❤️*
