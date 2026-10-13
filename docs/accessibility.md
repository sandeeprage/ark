# Accessibility requirements

ARK targets WCAG 2.2 AA. This is a development target, not a conformance certification.

Before changing an interactive component:

- Check normal text at 4.5:1 contrast, large text and meaningful UI boundaries at 3:1, in both themes. Do not use colour as the only signal.
- Give every control a stable accessible name. Associate help/errors with `aria-describedby` and mark invalid fields. Use a visible, focusable error summary for schema/server failures; preserve entered values.
- Test Tab/Shift+Tab, Enter/Space, Escape, focus visibility, dialog focus trapping/restoration, and Skip to content. Use native controls or established ARIA patterns.
- Announce async progress, save success, errors, and changed counts without overwhelming duplicate live regions. Keep unchanged save actions disabled.
- Verify reflow at 320/360 px, zoom, target spacing, readable text, and reduced-motion behavior.
- Keep image descriptions meaningful and hide decorative icons from assistive technology.
- Manually check important journeys with NVDA/Chrome and VoiceOver/Safari before claiming screen-reader coverage. Record the environment and findings; automated tests are complementary.

Reference: https://www.w3.org/TR/WCAG22/
