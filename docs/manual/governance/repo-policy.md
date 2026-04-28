# Repository Policy — DA-Bubble

## Positioning

DA-Bubble is a **public, open-source project** (MIT license).
Commercial use, forks, and contributions are welcome.

## Core Goals

- 🔓 **Transparency:** Source code, architecture, and designs are publicly accessible
- 🏗️ **Quality:** Production-grade code, tests, documentation
- 🔒 **Security:** Clear separation of public ↔ private operational data
- 🚀 **Stability:** No breaking changes without a major version bump

## Mandatory Rules

### 1. Code Hygiene

- ✅ TypeScript Strict Mode
- ✅ ESLint + Prettier (automated formatting)
- ✅ Vitest for new behavior (TDD-first)
- ✅ Conventional Commits: `type(scope): message`
- ❌ No `console.log()` without reason
- ❌ No `any` types

### 2. Security

- ❌ **No secrets, API keys, or productive .env.\*.ts values in the repo**
- ❌ No personal data from real users
- ✅ .env.example shows only empty keys (no GitGuardian alerts)
- ✅ Firebase Security Rules must be strict (firestore.rules, storage.rules)
- ✅ Auth flows must be documented (SECURITY.md)

### 3. Documentation

- ✅ README with setup instructions
- ✅ CONTRIBUTING.md for new contributors
- ✅ CHANGELOG.md for each release
- ✅ JSDoc on public methods
- ✅ Architecture decisions in `.github/` or `docs/`

### 4. PR Standard

- ✅ At least 1 code review before merge
- ✅ Vitest must pass (`ng test --watch=false`)
- ✅ No "merge without CI" on main/develop
- ✅ Description includes: context, testing, risks, impacted paths

## Public vs. Private Data

### ✅ Public (GitHub)

- Source code (src/, .github/, docs/)
- Architecture and design decisions
- Tests and test coverage
- Configuration templates (.env.example, .firebaserc-example)
- Issue descriptions and roadmap
- Build & deploy scripts

### 🔒 Private (Not in the Repo)

- Production Firebase keys
- Production .env.\*.ts values
- Production database credentials
- Real user data (test data only when anonymized)
- IONOS FTP credentials
- Private keys or auth tokens

## Trademark & Name Usage

**DA-Bubble Brand:**

- Logo, name, and colors are trademark-protected
- Forks must not be marketed as "Official DA-Bubble"
- Derivative works must be clearly labeled as "Based on DA-Bubble"

**Contributor Credit:**

- All contributors are listed in CONTRIBUTORS.md
- Larger features are mentioned in release notes

## Governance Files

- **LICENSE** — MIT (full text)
- **CONTRIBUTING.md** — PR process, coding standards
- **.github/SECURITY.md** — security policy, vulnerability reporting
- **.github/copilot-instructions.md** — project rules for Copilot
- **docs/governance/** — architecture decisions, mission
- **CHANGELOG.md** — version history & breaking changes
