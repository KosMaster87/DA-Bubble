---
applyTo: "da-bubble/src/app/**/*.html"
---

# Templates And Accessibility

- Keep templates simple; move branching, formatting, and filtering into `computed()` or helpers.
- Use semantic elements where possible.
- Buttons should be real buttons, links real links.
- Preserve keyboard reachability, focus order, and descriptive labels for interactive controls.
- Ensure loading, empty, and error states stay visible and understandable.
- Avoid hardcoded user-facing copy when the surrounding feature already routes text through the i18n layer.
- For repeated collections, prefer stable tracking strategies when the Angular control flow supports them.
