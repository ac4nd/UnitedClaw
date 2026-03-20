# UnitedClaw - Multi-Agent Development Environment

**UnitedClaw** is a comprehensive development environment for building, testing, and deploying multi-agent systems. Built as an Electron + Next.js hybrid application, it provides a visual interface for managing AI agents, coordinating team workflows, and monitoring execution in real-time.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd UnitedClaw

# Install dependencies
npm install

# Start development server
npm run dev
```

For Electron development mode:
```bash
npm run electron:dev
```

---

## 🏗️ Tech Stack

### Core Framework
- **Next.js 16.1.6** (App Router) - React framework with server-side rendering
- **TypeScript 5** - Type-safe JavaScript
- **React 19.2.3** - UI library with React Compiler enabled

### Styling & UI
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Reusable component library
- **Lucide React** - Icon library

### State & Data Management
- **Zustand** - Global state management
- **@octokit/rest** - GitHub API integration
- **simple-git** - Git operations

### Terminal & Execution
- **xterm + xterm-addon-fit** - Terminal emulator
- **node-pty** - Pseudo-terminal backend

### Desktop Runtime
- **Electron 40.6.1** - Cross-platform desktop framework
- **Concurrently** - Run multiple commands
- **Wait-on** - Wait for services

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router (pages, layouts, server actions)
│   ├── actions/           # Server actions (env-scanner.ts)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main application page
│   └── globals.css        # Global styles
├── components/
│   ├── layout/            # Layout components (Header, Sidebar)
│   ├── ui/                # shadcn/ui components (Button, Badge)
│   └── views/             # Page-level view components
│       ├── Editor/        # Code editor & execution monitor
│       ├── AgentBuilder/  # Agent configuration interface
│       ├── TeamBuilder/   # Team composition & coordination
│       ├── DashboardView/ # Project overview & metrics
│       └── SettingsModal/ # Application settings
├── interface/             # TypeScript type definitions
│   └── material/         # Material node interfaces
├── lib/                  # Utilities & helpers
│   ├── utils.ts          # Utility functions (cn, etc.)
│   ├── messageCreator.ts # Message creation utilities
│   └── mock-data.ts      # Mock data for development
└── store/                # Zustand global state
    └── useUnitedStore.ts # Main application store
```

---

## 🎯 Key Features

### 1. Visual Agent Editor
- Drag-and-drop interface for arranging AI agents
- Real-time execution monitoring
- Terminal integration for direct agent interaction
- Console panel for logging and debugging

### 2. Agent Builder
- Configure agent personalities, capabilities, and constraints
- Define tool integrations and permissions
- Set communication protocols and team roles
- Template system for common agent patterns

### 3. Team Builder
- Compose multi-agent teams with specialized roles
- Define coordination strategies and workflows
- Set up communication channels and protocols
- Monitor team performance and collaboration

### 4. Dashboard & Analytics
- Project overview with key metrics
- Execution history and performance tracking
- Resource utilization monitoring
- Team collaboration insights

### 5. Integrated Development Environment
- Git integration with visual diff tools
- Terminal emulator with pseudo-terminal backend
- Environment scanner for local setup detection
- Dark/light theme support

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run electron:dev     # Run Electron dev mode (Next.js + Electron concurrently)

# Build & Production
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
```

### Development Guidelines

This project follows strict coding standards documented in **[AGENTS.md](AGENTS.md)**. Key principles:

- **TypeScript Strict Mode**: All types must be explicit
- **Functional Components**: Use hooks, no class components
- **State Management**: Zustand with slice-based patterns
- **Styling**: Tailwind CSS v4 with dark mode support
- **Component Structure**: Follow shadcn/ui patterns

### Code Style Highlights

```typescript
// Type imports use 'import type'
import type { Metadata } from "next";
import type { ReactNode } from "react";

// Interface names use I prefix
export interface IBaseMaterialNode {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  isActive: boolean;
}

// Union types for polymorphic entities
export type AnyMaterialNode = IHumanNode | IAgentNode | IConnectorNode;

// Zustand store pattern
interface UnitedState {
  projects: any[];
  selectedProjectId: string;
  setProjects: (projects: any[]) => void;
  setProject: (id: string) => void;
}
```

---

## 🚦 Workflow Patterns

### Multi-Agent Coordination
UnitedClaw supports various agent coordination patterns:
- **Hierarchical**: Manager agents coordinate specialist agents
- **Democratic**: Agents vote on decisions
- **Market-Based**: Agents bid for tasks
- **Swarm**: Emergent behavior from simple rules

### Execution Monitoring
- Real-time agent status tracking
- Communication logging between agents
- Resource utilization metrics
- Error detection and recovery

### Integration Points
- GitHub repositories for version control
- External APIs for data sources
- Local development environments
- Cloud deployment targets

---

## 🧪 Testing & Quality

### Current Status
No test framework is currently configured. When adding tests:
1. Configure a test framework (Jest/Vitest recommended)
2. Update AGENTS.md with testing guidelines
3. Add test scripts to package.json

### Quality Checks
- ESLint for code style enforcement
- TypeScript strict mode for type safety
- Build validation before commits
- Manual testing of multi-agent workflows

---

## 🔧 Configuration

### Environment Variables
Create `.env.local` in the project root:

```bash
# GitHub API (for repository integration)
GITHUB_TOKEN=your_github_token

# Application settings
NEXT_PUBLIC_APP_NAME=UnitedClaw
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### Tailwind CSS v4
Configured in `tailwind.config.ts`:
- Dark mode: `class` strategy
- Custom colors and fonts
- Extended spacing scale

### Electron Configuration
Main entry point: `electron/main.js`
- Custom window settings
- IPC communication channels
- Native menu integration

### Application Configuration
Main configuration file: `unitedclaw.json`
- Runtime settings and feature flags
- CLI tool integrations (OpenCode, ClaudeCode, Codex)
- Custom application behavior overrides

---

## 🤝 Contributing

### Development Process
1. **Read AGENTS.md** for coding standards and patterns
2. **Create feature branches** from `main`
3. **Write clear commit messages** with context
4. **Test thoroughly** before submitting PRs
5. **Update documentation** for new features

### Code Review Guidelines
- Follow established TypeScript patterns
- Maintain backward compatibility where possible
- Add appropriate error handling
- Include necessary documentation updates

### Issue Reporting
- Use descriptive titles and clear steps to reproduce
- Include relevant logs or screenshots
- Specify environment details (OS, Node version, etc.)

---

## 📚 Documentation

- **[AGENTS.md](AGENTS.md)** - Detailed development guide with code patterns
- **Interface Types** - TypeScript definitions in `src/interface/`
- **Component Documentation** - Each component includes JSDoc comments

For architecture decisions and design rationale, refer to the AGENTS.md file which serves as the comprehensive development guide.

---

## 🎨 Design System

### Colors (Tailwind Classes)
- **Primary**: `indigo-500`, `indigo-600`
- **Secondary**: `slate-700`, `slate-800`
- **Success**: `emerald-500`, `emerald-600`
- **Warning**: `amber-500`, `amber-600`
- **Error**: `rose-500`, `rose-600`

### Typography
- **Sans**: Geist (via `next/font`)
- **Mono**: Geist Mono
- **Scale**: Tailwind's default typography scale

### Spacing
- **Base**: `0.25rem` (1 unit = 4px)
- **Scale**: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96

---

## 🔮 Roadmap

### Planned Features
- **Agent Marketplace**: Share and discover agent templates
- **Collaborative Editing**: Real-time multi-user agent design
- **Advanced Analytics**: Machine learning insights on agent performance
- **Plugin System**: Extend UnitedClaw with custom integrations
- **Cloud Deployment**: One-click deployment to cloud platforms

### Technical Improvements
- **Test Suite**: Comprehensive unit and integration tests
- **Performance Optimization**: Faster rendering and execution
- **Accessibility**: Full WCAG 2.2 compliance
- **Internationalization**: Multi-language support

---

## 📄 License

UnitedClaw is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- **Next.js Team** for the incredible React framework
- **Tailwind CSS** for the utility-first CSS approach
- **Electron Team** for cross-platform desktop runtime
- **All Contributors** who help improve UnitedClaw

---

**UnitedClaw** - Building the future of multi-agent development, one team at a time. 🦾