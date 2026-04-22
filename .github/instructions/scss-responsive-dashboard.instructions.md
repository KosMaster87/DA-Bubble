---
applyTo: "da-bubble/src/**/*.scss"
---

# SCSS And Responsive Dashboard

- DA-Bubble is a responsive chat application with critical desktop, tablet, and mobile dashboard states.
- Preserve existing layout behavior for sidebar, content area, and thread panel when touching dashboard styles.
- Prefer extending existing variables, partials, and shared style conventions before adding one-off values.
- Keep selectors readable and scoped to the component.
- Avoid styling fixes that only work for one breakpoint.
- Check for PWA-specific display behavior, safe areas, and standalone mode when relevant.
- Do not hide overflow or force heights in ways that break scrolling, thread view, or mobile composition flows.
