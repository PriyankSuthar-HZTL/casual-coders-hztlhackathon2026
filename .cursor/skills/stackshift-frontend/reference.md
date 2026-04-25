# Stackshift Frontend — Design Token Reference

## Color Palette

```
ink:          #0a0a0a       Primary text
ink-soft:     #1c1917       Softer dark
paper:        #f5f1ea       Main background
paper-2:      #ede7dc       Secondary background
paper-3:      #f9f5ee       Header gradient
line:         #1a1a1a       Borders
muted:        #6b6356       Secondary text
muted-soft:   #9a8f80       Tertiary text
accent:       #d94a1f       CTAs, active state
accent-2:     #b53a14       Hover accent
accent-soft:  #f2c5b4       Soft accent bg
brand-green:  #2d5a2d       Success, connected
green-soft:   #c8dfc4       Success backgrounds
brand-yellow: #c9a227       Warning/highlight
card:         #fffdf8       Card background
card-hi:      #ffffff       Elevated card
```

## Typography

| Family | Tailwind | Usage |
|--------|----------|-------|
| Inter Tight | `font-sans` | Body text, buttons, UI |
| Fraunces | `font-serif` | Headings, brand name |
| JetBrains Mono | `font-mono` | Labels, data, code |

### Common Text Sizes

- Page heading: `text-[42px]` or `text-[44px]` with `tracking-[-1.2px]` to `tracking-[-1.8px]`
- Step number: `font-mono text-[11px] tracking-[2.2px] uppercase text-accent`
- Label: `font-mono text-[10px] uppercase tracking-[2px] text-muted`
- Body: `text-[15.5px] leading-[1.6] text-muted`
- Small mono: `font-mono text-[11px] tracking-[1.5px] uppercase`
- Data/badge: `text-[12.5px] font-medium`

## Box Shadows

```
hard:        6px 6px 0 #1a1a1a       Cards, panels
hard-sm:     3px 3px 0 #1a1a1a       Badges, small elements
hard-hover:  7px 7px 0 #1a1a1a       Card hover state
btn-accent:  4px 4px 0 #d94a1f       Accent buttons
btn-ink:     4px 4px 0 #1a1a1a       Dark buttons
btn-active:  1px 1px 0 #d94a1f       Pressed button
step-active: 0 4px 0 #1a1a1a         Active stepper pill
focus:       0 0 0 3px rgba(217,74,31,0.25)  Focus ring
```

## Animations

| Class | Keyframes | Duration |
|-------|-----------|----------|
| `animate-fade-in` | translateY(8px) → 0, opacity 0→1 | 0.28s ease |
| `animate-stage-in` | translateY(6px) → 0, opacity 0→1 | 0.35s ease |
| `animate-scrim-in` | opacity 0→1 | 0.2s ease |
| `animate-conn-pulse` | opacity 1→0.45→1 | 2.2s infinite |

## Global CSS (globals.css)

- Body: `#f5f1ea` base with three radial gradients (accent, green, yellow)
- Selection: `background: #d94a1f; color: #f5f1ea`
- Focus-visible: `box-shadow: 0 0 0 3px rgba(217,74,31,0.25)` on buttons/inputs/links
- `.conf-fill`: absolute positioned bar using CSS variable `--w` for width

## Button Patterns

### Primary (accent)
```
bg-accent border border-accent text-paper font-sans font-medium text-sm
rounded-[3px] cursor-pointer transition-all duration-[120ms]
hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-btn-ink hover:bg-accent-2
disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none
```

### Ghost / Icon
```
w-[30px] h-[30px] inline-flex items-center justify-center
bg-transparent border border-transparent text-ink rounded-[3px]
transition-all duration-[120ms]
hover:bg-paper-2 hover:border-line/20 hover:text-accent
```

## Card Pattern

```
bg-card border border-line shadow-hard rounded-[3px] overflow-hidden
transition-all duration-[180ms]
hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-hover
```

## Layout Constants

- Main container: `px-12 py-14 max-w-[1400px] mx-auto`
- Card interior padding: `p-11`
- Header: `px-12 py-6 sticky top-0 z-20`
- Footer: `mt-20 px-12 py-10 border-t border-line`
- Stepper gap: `mb-12`
