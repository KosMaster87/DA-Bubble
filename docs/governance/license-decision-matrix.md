# License Strategy: DA-Bubble

## Goals for This Project

- ✅ Open source (public code)
- ✅ Commercial use permitted
- ✅ Patent protection for contributors + users
- ✅ Clear legal basis for forks and contributions

## License Matrix

| License    | Commercial Use | Copyleft | Patent Protection | Simplicity | Best For                  |
| ---------- | -------------- | -------- | ----------------- | ---------- | ------------------------- |
| MIT        | ✅ Yes         | ❌ No    | ❌ No             | ⭐⭐⭐    | Maximum freedom           |
| Apache-2.0 | ✅ Yes         | ❌ No    | ✅ Yes            | ⭐⭐      | Pro-bono projects         |
| GPLv3      | ✅ Yes         | ✅ Strong| ✅ Implicit       | ⭐         | Only if copyleft required |

## Recommendation: MIT

**Rationale:**

1. **Maximum usage freedom** — forks, commercial derivatives, everything allowed
2. **Community-friendly** — lowest barrier to entry for contributors
3. **Widely adopted** — many Angular/TS projects use MIT (Angular itself, RxJS, etc.)
4. **Short & understandable** — less legal uncertainty, even for learners

**Alternative: Apache-2.0**

If additional patent protection is desired → Apache-2.0 instead of MIT.
But for a learning & open-source project, MIT is sufficient and simpler.

## Additional Governance

Regardless of the license:

- Brand name and logo ("DA-Bubble") remain trademark-protected
- Forks must not be marketed as "from the original authors"
- CONTRIBUTING.md governs the PR process and coding standards
- CODE_OF_CONDUCT.md defines community behavior
