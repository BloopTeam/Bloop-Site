/**
 * Project Context Service
 * Provides full-project understanding, architecture analysis, and documentation
 */

export interface ProjectFile {
  path: string
  name: string
  type: 'file' | 'directory'
  language?: string
  size?: number
  lastModified?: Date
  content?: string
}

export interface DependencyInfo {
  name: string
  version: string
  type: 'production' | 'development'
  usedBy: string[]
  outdated?: boolean
  vulnerabilities?: number
}

export interface ComponentInfo {
  name: string
  path: string
  type: 'component' | 'hook' | 'utility' | 'service' | 'type' | 'page'
  exports: string[]
  imports: string[]
  dependencies: string[]
  dependents: string[]
  complexity: 'low' | 'medium' | 'high'
  linesOfCode: number
  documentation?: string
}

export interface ArchitectureLayer {
  name: string
  description: string
  components: string[]
  color: string
}

export interface TechDebtItem {
  id: string
  type: 'complexity' | 'duplication' | 'outdated' | 'documentation' | 'testing' | 'security'
  severity: 'low' | 'medium' | 'high' | 'critical'
  file: string
  line?: number
  description: string
  suggestion: string
  estimatedEffort: string
}

export interface ProjectMetrics {
  totalFiles: number
  totalLines: number
  languages: { name: string; percentage: number; files: number }[]
  testCoverage: number
  documentationScore: number
  complexityScore: number
  maintainabilityIndex: number
}

export interface RefactoringOpportunity {
  id: string
  type: 'extract-function' | 'extract-component' | 'rename' | 'move' | 'inline' | 'simplify'
  title: string
  description: string
  files: string[]
  impact: 'low' | 'medium' | 'high'
  automatable: boolean
}

export interface ProjectContext {
  name: string
  path: string
  framework?: string
  language: string
  files: ProjectFile[]
  components: ComponentInfo[]
  dependencies: DependencyInfo[]
  architecture: ArchitectureLayer[]
  techDebt: TechDebtItem[]
  metrics: ProjectMetrics
  refactoringOpportunities: RefactoringOpportunity[]
  lastAnalyzed: Date
}

class ProjectContextService {
  private projectContext: ProjectContext | null = null
  private analyzing = false

  constructor() {
    this.loadStoredContext()
  }

  private loadStoredContext() {
    const stored = localStorage.getItem('bloop-project-context')
    if (stored) {
      this.projectContext = JSON.parse(stored)
    }
  }

  private saveContext() {
    if (this.projectContext) {
      localStorage.setItem('bloop-project-context', JSON.stringify(this.projectContext))
    }
  }

  // Analyze project and build context
  async analyzeProject(projectPath: string): Promise<ProjectContext> {
    this.analyzing = true

    // Simulate analysis with demo data
    await new Promise(resolve => setTimeout(resolve, 1500))

    this.projectContext = {
      name: projectPath.split('/').pop() || 'Project',
      path: projectPath,
      framework: 'React',
      language: 'TypeScript',
      files: this.generateDemoFiles(),
      components: this.generateDemoComponents(),
      dependencies: this.generateDemoDependencies(),
      architecture: this.generateDemoArchitecture(),
      techDebt: this.generateDemoTechDebt(),
      metrics: this.generateDemoMetrics(),
      refactoringOpportunities: this.generateDemoRefactoring(),
      lastAnalyzed: new Date()
    }

    this.saveContext()
    this.analyzing = false

    return this.projectContext
  }

  private generateDemoFiles(): ProjectFile[] {
    return [
      { path: 'src/App.tsx', name: 'App.tsx', type: 'file', language: 'tsx', size: 4500 },
      { path: 'src/main.tsx', name: 'main.tsx', type: 'file', language: 'tsx', size: 350 },
      { path: 'src/components', name: 'components', type: 'directory' },
      { path: 'src/components/Header.tsx', name: 'Header.tsx', type: 'file', language: 'tsx', size: 2100 },
      { path: 'src/components/Sidebar.tsx', name: 'Sidebar.tsx', type: 'file', language: 'tsx', size: 3200 },
      { path: 'src/services', name: 'services', type: 'directory' },
      { path: 'src/services/api.ts', name: 'api.ts', type: 'file', language: 'ts', size: 5600 },
      { path: 'src/hooks', name: 'hooks', type: 'directory' },
      { path: 'src/hooks/useAuth.ts', name: 'useAuth.ts', type: 'file', language: 'ts', size: 890 },
      { path: 'src/types', name: 'types', type: 'directory' },
      { path: 'src/types/index.ts', name: 'index.ts', type: 'file', language: 'ts', size: 1200 }
    ]
  }

  private generateDemoComponents(): ComponentInfo[] {
    return [
      {
        name: 'App',
        path: 'src/App.tsx',
        type: 'component',
        exports: ['App'],
        imports: ['react', 'Header', 'Sidebar', 'MainContent'],
        dependencies: ['Header', 'Sidebar', 'MainContent', 'useAuth'],
        dependents: ['main.tsx'],
        complexity: 'medium',
        linesOfCode: 150,
        documentation: 'Main application component'
      },
      {
        name: 'Header',
        path: 'src/components/Header.tsx',
        type: 'component',
        exports: ['Header'],
        imports: ['react', 'lucide-react'],
        dependencies: ['Logo', 'Navigation'],
        dependents: ['App'],
        complexity: 'low',
        linesOfCode: 85,
        documentation: 'Application header with navigation'
      },
      {
        name: 'Sidebar',
        path: 'src/components/Sidebar.tsx',
        type: 'component',
        exports: ['Sidebar'],
        imports: ['react', 'lucide-react'],
        dependencies: ['SidebarItem', 'useLocalStorage'],
        dependents: ['App'],
        complexity: 'medium',
        linesOfCode: 120
      },
      {
        name: 'ApiService',
        path: 'src/services/api.ts',
        type: 'service',
        exports: ['apiService', 'ApiService'],
        imports: [],
        dependencies: [],
        dependents: ['App', 'Dashboard', 'UserProfile'],
        complexity: 'high',
        linesOfCode: 280,
        documentation: 'API client for backend communication'
      },
      {
        name: 'useAuth',
        path: 'src/hooks/useAuth.ts',
        type: 'hook',
        exports: ['useAuth'],
        imports: ['react'],
        dependencies: ['ApiService'],
        dependents: ['App', 'ProtectedRoute'],
        complexity: 'low',
        linesOfCode: 45
      }
    ]
  }

  private generateDemoDependencies(): DependencyInfo[] {
    return [
      { name: 'react', version: '18.2.0', type: 'production', usedBy: ['all components'], outdated: false },
      { name: 'react-dom', version: '18.2.0', type: 'production', usedBy: ['main.tsx'], outdated: false },
      { name: 'typescript', version: '5.0.4', type: 'development', usedBy: ['build'], outdated: true },
      { name: 'vite', version: '4.3.9', type: 'development', usedBy: ['build'], outdated: true },
      { name: 'lucide-react', version: '0.263.0', type: 'production', usedBy: ['Header', 'Sidebar', 'Icons'] },
      { name: 'tailwindcss', version: '3.3.2', type: 'development', usedBy: ['styles'], outdated: false },
      { name: '@types/react', version: '18.2.0', type: 'development', usedBy: ['types'], outdated: false }
    ]
  }

  private generateDemoArchitecture(): ArchitectureLayer[] {
    return [
      {
        name: 'Presentation Layer',
        description: 'UI components and pages',
        components: ['App', 'Header', 'Sidebar', 'Dashboard', 'Forms'],
        color: '#3b82f6'
      },
      {
        name: 'Business Logic',
        description: 'Hooks and state management',
        components: ['useAuth', 'useLocalStorage', 'useApi', 'Context Providers'],
        color: '#8b5cf6'
      },
      {
        name: 'Data Layer',
        description: 'API services and data handling',
        components: ['ApiService', 'WebSocketService', 'CacheService'],
        color: '#22c55e'
      },
      {
        name: 'Infrastructure',
        description: 'Configuration and utilities',
        components: ['Types', 'Constants', 'Utilities', 'Error Handlers'],
        color: '#f59e0b'
      }
    ]
  }

  private generateDemoTechDebt(): TechDebtItem[] {
    return [
      {
        id: 'td-1',
        type: 'complexity',
        severity: 'high',
        file: 'src/services/api.ts',
        line: 145,
        description: 'ApiService class has too many responsibilities (280 lines)',
        suggestion: 'Split into smaller, focused services (AuthService, DataService, etc.)',
        estimatedEffort: '4-6 hours'
      },
      {
        id: 'td-2',
        type: 'documentation',
        severity: 'medium',
        file: 'src/components/Sidebar.tsx',
        description: 'Missing component documentation and prop types description',
        suggestion: 'Add JSDoc comments for component and props',
        estimatedEffort: '30 minutes'
      },
      {
        id: 'td-3',
        type: 'duplication',
        severity: 'medium',
        file: 'src/components',
        description: 'Similar button styling logic repeated in 5 components',
        suggestion: 'Extract shared Button component or use utility classes',
        estimatedEffort: '2 hours'
      },
      {
        id: 'td-4',
        type: 'outdated',
        severity: 'low',
        file: 'package.json',
        description: 'TypeScript and Vite versions are outdated',
        suggestion: 'Update to latest stable versions',
        estimatedEffort: '1 hour'
      },
      {
        id: 'td-5',
        type: 'testing',
        severity: 'high',
        file: 'src/hooks/useAuth.ts',
        description: 'Critical authentication hook has no test coverage',
        suggestion: 'Add unit tests for auth flow and edge cases',
        estimatedEffort: '3-4 hours'
      },
      {
        id: 'td-6',
        type: 'security',
        severity: 'critical',
        file: 'src/services/api.ts',
        line: 52,
        description: 'API tokens stored in localStorage without encryption',
        suggestion: 'Use secure storage or httpOnly cookies',
        estimatedEffort: '2-3 hours'
      }
    ]
  }

  private generateDemoMetrics(): ProjectMetrics {
    return {
      totalFiles: 47,
      totalLines: 8420,
      languages: [
        { name: 'TypeScript', percentage: 65, files: 28 },
        { name: 'TSX', percentage: 25, files: 15 },
        { name: 'CSS', percentage: 8, files: 3 },
        { name: 'JSON', percentage: 2, files: 1 }
      ],
      testCoverage: 42,
      documentationScore: 58,
      complexityScore: 72,
      maintainabilityIndex: 68
    }
  }

  private generateDemoRefactoring(): RefactoringOpportunity[] {
    return [
      {
        id: 'ref-1',
        type: 'extract-component',
        title: 'Extract UserAvatar Component',
        description: 'Avatar rendering logic is duplicated in Header, Sidebar, and Comments',
        files: ['Header.tsx', 'Sidebar.tsx', 'Comments.tsx'],
        impact: 'medium',
        automatable: true
      },
      {
        id: 'ref-2',
        type: 'extract-function',
        title: 'Extract formatDate Utility',
        description: 'Date formatting logic repeated in 8 places',
        files: ['Dashboard.tsx', 'ActivityFeed.tsx', 'Comments.tsx'],
        impact: 'low',
        automatable: true
      },
      {
        id: 'ref-3',
        type: 'simplify',
        title: 'Simplify Conditional Rendering',
        description: 'Nested ternary operators in App.tsx can be simplified',
        files: ['App.tsx'],
        impact: 'low',
        automatable: false
      },
      {
        id: 'ref-4',
        type: 'move',
        title: 'Move Types to Dedicated Module',
        description: 'Inline type definitions should be moved to types folder',
        files: ['api.ts', 'Dashboard.tsx', 'useAuth.ts'],
        impact: 'medium',
        automatable: true
      }
    ]
  }

  // Getters
  getContext(): ProjectContext | null {
    return this.projectContext
  }

  isAnalyzing(): boolean {
    return this.analyzing
  }

  getComponents(): ComponentInfo[] {
    return this.projectContext?.components || []
  }

  getDependencies(): DependencyInfo[] {
    return this.projectContext?.dependencies || []
  }

  getArchitecture(): ArchitectureLayer[] {
    return this.projectContext?.architecture || []
  }

  getTechDebt(): TechDebtItem[] {
    return this.projectContext?.techDebt || []
  }

  getTechDebtBySeverity(severity: TechDebtItem['severity']): TechDebtItem[] {
    return this.getTechDebt().filter(item => item.severity === severity)
  }

  getMetrics(): ProjectMetrics | null {
    return this.projectContext?.metrics || null
  }

  getRefactoringOpportunities(): RefactoringOpportunity[] {
    return this.projectContext?.refactoringOpportunities || []
  }

  // Analysis helpers
  getDependencyGraph(): { nodes: string[]; edges: { from: string; to: string }[] } {
    const components = this.getComponents()
    const nodes = components.map(c => c.name)
    const edges: { from: string; to: string }[] = []

    components.forEach(component => {
      component.dependencies.forEach(dep => {
        if (nodes.includes(dep)) {
          edges.push({ from: component.name, to: dep })
        }
      })
    })

    return { nodes, edges }
  }

  getComplexityHotspots(): ComponentInfo[] {
    return this.getComponents()
      .filter(c => c.complexity === 'high')
      .sort((a, b) => b.linesOfCode - a.linesOfCode)
  }

  getDocumentationGaps(): ComponentInfo[] {
    return this.getComponents().filter(c => !c.documentation)
  }

  // Generate documentation
  generateDocumentation(componentName: string): string {
    const component = this.getComponents().find(c => c.name === componentName)
    if (!component) return ''

    return `# ${component.name}

**Path:** \`${component.path}\`
**Type:** ${component.type}
**Complexity:** ${component.complexity}
**Lines of Code:** ${component.linesOfCode}

## Description
${component.documentation || 'No description available.'}

## Exports
${component.exports.map(e => `- \`${e}\``).join('\n')}

## Dependencies
${component.dependencies.length > 0 
  ? component.dependencies.map(d => `- ${d}`).join('\n')
  : 'No dependencies'}

## Used By
${component.dependents.length > 0
  ? component.dependents.map(d => `- ${d}`).join('\n')
  : 'Not used by other components'}
`
  }

  // Clear context
  clearContext() {
    this.projectContext = null
    localStorage.removeItem('bloop-project-context')
  }
}

export const projectContextService = new ProjectContextService()
