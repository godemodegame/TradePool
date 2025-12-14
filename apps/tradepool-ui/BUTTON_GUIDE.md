# TradePool UI - Button System Guide

## Button Variants

All buttons in the TradePool UI feature the modern glow/gradient aesthetic consistent with the DeFi theme.

### Primary Action Buttons

#### Hero Button (`.btn-hero`)
**When to use**: Main CTAs, Connect Wallet, Primary submissions
```tsx
<button className="btn-hero">Connect Wallet</button>
```
- **Colors**: Cyan to Purple gradient
- **Glow**: Strong cyan/purple glow
- **Hover**: Increased glow + lift effect
- **Use case**: Primary CTAs, most important actions

#### Hero Outline (`.btn-hero-outline`)
**When to use**: Secondary CTAs, Cancel actions
```tsx
<button className="btn-hero-outline">Cancel</button>
```
- **Colors**: Transparent with cyan border
- **Glow**: Subtle cyan glow on hover
- **Hover**: Brighter border + glow
- **Use case**: Secondary actions, less emphasis

#### Glow Button (`.btn-glow`)
**When to use**: Standard action buttons, Form submissions
```tsx
<button className="btn-glow">Submit</button>
```
- **Colors**: Cyan to Purple gradient
- **Glow**: Medium glow effect
- **Hover**: Increased glow
- **Use case**: Action buttons throughout the app

### Semantic Action Buttons

#### Success Button (`.btn-success`)
**When to use**: Deposit, Add, Create, Confirm
```tsx
<button className="btn-success">Deposit Liquidity</button>
```
- **Colors**: Emerald to Teal gradient (green)
- **Glow**: Green glow (emerald/teal)
- **Hover**: Increased green glow + lift
- **Use case**: Positive actions, deposits, confirmations

#### Danger Button (`.btn-danger`)
**When to use**: Withdraw, Delete, Remove, Close
```tsx
<button className="btn-danger">Withdraw Liquidity</button>
```
- **Colors**: Red to Rose gradient
- **Glow**: Red glow
- **Hover**: Increased red glow + lift
- **Use case**: Destructive actions, withdrawals, deletions

#### Warning Button (`.btn-warning`)
**When to use**: Caution actions, Important notices
```tsx
<button className="btn-warning">Proceed with Caution</button>
```
- **Colors**: Amber to Orange gradient
- **Glow**: Amber/orange glow
- **Hover**: Increased amber glow + lift
- **Use case**: Actions requiring caution, warnings

### Utility Buttons

#### Primary (`.btn-primary`)
**When to use**: Standard white button, high contrast
```tsx
<button className="btn-primary">View Details</button>
```
- **Colors**: White background, dark text
- **Glow**: Minimal shadow
- **Hover**: Slight background change
- **Use case**: Alternative primary button, high contrast needed

#### Secondary (`.btn-secondary`)
**When to use**: Less important actions, tertiary options
```tsx
<button className="btn-secondary">Skip</button>
```
- **Colors**: Slate with transparency
- **Glow**: None
- **Hover**: Slightly darker
- **Use case**: Tertiary actions, less emphasis

## Glow Effects

All gradient buttons (except primary/secondary) feature:
- **Default**: Subtle glow matching gradient colors
- **Hover**: 
  - Stronger glow (increased shadow spread)
  - Lift effect (`translateY(-2px)`)
  - Smooth transition (300ms)

### Glow Colors by Button Type

| Button | Glow Color 1 | Glow Color 2 |
|--------|-------------|--------------|
| Hero | Cyan (#06b6d4) | Purple (#9333ea) |
| Glow | Cyan (#06b6d4) | Purple (#9333ea) |
| Success | Emerald (#10b981) | Teal (#14b8a6) |
| Danger | Red (#ef4444) | Rose (#f43f5e) |
| Warning | Amber (#f59e0b) | Orange (#ea580c) |

## Usage Examples

### Form Submission
```tsx
<div className="flex gap-3">
  <button className="btn-hero-outline">Cancel</button>
  <button className="btn-glow">Submit</button>
</div>
```

### Pool Actions
```tsx
<div className="flex gap-3">
  <button className="btn-success">Deposit</button>
  <button className="btn-danger">Withdraw</button>
</div>
```

### Modal Actions
```tsx
<div className="flex gap-3">
  <button className="btn-secondary">Cancel</button>
  <button className="btn-hero">Confirm</button>
</div>
```

### Warning Dialog
```tsx
<div className="flex gap-3">
  <button className="btn-hero-outline">Go Back</button>
  <button className="btn-warning">Proceed Anyway</button>
</div>
```

## Button States

All buttons support standard states:

### Disabled
```tsx
<button className="btn-hero" disabled>Processing...</button>
```
- Opacity: 50%
- Cursor: not-allowed
- No hover effects

### Loading
```tsx
<button className="btn-glow" disabled>
  <svg className="animate-spin h-4 w-4 mr-2" />
  Loading...
</button>
```
- Include spinner icon
- Disable during loading
- Show loading text

### With Icons
```tsx
<button className="btn-success">
  <svg className="w-4 h-4 mr-2" />
  Deposit
</button>
```
- Icons should be 16x16 (w-4 h-4)
- Use `mr-2` or `ml-2` for spacing
- Keep icon color matching text

## Best Practices

### Do's ✅
- Use `btn-hero` for primary CTAs
- Use `btn-success` for deposits and positive actions
- Use `btn-danger` for withdrawals and destructive actions
- Match button importance to visual hierarchy
- Include icons for clarity when appropriate
- Show loading states during async operations

### Don'ts ❌
- Don't use multiple `btn-hero` on the same screen
- Don't mix semantic colors (e.g., green for delete)
- Don't use glow buttons for every action (causes visual noise)
- Avoid long text labels on buttons
- Don't forget disabled states
- Don't use danger button for non-destructive actions

## Accessibility

All buttons include:
- Proper contrast ratios (WCAG AA compliant)
- Clear focus indicators (glow ring)
- Disabled state styling
- Semantic color meanings
- Keyboard navigation support
- Screen reader friendly text

## Technical Details

### Base Class
All buttons use `.btn` base class which provides:
- Padding: 16px horizontal, 10px vertical
- Border radius: 8px
- Font weight: Medium/Semibold
- Transition: All 300ms
- Disabled styles
- Relative positioning for effects

### Glow Implementation
```css
box-shadow: 
  0 0 15px rgba(color1, 0.4),
  0 0 30px rgba(color2, 0.2);

/* On hover */
box-shadow: 
  0 0 25px rgba(color1, 0.6),
  0 0 50px rgba(color2, 0.4);
```

### Gradient Implementation
```css
background: linear-gradient(to right, color1, color2);
```

## Component Integration

### React Example
```tsx
const ActionButton = ({ action, loading, children }) => {
  const getButtonClass = () => {
    switch(action) {
      case 'deposit': return 'btn-success';
      case 'withdraw': return 'btn-danger';
      case 'submit': return 'btn-glow';
      default: return 'btn-hero-outline';
    }
  };

  return (
    <button 
      className={getButtonClass()}
      disabled={loading}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
};
```

---

**Updated**: 2025-12-14
**Version**: 2.0.0
