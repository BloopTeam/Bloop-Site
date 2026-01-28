# Contributing to Bloop UI

We're excited that you're interested in contributing to Bloop UI. This document outlines the process and guidelines for contributing.

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/Bloop-UI.git
cd Bloop-UI
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:5173 in your browser

## Project Structure

```
Bloop-UI/
├── src/
│   ├── components/    # React components
│   ├── hooks/        # Custom React hooks
│   ├── utils/        # Utility functions
│   ├── config/       # Configuration files
│   └── types/        # TypeScript definitions
├── public/           # Static assets
└── dist/             # Production build (generated)
```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid `any` type unless absolutely necessary
- Use strict null checks

### React
- Use functional components with hooks
- Keep components small and focused
- Use custom hooks for reusable logic
- Follow the single responsibility principle

### Naming Conventions
- Components: PascalCase (`EditorArea.tsx`)
- Hooks: camelCase with 'use' prefix (`useKeyboardShortcut.ts`)
- Utils: camelCase (`codeAnalyzer.ts`)
- Constants: UPPER_SNAKE_CASE
- Variables/Functions: camelCase

### Code Style
- Use 2 spaces for indentation
- Maximum line length: 120 characters
- Use single quotes for strings
- Add trailing commas in multiline objects/arrays
- Use arrow functions for callbacks

## Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat(editor): add multi-cursor support

Implemented multi-cursor editing functionality with keyboard shortcuts
and mouse selection. Users can now edit multiple locations simultaneously.

Closes #42
```

```
fix(terminal): resolve command history persistence

Fixed issue where terminal command history was not being saved
across sessions. Now properly persists to localStorage.

Fixes #156
```

## Pull Request Process

### Before Submitting

1. **Test your changes**:
```bash
npm run build
npm run typecheck
```

2. **Update documentation**:
- Update README.md if adding features
- Add/update ARCHITECTURE.md for structural changes
- Include inline code comments

3. **Check for conflicts**:
```bash
git fetch upstream
git rebase upstream/main
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings/errors
- [ ] Tests pass locally
```

### Review Process

1. At least one maintainer approval required
2. All CI checks must pass
3. No merge conflicts
4. Code review feedback addressed

## Adding New Features

### 1. Custom Components

Create new components in `src/components/`:

```typescript
import { useState } from 'react'

interface MyComponentProps {
  title: string
  onAction: () => void
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  const [state, setState] = useState(false)
  
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  )
}
```

### 2. Custom Hooks

Create hooks in `src/hooks/`:

```typescript
import { useState, useEffect } from 'react'

export function useMyHook(initialValue: string) {
  const [value, setValue] = useState(initialValue)
  
  useEffect(() => {
    // Side effects here
  }, [value])
  
  return [value, setValue] as const
}
```

### 3. Utility Functions

Add utilities to `src/utils/`:

```typescript
/**
 * Utility function description
 * @param input - Input parameter description
 * @returns Return value description
 */
export function myUtility(input: string): string {
  // Implementation
  return input.toUpperCase()
}
```

## Testing Guidelines

### Unit Tests
```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders with title', () => {
    render(<MyComponent title="Test" onAction={() => {}} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Integration Tests
Test component interactions and data flow

### E2E Tests
Test complete user workflows

## Security Guidelines

### Input Validation
- Always sanitize user input
- Use TypeScript for type safety
- Validate on both client and server

### XSS Prevention
- Use React's built-in XSS protection
- Avoid dangerouslySetInnerHTML when possible
- Sanitize HTML when necessary

### Data Storage
- Encrypt sensitive data
- Use secure storage utilities
- Never store passwords in plaintext

## Performance Guidelines

### Optimization Tips
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Implement virtual scrolling for large lists
- Lazy load heavy components
- Optimize images and assets

### Profiling
- Use React DevTools Profiler
- Monitor bundle size
- Check for memory leaks
- Measure render times

## Documentation

### Code Comments
- Document complex logic
- Explain "why" not "what"
- Use JSDoc for functions
- Keep comments up-to-date

### README Updates
- Document new features
- Update installation instructions
- Add usage examples
- Include screenshots

## Getting Help

- **Issues**: Check existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community server
- **Email**: bloopcode@proton.me

## Code of Conduct

### Our Standards
- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on what's best for the community

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Public or private harassment
- Publishing others' private information

## License

By contributing to Bloop UI, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in the about section

Thank you for contributing to Bloop UI!
