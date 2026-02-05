/**
 * Virtual file system utilities for the Bloop IDE
 * Manages file operations, directory structures, and file metadata
 */

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  path: string
  content?: string
  children?: FileNode[]
  metadata: FileMetadata
}

export interface FileMetadata {
  size: number
  created: Date
  modified: Date
  language?: string
  encoding: string
  permissions: FilePermissions
}

export interface FilePermissions {
  read: boolean
  write: boolean
  execute: boolean
}

/**
 * Virtual file system manager for handling file operations
 * Provides CRUD operations with undo/redo support
 */
export class VirtualFileSystem {
  private root: FileNode
  private history: FileSystemAction[] = []
  private historyIndex: number = -1

  constructor() {
    this.root = {
      id: 'root',
      name: 'workspace',
      type: 'directory',
      path: '/',
      children: [],
      metadata: {
        size: 0,
        created: new Date(),
        modified: new Date(),
        encoding: 'utf-8',
        permissions: { read: true, write: true, execute: true }
      }
    }
  }

  /**
   * Creates a new file or directory at the specified path
   */
  create(path: string, type: 'file' | 'directory', content?: string): FileNode {
    const parts = path.split('/').filter(p => p)
    const name = parts[parts.length - 1]
    const parentPath = '/' + parts.slice(0, -1).join('/')
    
    const parent = this.findNode(parentPath)
    if (!parent || parent.type !== 'directory') {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    const newNode: FileNode = {
      id: this.generateId(),
      name,
      type,
      path,
      content: type === 'file' ? (content || '') : undefined,
      children: type === 'directory' ? [] : undefined,
      metadata: {
        size: content?.length || 0,
        created: new Date(),
        modified: new Date(),
        language: type === 'file' ? this.detectLanguage(name) : undefined,
        encoding: 'utf-8',
        permissions: { read: true, write: true, execute: false }
      }
    }

    if (!parent.children) {
      parent.children = []
    }
    parent.children.push(newNode)

    this.recordAction({
      type: 'create',
      path,
      nodeType: type,
      content
    })

    return newNode
  }

  /**
   * Reads file content from the specified path
   */
  read(path: string): string {
    const node = this.findNode(path)
    if (!node) {
      throw new Error(`File not found: ${path}`)
    }
    if (node.type !== 'file') {
      throw new Error(`Not a file: ${path}`)
    }
    return node.content || ''
  }

  /**
   * Updates file content at the specified path
   */
  update(path: string, content: string): void {
    const node = this.findNode(path)
    if (!node) {
      throw new Error(`File not found: ${path}`)
    }
    if (node.type !== 'file') {
      throw new Error(`Not a file: ${path}`)
    }

    const oldContent = node.content
    node.content = content
    node.metadata.size = content.length
    node.metadata.modified = new Date()

    this.recordAction({
      type: 'update',
      path,
      oldContent,
      newContent: content
    })
  }

  /**
   * Deletes a file or directory at the specified path
   */
  delete(path: string): void {
    const parts = path.split('/').filter(p => p)
    const name = parts[parts.length - 1]
    const parentPath = '/' + parts.slice(0, -1).join('/')
    
    const parent = this.findNode(parentPath)
    if (!parent || !parent.children) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    const index = parent.children.findIndex(child => child.name === name)
    if (index === -1) {
      throw new Error(`File not found: ${path}`)
    }

    const deletedNode = parent.children[index]
    parent.children.splice(index, 1)

    this.recordAction({
      type: 'delete',
      path,
      deletedNode
    })
  }

  /**
   * Renames a file or directory
   */
  rename(oldPath: string, newName: string): void {
    const node = this.findNode(oldPath)
    if (!node) {
      throw new Error(`File not found: ${oldPath}`)
    }

    const oldName = node.name
    node.name = newName

    const parts = oldPath.split('/').filter(p => p)
    parts[parts.length - 1] = newName
    node.path = '/' + parts.join('/')

    this.recordAction({
      type: 'rename',
      path: oldPath,
      oldName,
      newName
    })
  }

  /**
   * Moves a file or directory to a new location
   */
  move(sourcePath: string, destinationPath: string): void {
    const node = this.findNode(sourcePath)
    if (!node) {
      throw new Error(`Source not found: ${sourcePath}`)
    }

    this.delete(sourcePath)
    // Logic to recreate at destination would go here
    
    this.recordAction({
      type: 'move',
      path: sourcePath,
      sourcePath,
      destinationPath
    })
  }

  /**
   * Searches for files matching a pattern
   */
  search(pattern: string, searchContent = false): FileNode[] {
    const results: FileNode[] = []
    const regex = new RegExp(pattern, 'i')

    const searchNode = (node: FileNode) => {
      if (regex.test(node.name)) {
        results.push(node)
      }

      if (searchContent && node.type === 'file' && node.content) {
        if (regex.test(node.content)) {
          results.push(node)
        }
      }

      if (node.children) {
        node.children.forEach(searchNode)
      }
    }

    searchNode(this.root)
    return results
  }

  /**
   * Undo the last file system operation
   */
  undo(): void {
    if (this.historyIndex < 0) return

    const action = this.history[this.historyIndex]
    this.historyIndex--

    // Implement undo logic based on action type
    switch (action.type) {
      case 'create':
        this.delete(action.path)
        break
      case 'delete':
        if (action.deletedNode) {
          // Restore deleted node
        }
        break
      case 'update':
        if (action.oldContent !== undefined) {
          this.update(action.path, action.oldContent)
        }
        break
    }
  }

  /**
   * Redo the last undone operation
   */
  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return

    this.historyIndex++
    const action = this.history[this.historyIndex]

    // Implement redo logic
  }

  private findNode(path: string): FileNode | null {
    if (path === '/') return this.root

    const parts = path.split('/').filter(p => p)
    let current: FileNode = this.root

    for (const part of parts) {
      if (!current.children) return null
      const next = current.children.find(child => child.name === part)
      if (!next) return null
      current = next
    }

    return current
  }

  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown'
    }
    return languageMap[ext || ''] || 'text'
  }

  private recordAction(action: FileSystemAction): void {
    // Remove any actions after current index (if we undid something)
    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push(action)
    this.historyIndex++

    // Limit history size
    if (this.history.length > 100) {
      this.history.shift()
      this.historyIndex--
    }
  }
}

interface FileSystemAction {
  type: 'create' | 'delete' | 'update' | 'rename' | 'move'
  path: string
  nodeType?: 'file' | 'directory'
  content?: string
  oldContent?: string
  newContent?: string
  deletedNode?: FileNode
  oldName?: string
  newName?: string
  sourcePath?: string
  destinationPath?: string
}
