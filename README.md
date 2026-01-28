# Bloop Site

<p align="center">
  <img src="public/bloop-header.png" alt="Bloop" width="100%" />
</p>

<p align="center">
  <strong>The future of AI-powered development.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#why-bloop">Why Bloop</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#security">Security</a> •
  <a href="#the-vision">The Vision</a>
</p>

---

## What is Bloop?

Bloop is not just another code editor—it's a complete reimagining of how developers interact with AI to build software. Every pixel, every interaction, and every feature has been designed from the ground up to create the most intuitive, powerful, and secure coding experience ever made.

This repository contains the codebase for the Bloop website and application. This is the interface that developers deserve. This is Bloop.

---

## Features

### Beautiful by Default
- Stunning dark theme with signature magenta accents
- Clean, distraction-free interface
- Pixel-perfect design at every scale

### AI-First Architecture
- Integrated AI assistant panel
- Context-aware suggestions with `@` mentions
- Slash commands for instant actions (`/edit`, `/fix`, `/explain`)
- Multiple AI model support with intelligent routing

### Built for Speed
- Lightning-fast navigation
- Keyboard-first workflow with command palette
- Resizable panels with persistent layouts
- Instant file switching with zero lag

### Developer Experience
- Full-featured file explorer with context menus
- Integrated terminal with command history
- Source control integration with change tracking
- Extensions marketplace
- Real-time notifications
- Draggable tab management

### Thoughtful Details
- Breadcrumb navigation
- Advanced syntax highlighting
- Line numbers with breakpoint support
- Modified file indicators
- Intelligent search across files

---

## Why Bloop?

The tools developers use should be as innovative as the software they build. Current IDEs are bloated, slow, and weren't designed for the AI era.

**Bloop is different.**

We started from scratch, asking one question: *What would the perfect AI-powered development environment look like?*

The answer is an interface that:
- **Gets out of your way** — Clean, minimal, focused
- **Understands context** — AI that knows your codebase
- **Feels instant** — No lag, no loading, no waiting
- **Stays secure** — Built with security at its core

---

## Security

Security isn't an afterthought—it's foundational to everything we build.

### Content Security
- Strict Content Security Policy (CSP) enforcement
- XSS protection with sanitized rendering
- No unsafe inline scripts or styles

### Input Validation
- All user inputs sanitized before processing
- Command injection prevention
- Path traversal protection

### Data Protection
- No telemetry without explicit consent
- Local-first architecture—your code stays yours
- Encrypted storage for sensitive configurations

### Secure Development
- Strict TypeScript with no `any` types in production
- Dependency auditing with automated vulnerability scanning
- Regular security reviews and updates

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/BloopTeam/Bloop-Site.git

# Navigate to the project
cd Bloop-Site

# Install dependencies
npm install

# Run security audit
npm audit

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to begin.

### Build for Production

```bash
# Build with optimizations
npm run build

# Preview production build
npm run preview
```

---

## Architecture

```
src/
├── components/          # React components
│   ├── AssistantPanel   # AI assistant interface
│   ├── EditorArea       # Code editor with tabs
│   ├── LeftSidebar      # Navigation and file explorer
│   ├── MenuBar          # Top navigation with dropdowns
│   ├── TerminalPanel    # Integrated terminal
│   └── ...
├── App.tsx              # Root component
├── main.tsx             # Application entry point
└── index.css            # Global styles
```

---

## The Vision

Bloop is here to change the game.

We're not building an incremental improvement. We're building the development environment that will define the next decade of software engineering.

The future of coding is:
- **Intelligent** — AI that understands, not just autocompletes
- **Fast** — Milliseconds matter
- **Secure** — Trust is earned, not assumed
- **Beautiful** — Because craft matters

**This is just the beginning.**

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | Component architecture |
| TypeScript | Type-safe development |
| Vite | Build tooling |
| Lucide | Iconography |

---

## Contributing

We welcome contributions from developers who share our vision. Please read our contributing guidelines and code of conduct before submitting pull requests.

---

## License

MIT License — Build on it, improve it, make it yours.

---

<p align="center">
  <strong>Ready to change how you code?</strong>
</p>

<p align="center">
  Star this repository to follow our journey.
</p>
