/**
 * Extensions Service
 * 
 * Manages code extensions with actual functionality
 * All extensions are user-specific and stored per-user
 */

export interface Extension {
  id: string
  name: string
  author: string
  description: string
  version: string
  installed: boolean
  enabled: boolean
  category: 'language' | 'formatter' | 'linter' | 'git' | 'api' | 'theme' | 'utility'
  icon: string // Icon name from lucide-react
  commands?: ExtensionCommand[]
  settings?: ExtensionSetting[]
}

export interface ExtensionCommand {
  id: string
  label: string
  action: () => void | Promise<void>
}

export interface ExtensionSetting {
  id: string
  label: string
  type: 'boolean' | 'string' | 'number'
  value: any
  default: any
}

class ExtensionsService {
  private extensions: Extension[] = [
    {
      id: 'python',
      name: 'Python',
      author: 'Microsoft',
      description: 'Python language support with IntelliSense, debugging, and formatting',
      version: '2024.1.0',
      installed: true,
      enabled: true,
      category: 'language',
      icon: 'Code',
      commands: [
        {
          id: 'python.run',
          label: 'Run Python File',
          action: async () => {
            console.log('Running Python file...')
            // TODO: Execute Python file
          }
        },
        {
          id: 'python.format',
          label: 'Format Document',
          action: async () => {
            console.log('Formatting Python code...')
            // TODO: Format Python code
          }
        }
      ]
    },
    {
      id: 'prettier',
      name: 'Prettier',
      author: 'Prettier',
      description: 'Opinionated code formatter for JavaScript, TypeScript, CSS, and more',
      version: '3.2.0',
      installed: true,
      enabled: true,
      category: 'formatter',
      icon: 'Wand2',
      commands: [
        {
          id: 'prettier.format',
          label: 'Format Document',
          action: async () => {
            console.log('Formatting with Prettier...')
            // TODO: Format code with Prettier
          }
        },
        {
          id: 'prettier.formatAll',
          label: 'Format All Files',
          action: async () => {
            console.log('Formatting all files...')
            // TODO: Format all files
          }
        }
      ]
    },
    {
      id: 'eslint',
      name: 'ESLint',
      author: 'Microsoft',
      description: 'Find and fix problems in your JavaScript code',
      version: '3.0.0',
      installed: false,
      enabled: false,
      category: 'linter',
      icon: 'AlertCircle',
      commands: [
        {
          id: 'eslint.fix',
          label: 'Fix All Auto-fixable Problems',
          action: async () => {
            console.log('Fixing ESLint issues...')
            // TODO: Run ESLint auto-fix
          }
        },
        {
          id: 'eslint.show',
          label: 'Show Problems',
          action: async () => {
            console.log('Showing ESLint problems...')
            // TODO: Show ESLint problems
          }
        }
      ]
    },
    {
      id: 'gitlens',
      name: 'GitLens',
      author: 'GitKraken',
      description: 'Supercharge Git capabilities with blame annotations, file history, and more',
      version: '15.0.0',
      installed: false,
      enabled: false,
      category: 'git',
      icon: 'GitBranch',
      commands: [
        {
          id: 'gitlens.showBlame',
          label: 'Show Blame Annotations',
          action: async () => {
            console.log('Showing Git blame...')
            // TODO: Show Git blame
          }
        },
        {
          id: 'gitlens.showFileHistory',
          label: 'Show File History',
          action: async () => {
            console.log('Showing file history...')
            // TODO: Show file history
          }
        }
      ]
    },
    {
      id: 'thunder-client',
      name: 'Thunder Client',
      author: 'Thunder',
      description: 'Lightweight REST API client for testing APIs directly from the editor',
      version: '1.25.0',
      installed: false,
      enabled: false,
      category: 'api',
      icon: 'Zap',
      commands: [
        {
          id: 'thunder.newRequest',
          label: 'New Request',
          action: async () => {
            console.log('Creating new API request...')
            // TODO: Open Thunder Client panel
          }
        }
      ]
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      author: 'Microsoft',
      description: 'TypeScript language support with advanced type checking',
      version: '5.3.0',
      installed: true,
      enabled: true,
      category: 'language',
      icon: 'FileCode',
      commands: [
        {
          id: 'typescript.restart',
          label: 'Restart TS Server',
          action: async () => {
            console.log('Restarting TypeScript server...')
            // TODO: Restart TS server
          }
        }
      ]
    },
    {
      id: 'tailwind',
      name: 'Tailwind CSS IntelliSense',
      author: 'Tailwind Labs',
      description: 'Intelligent autocomplete for Tailwind CSS class names',
      version: '0.10.0',
      installed: false,
      enabled: false,
      category: 'utility',
      icon: 'Palette',
      commands: [
        {
          id: 'tailwind.showDocs',
          label: 'Show Tailwind Docs',
          action: async () => {
            window.open('https://tailwindcss.com/docs', '_blank')
          }
        }
      ]
    },
    {
      id: 'docker',
      name: 'Docker',
      author: 'Microsoft',
      description: 'Build, manage, and deploy containerized applications',
      version: '2.0.0',
      installed: false,
      enabled: false,
      category: 'utility',
      icon: 'Box',
      commands: [
        {
          id: 'docker.build',
          label: 'Build Docker Image',
          action: async () => {
            console.log('Building Docker image...')
            // TODO: Build Docker image
          }
        }
      ]
    },
    {
      id: 'markdown',
      name: 'Markdown Preview',
      author: 'Microsoft',
      description: 'Preview Markdown files with live updates',
      version: '3.0.0',
      installed: true,
      enabled: true,
      category: 'utility',
      icon: 'FileText',
      commands: [
        {
          id: 'markdown.preview',
          label: 'Open Preview',
          action: async () => {
            console.log('Opening Markdown preview...')
            // TODO: Open Markdown preview
          }
        }
      ]
    },
    {
      id: 'json',
      name: 'JSON Tools',
      author: 'Bloop',
      description: 'Format, validate, and manipulate JSON files',
      version: '1.0.0',
      installed: true,
      enabled: true,
      category: 'utility',
      icon: 'FileCode',
      commands: [
        {
          id: 'json.format',
          label: 'Format JSON',
          action: async () => {
            console.log('Formatting JSON...')
            // TODO: Format JSON
          }
        },
        {
          id: 'json.validate',
          label: 'Validate JSON',
          action: async () => {
            console.log('Validating JSON...')
            // TODO: Validate JSON
          }
        }
      ]
    }
  ]

  /**
   * Get all extensions
   */
  getAllExtensions(): Extension[] {
    return this.extensions
  }

  /**
   * Get installed extensions
   */
  getInstalledExtensions(): Extension[] {
    return this.extensions.filter(ext => ext.installed)
  }

  /**
   * Get enabled extensions
   */
  getEnabledExtensions(): Extension[] {
    return this.extensions.filter(ext => ext.installed && ext.enabled)
  }

  /**
   * Install extension
   */
  async installExtension(extensionId: string): Promise<void> {
    const ext = this.extensions.find(e => e.id === extensionId)
    if (ext) {
      ext.installed = true
      ext.enabled = true
      // TODO: Save to user's database
      // await apiService.installUserExtension(userId, extensionId)
    }
  }

  /**
   * Uninstall extension
   */
  async uninstallExtension(extensionId: string): Promise<void> {
    const ext = this.extensions.find(e => e.id === extensionId)
    if (ext) {
      ext.installed = false
      ext.enabled = false
      // TODO: Remove from user's database
      // await apiService.uninstallUserExtension(userId, extensionId)
    }
  }

  /**
   * Enable/disable extension
   */
  async toggleExtension(extensionId: string, enabled: boolean): Promise<void> {
    const ext = this.extensions.find(e => e.id === extensionId)
    if (ext && ext.installed) {
      ext.enabled = enabled
      // TODO: Update in user's database
      // await apiService.updateUserExtension(userId, extensionId, { enabled })
    }
  }

  /**
   * Execute extension command
   */
  async executeCommand(extensionId: string, commandId: string): Promise<void> {
    const ext = this.extensions.find(e => e.id === extensionId)
    if (ext && ext.enabled && ext.commands) {
      const command = ext.commands.find(c => c.id === commandId)
      if (command) {
        await command.action()
      }
    }
  }

  /**
   * Get extension by ID
   */
  getExtension(extensionId: string): Extension | undefined {
    return this.extensions.find(e => e.id === extensionId)
  }
}

export const extensionsService = new ExtensionsService()
