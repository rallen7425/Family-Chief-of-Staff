# Family OS — Design System (v1 draft)

Tone: Superhuman's craft, Slack's friendliness, Cozi's color-coding, Yoto's kid-appeal — mature enough for parents, warm enough for kids. No purple, no yellow as a primary.

## Color

**Base**
| Name | Hex | Use |
|---|---|---|
| Mist | `#F7F9FB` | App background |
| Surface | `#FFFFFF` | Cards |
| Ink | `#23262B` | Primary text |
| Border | `#E1E5EB` | Card/input borders |
| Muted label | `#8B93A0` | Eyebrows, captions |
| Muted text | `#5C6570` | Secondary copy |

**Primary**
| Name | Hex |
|---|---|
| Blue (default) | `#3B6FE5` / hover `#2C56C4` |
| Green (alt, undecided) | `#2F9E67` / hover `#268A57` |

**Accents** — person/category coding (Cozi-style). One color per person or list; never decorative.
| Coral | Teal | Gold | Berry |
|---|---|---|---|
| `#F0714B` | `#2FA9A0` | `#E3A73A` | `#E8567A` |

## Type

- **Display / headlines:** Bricolage Grotesque, 600–700 weight
- **Body / UI:** Instrument Sans, 400–600 weight
- Scale: 12 caption · 15 body · 17 body-lg · 22 subhead · 26–44 title/display

## Components

- **Radius:** 20px cards, 12–16px buttons/inputs, 26px pill (chat bar)
- **Buttons:** primary = filled brand color, white text; secondary = `#EEF1F5` fill, ink text
- **Cards:** white, 1px `#E1E5EB` border, no shadow at rest
- **Person tags:** 10px color dot + name, accent color = that person's assigned color
- **Icons:** line-style SVG only, 2px stroke, rounded joins — no emoji, no dingbats

## Mobile pattern: colored header

Top of screen carries the primary brand color (Slack/Outlook-style band), white text and avatars — everything below sits on Mist. Reserved for primary navigation/greeting context only, not repeated elsewhere.

## Chat entry point

Persistent bottom bar, not a big CTA button — mirrors ChatGPT/Claude mobile: white rounded pill, "+" left (add/attach), grey placeholder ("Chat with Rufus"), mic + voice-mode icons right.

## Open question

Blue vs. green primary — not yet decided.

## Files

- `palette.png` — color reference sheet
- `mobile-screen.png` — sample "Today" dashboard applying the system
- Full editable canvas: https://claude.ai/code/artifact/bb7dcc1d-50fc-4e03-b0db-e70b1abe4c1d
