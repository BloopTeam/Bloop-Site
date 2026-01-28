# Bloop Site - Tech Repository

<p align="center">
  <img src="public/bloop-header.png" alt="Bloop" width="100%" />
</p>

<p align="center">
  <strong>The technical foundation for Bloop's AI-powered development platform.</strong>
</p>

<p align="center">
  <a href="#about-this-repo">About This Repo</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#security">Security</a>
</p>

---

## About This Repository

This is the **technical/backend repository** for the Bloop website and application. This repository contains:

- **Frontend UI** - The complete user interface (included here as it's needed for the site)
- **Backend Infrastructure** - API services, server-side logic, and technical implementations
- **Site Architecture** - The full-stack implementation for the Bloop platform

> **Note:** This repository is separate from the [Bloop UI](https://github.com/BloopTeam/Bloop-UI) repository, which focuses solely on the UI component library and design system. The UI repo remains untouched and continues to serve as the standalone UI reference.

### Repository Structure

- `src/` - Source code including UI components and backend services
- `public/` - Static assets and public files
- Backend services and API implementations (to be developed)
- Infrastructure and deployment configurations

---

## What is Bloop?

Bloop is not just another code editor—it's a complete reimagining of how developers interact with AI to build software. Every pixel, every interaction, and every feature has been designed from the ground up to create the most intuitive, powerful, and secure coding experience ever made.

This repository houses the technical implementation that powers the Bloop platform, including both the user interface and the backend services that make it all work.

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

This repository follows a full-stack architecture:

```
src/
├── components/          # React UI components
│   ├── AssistantPanel   # AI assistant interface
│   ├── EditorArea       # Code editor with tabs
│   ├── LeftSidebar      # Navigation and file explorer
│   ├── MenuBar          # Top navigation with dropdowns
│   ├── TerminalPanel    # Integrated terminal
│   └── ...
├── config/              # Configuration files
├── hooks/               # React hooks
├── utils/               # Utility functions and services
│   ├── codeAnalyzer.ts  # Code analysis utilities
│   ├── fileSystem.ts    # File system operations
│   ├── gitUtils.ts      # Git integration
│   └── security.ts      # Security utilities
├── App.tsx              # Root component
├── main.tsx             # Application entry point
└── index.css            # Global styles

# Backend services (to be developed)
├── api/                 # API routes and endpoints
├── services/            # Business logic services
└── infrastructure/      # Deployment and infrastructure configs
```

### Development Focus

This repository is where we build:
- **Backend APIs** - RESTful and GraphQL endpoints
- **Server-side Services** - Business logic and data processing
- **Infrastructure** - Deployment configurations, CI/CD pipelines
- **Integration Layer** - Connecting UI with backend services
- **Performance Optimization** - Caching, CDN, and optimization strategies

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | Component architecture |
| TypeScript | Type-safe development |
| Vite | Build tooling and dev server |
| Tailwind CSS | Styling and design system |
| Lucide React | Iconography |

### Backend (Planned)
- API framework (to be determined)
- Database and data layer
- Authentication and authorization
- Real-time communication
- AI/ML service integration

### Infrastructure
- Vercel (deployment platform)
- CI/CD pipelines
- Monitoring and analytics

---

## Development Workflow

This repository is actively developed for the Bloop platform. When working on this codebase:

1. **UI Changes** - UI components are included here for the site, but major UI design work should be coordinated with the [Bloop UI](https://github.com/BloopTeam/Bloop-UI) repository
2. **Backend Development** - All backend, API, and infrastructure work happens here
3. **Integration** - This is where UI and backend come together

---

## Contributing

We welcome contributions from developers who share our vision. Please read our contributing guidelines and code of conduct before submitting pull requests.

**Note:** For UI/design contributions, please also check the [Bloop UI](https://github.com/BloopTeam/Bloop-UI) repository.

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
