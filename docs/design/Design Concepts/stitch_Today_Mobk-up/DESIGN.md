---
name: Rufus
colors:
  surface: '#faf9f7'
  surface-dim: '#dadad8'
  surface-bright: '#faf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeec'
  surface-container-high: '#e9e8e6'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#464740'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#77786f'
  outline-variant: '#c7c7bd'
  surface-tint: '#5c614d'
  primary: '#535845'
  on-primary: '#ffffff'
  primary-container: '#6b705c'
  on-primary-container: '#eff4db'
  inverse-primary: '#c4c9b1'
  secondary: '#5f604b'
  on-secondary: '#ffffff'
  secondary-container: '#e2e1c7'
  on-secondary-container: '#63644f'
  tertiary: '#685140'
  on-tertiary: '#ffffff'
  tertiary-container: '#826957'
  on-tertiary-container: '#ffefe5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e5cc'
  primary-fixed-dim: '#c4c9b1'
  on-primary-fixed: '#191d0e'
  on-primary-fixed-variant: '#444937'
  secondary-fixed: '#e5e4ca'
  secondary-fixed-dim: '#c8c8af'
  on-secondary-fixed: '#1c1d0c'
  on-secondary-fixed-variant: '#474835'
  tertiary-fixed: '#fddcc6'
  tertiary-fixed-dim: '#e0c1ab'
  on-tertiary-fixed: '#28180b'
  on-tertiary-fixed-variant: '#584232'
  background: '#faf9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e3e2e0'
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 120px
---

## Brand & Style
The design system for this project embodies the role of a "Chief of Staff" for the modern home. It is built upon the concept of **Quiet Competence**—a visual language that is highly organized and systematic, yet radiates the warmth of a well-tended household. 

The aesthetic is a blend of **Minimalism** and **Tactile Modernism**. It avoids the sterile coldness of typical productivity tools by using organic tones and soft transitions. The goal is to evoke an emotional response of relief and reliability; the interface should feel like a deep breath, signaling to the user that everything is under control.

The target audience is busy families who require high utility without the cognitive load of a complex enterprise dashboard. Every design decision prioritizes clarity, approachability, and a "premium boutique" service feel.

## Colors
This design system utilizes an earth-toned, "Warm Sage" palette. The primary seed color (`#6B705C`) serves as the anchor, providing a sense of grounded authority and calm. 

- **Primary:** Used for key actions, active states, and primary navigation elements.
- **Secondary & Tertiary:** These muted, desaturated tones are used for secondary buttons and categorizing different family members or task types.
- **Surface Tones:** Instead of pure white, the system uses a soft cream (`#F8F7F5`) to reduce eye strain and enhance the "home" feeling.
- **Text & Contrast:** High-contrast text is handled by a deep charcoal version of the primary olive to maintain a soft, non-aggressive reading experience.

## Typography
The typography strategy pairings create a balance between "Official Document" and "Friendly Note." 

**Noto Serif** is used for headlines to provide a sophisticated, editorial look that suggests wisdom and organization. Its classic proportions elevate the "Chief of Staff" concept.

**Manrope** is the workhorse for all body copy and functional labels. Its modern, geometric construction ensures excellent legibility on mobile devices while maintaining a friendly, open character. 

Hierarchy is established through clear scale shifts and generous line heights, ensuring that even dense schedules or grocery lists remain easy to scan at a glance.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid grid**. On desktop, content is centered within a 12-column grid with a maximum width of 1280px to prevent information from feeling scattered. On mobile, the system shifts to a single-column layout with 20px side margins.

Spacing follows an 8px base rhythm. To emphasize the "calm" nature of the app, we utilize generous internal padding (MD and LG units) within cards and containers. This "breathability" is essential to avoid the feeling of a cluttered to-do list. Grouped items (like family members) should use tight (XS/SM) spacing to show relationship, while distinct sections use LG spacing to signal a transition in context.

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layers** rather than heavy shadows. We use subtle shifts in surface color to indicate stacking.

- **Level 0 (Background):** The base cream surface.
- **Level 1 (Cards/Containers):** Pure white surfaces with a very soft, 2px border in a lightened version of the primary color.
- **Level 2 (Interactive/Floating):** Reserved for modals or active drawers. These utilize a "Soft Ambient Shadow"—a low-opacity (8%) blur using the primary olive-grey color to create a natural, organic lift rather than a digital drop shadow.

This approach creates a flat, clean interface that feels layered and physical without the complexity of skeuomorphism.

## Shapes
The shape language is defined as **Soft**. Standard components like buttons and input fields utilize a 0.25rem (4px) radius. Larger containers, such as task cards or family profile modules, use `rounded-lg` (8px) to soften the overall visual footprint.

The use of "Soft" roundedness instead of "Pill" shapes maintains a sense of structure and professional organization, while avoiding the clinical sharpness of 0px corners. This middle ground reinforces the brand as both a "Staff" member (professional) and a "Home" companion (soft).

## Components

### Buttons
Primary buttons are solid fills of the Primary color with white Manrope text. Secondary buttons use an outline style with the Secondary color. All buttons have a height of 48px to be "thumb-friendly" for parents on the go.

### Cards
Cards are the primary organizational unit. They feature white backgrounds, `rounded-lg` corners, and a subtle Level 1 elevation. For family-specific cards, a small color-coded "tag" or "tab" on the left edge indicates which family member the content belongs to.

### Input Fields
Inputs are minimal: a bottom border only in the Primary color, or a fully enclosed box with a very light background (`#F1F1ED`). Labels sit persistently above the field in `label-sm`.

### Chips & Tags
Used for quick filtering (e.g., "Urgent," "School," "Groceries"). These use the Tertiary color with a lower opacity background and darker text for a soft, integrated look.

### Help Icons
Icons should be thin-stroke (2pt) and slightly rounded. They are always accompanied by a label or are placed within a 40px circular "touch target" to ensure ease of use.

### Family Pulse
A unique component to this system: a horizontal list of circular avatars at the top of the main view, allowing users to quickly filter the "Chief of Staff" view by family member. Active states are indicated by a 2px primary color ring around the avatar.