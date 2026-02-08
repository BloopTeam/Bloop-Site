/**
 * Team Discussion Service — Autonomous Bot-to-Bot Communication
 * 
 * Bots talk to each other in real time as they work. When a bot completes
 * a task, finds issues, or fixes files, it posts to the team room and
 * other bots weigh in automatically. The user sees an active engineering
 * team discussing their codebase 24/7.
 */
import { botTeamService, BOT_SPECIALIZATIONS, type TeamBot, type BotTask } from './botTeam'
import { type RoleAllocation } from '../types/roles'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamMessage {
  id: string
  botId: string | 'user' | 'system'
  botName: string
  botAvatar: string
  botColor: string
  botSpecialization?: string
  content: string
  type: 'discussion' | 'analysis' | 'suggestion' | 'decision' | 'question' | 'system' | 'preference' | 'report' | 'alert'
  replyTo?: string
  timestamp: number
  codeSnippets?: { language: string; code: string; file?: string }[]
  taskId?: string
  filesAffected?: string[]
}

export interface TeamThread {
  id: string
  topic: string
  startedBy: string
  messages: TeamMessage[]
  status: 'active' | 'resolved' | 'archived'
  createdAt: number
}

type MessageListener = (msg: TeamMessage) => void
type ThreadListener = (thread: TeamThread) => void

// ─── Bot Colors ──────────────────────────────────────────────────────────────

const BOT_COLORS: Record<string, string> = {
  'code-reviewer': '#3b82f6',
  'test-engineer': '#22c55e',
  'security-auditor': '#ef4444',
  'docs-writer': '#f59e0b',
  'optimizer': '#06b6d4',
  'debugger': '#a855f7',
  'architect': '#ec4899',
}

// ─── Service ─────────────────────────────────────────────────────────────────

class TeamDiscussionService {
  private messages: TeamMessage[] = []
  private threads: TeamThread[] = []
  private messageListeners: MessageListener[] = []
  private threadListeners: ThreadListener[] = []
  private isGenerating = false
  private generationQueue: (() => Promise<void>)[] = []
  private unsubscribers: (() => void)[] = []

  constructor() {
    this.loadFromStorage()
    this.subscribeToEvents()
  }

  // ─── Event subscriptions ─────────────────────────────────────────────

  private subscribeToEvents() {
    // When a bot completes a task (analyze), it reports findings
    this.unsubscribers.push(
      botTeamService.on('task-completed', (task: BotTask) => {
        this.handleTaskCompleted(task)
      })
    )

    // When a bot fixes files, it announces what it changed
    this.unsubscribers.push(
      botTeamService.on('files-fixed', (data: { botId: string; fixedFiles: { path: string; content: string; written: boolean }[] }) => {
        this.handleFilesFixed(data.botId, data.fixedFiles)
      })
    )

    // When a chain completes, summarize the collaboration
    this.unsubscribers.push(
      botTeamService.on('chain-completed', (result: any) => {
        this.handleChainCompleted(result)
      })
    )

    // When a task fails, the bot reports the issue
    this.unsubscribers.push(
      botTeamService.on('task-failed', (task: BotTask) => {
        this.handleTaskFailed(task)
      })
    )
  }

  // ─── Event handlers ──────────────────────────────────────────────────

  private async handleTaskCompleted(task: BotTask) {
    const bot = botTeamService.getBots().find(b => b.id === task.botId)
    if (!bot) return
    const spec = BOT_SPECIALIZATIONS[bot.specialization]
    if (!spec) return

    // Bot reports what it found
    const reportMsg = this.createBotMessage(bot, 
      this.summarizeTaskResult(task, bot),
      'report',
      task.id,
      task.filesAffected,
    )
    this.addMessage(reportMsg)

    // Queue other bots to respond
    this.queueBotResponses(reportMsg, bot)
  }

  private async handleFilesFixed(botId: string, fixedFiles: { path: string; content: string; written: boolean }[]) {
    const bot = botTeamService.getBots().find(b => b.id === botId)
    if (!bot) return
    const spec = BOT_SPECIALIZATIONS[bot.specialization]
    if (!spec) return

    const written = fixedFiles.filter(f => f.written)
    if (written.length === 0) return

    const filePaths = written.map(f => f.path)
    const msg = this.createBotMessage(bot,
      `Applied fixes to ${written.length} file${written.length !== 1 ? 's' : ''}: ${filePaths.map(p => '`' + p + '`').join(', ')}. ${this.getFixContext(bot)}`,
      'report',
      undefined,
      filePaths,
    )
    this.addMessage(msg)

    // Other bots review the changes
    this.queueBotResponses(msg, bot)
  }

  private async handleChainCompleted(result: any) {
    const completedSteps = result.completedSteps || 0
    const totalFilesFixed = result.totalFilesFixed || 0

    const sysMsg: TeamMessage = {
      id: `msg-sys-chain-${Date.now()}`,
      botId: 'system',
      botName: 'Team',
      botAvatar: '',
      botColor: '#FF00FF',
      content: `Collaboration chain finished: ${completedSteps} bots contributed, ${totalFilesFixed} files modified. The team worked through the codebase sequentially, each building on the previous bot's changes.`,
      type: 'system',
      timestamp: Date.now(),
    }
    this.addMessage(sysMsg)
  }

  private async handleTaskFailed(task: BotTask) {
    const bot = botTeamService.getBots().find(b => b.id === task.botId)
    if (!bot) return
    const spec = BOT_SPECIALIZATIONS[bot.specialization]
    if (!spec) return

    const msg = this.createBotMessage(bot,
      `I ran into an issue: ${task.error || 'execution failed'}. ${this.getRecoveryAdvice(bot)}`,
      'alert',
    )
    this.addMessage(msg)
  }

  // ─── Bot response generation ─────────────────────────────────────────

  private queueBotResponses(triggerMsg: TeamMessage, triggerBot: TeamBot) {
    // Pick 1-2 other bots that would logically respond
    const allBots = botTeamService.getBots().filter(b => 
      b.id !== triggerBot.id && 
      (b.status === 'active' || b.status === 'idle')
    )
    if (allBots.length === 0) return

    // Select the most relevant responders based on the trigger bot's specialization
    const responders = this.selectResponders(triggerBot, allBots)
    
    for (const responder of responders) {
      this.generationQueue.push(async () => {
        // Small delay for natural conversation feel
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000))
        await this.generateBotResponse(responder, triggerMsg, triggerBot)
      })
    }

    this.processQueue()
  }

  private selectResponders(triggerBot: TeamBot, candidates: TeamBot[]): TeamBot[] {
    // Logical pairings — who responds to whom
    const relevanceMap: Record<string, string[]> = {
      'code-reviewer': ['debugger', 'architect', 'security-auditor'],
      'debugger': ['code-reviewer', 'test-engineer'],
      'security-auditor': ['code-reviewer', 'architect'],
      'test-engineer': ['code-reviewer', 'debugger'],
      'architect': ['code-reviewer', 'optimizer'],
      'optimizer': ['architect', 'debugger'],
      'docs-writer': ['code-reviewer', 'architect'],
    }

    const preferred = relevanceMap[triggerBot.specialization] || []
    
    // Sort candidates: preferred responders first, then random
    const sorted = [...candidates].sort((a, b) => {
      const aIdx = preferred.indexOf(a.specialization)
      const bIdx = preferred.indexOf(b.specialization)
      if (aIdx >= 0 && bIdx < 0) return -1
      if (bIdx >= 0 && aIdx < 0) return 1
      return Math.random() - 0.5
    })

    // Take 1-2 responders (more if it's a significant finding)
    const count = triggerBot.specialization === 'security-auditor' ? 2 : 1
    return sorted.slice(0, Math.min(count, sorted.length))
  }

  private async generateBotResponse(bot: TeamBot, triggerMsg: TeamMessage, triggerBot: TeamBot) {
    const spec = BOT_SPECIALIZATIONS[bot.specialization]
    const role = bot.role

    const systemPrompt = `You are ${spec.name} (${role.title}) on an engineering team inside the Bloop IDE.
Your focus: ${role.focusAreas.slice(0, 3).join(', ')}. Style: ${role.responseStyle}. Mode: ${role.behaviorMode}.
${role.customDirective ? role.customDirective : ''}

Your teammate ${triggerMsg.botName} just shared something. React naturally — agree, add context, flag concerns, or suggest next steps.
Be brief (2-4 sentences). Speak as a teammate, not a report. Use "I'd" "Let's" "We should" etc.
If code is relevant, use a single short \`\`\`lang block. Don't repeat what they said.`

    const userPrompt = `${triggerMsg.botName} says: "${triggerMsg.content.substring(0, 500)}"
${triggerMsg.filesAffected?.length ? `Files involved: ${triggerMsg.filesAffected.join(', ')}` : ''}

Give your quick take as ${spec.name}.`

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.85,
          maxTokens: 250,
          role: bot.role,
        })
      })

      const result = await response.json()
      const content = result.content || result.choices?.[0]?.message?.content || ''
      if (!content) return

      // Extract code snippets
      const codeSnippets: { language: string; code: string }[] = []
      const codeRegex = /```(\w*)\n([\s\S]*?)```/g
      let match
      while ((match = codeRegex.exec(content)) !== null) {
        codeSnippets.push({ language: match[1] || 'text', code: match[2].trim() })
      }

      const msg = this.createBotMessage(bot,
        content.replace(/```\w*\n[\s\S]*?```/g, '').trim() || content,
        'discussion',
        undefined, undefined,
        codeSnippets.length > 0 ? codeSnippets : undefined,
      )
      msg.replyTo = triggerMsg.id
      this.addMessage(msg)

    } catch {
      // Silent fail — bot just doesn't respond this time
    }
  }

  private async processQueue() {
    if (this.isGenerating || this.generationQueue.length === 0) return
    this.isGenerating = true

    while (this.generationQueue.length > 0) {
      const job = this.generationQueue.shift()
      if (job) {
        try { await job() } catch { /* continue */ }
      }
    }

    this.isGenerating = false
  }

  // ─── User-initiated discussions ──────────────────────────────────────

  async startDiscussion(topic: string, selectedBotIds: string[]): Promise<void> {
    const activeBots = botTeamService.getBots().filter(b => selectedBotIds.includes(b.id))
    if (activeBots.length === 0) return

    // User message
    const userMsg: TeamMessage = {
      id: `msg-user-${Date.now()}`,
      botId: 'user',
      botName: 'You',
      botAvatar: '',
      botColor: '#FF00FF',
      content: topic,
      type: 'question',
      timestamp: Date.now(),
    }
    this.addMessage(userMsg)

    // Thread
    const thread: TeamThread = {
      id: `thread-${Date.now()}`,
      topic,
      startedBy: 'user',
      messages: [userMsg],
      status: 'active',
      createdAt: Date.now(),
    }

    // First round — each bot responds
    for (const bot of activeBots) {
      this.notifyThinking(bot.id, true)
      await this.generateUserDiscussionResponse(bot, topic, [userMsg])
      this.notifyThinking(bot.id, false)
      await new Promise(r => setTimeout(r, 300))
    }

    // Follow-up round (1-2 bots)
    if (activeBots.length >= 2) {
      const followUps = activeBots.slice(0, Math.min(2, activeBots.length))
      for (const bot of followUps) {
        this.notifyThinking(bot.id, true)
        await this.generateUserDiscussionResponse(bot, topic, this.messages.slice(-10), true)
        this.notifyThinking(bot.id, false)
        await new Promise(r => setTimeout(r, 300))
      }
    }

    // Save thread
    thread.messages = this.messages.slice(-(activeBots.length * 2 + 1))
    this.threads.unshift(thread)
    this.saveToStorage()
    this.threadListeners.forEach(l => l(thread))
  }

  private async generateUserDiscussionResponse(
    bot: TeamBot, topic: string, context: TeamMessage[], isFollowUp = false
  ) {
    const spec = BOT_SPECIALIZATIONS[bot.specialization]
    const role = bot.role

    const recentContext = context.slice(-6).map(m => 
      `${m.botName}: ${m.content.substring(0, 300)}`
    ).join('\n')

    const systemPrompt = `You are ${spec.name} (${role.title}) on an engineering team.
Focus: ${role.focusAreas.join(', ')}. Mode: ${role.behaviorMode}. Style: ${role.responseStyle}.
Languages: ${role.languages.join(', ')}. ${role.customDirective || ''}

You're in a team discussion. ${isFollowUp ? 'Build on what others said — agree, disagree, or add a new angle.' : 'Give your initial take.'} 
Be natural: "I think", "From what I see", "We should". Keep it under 150 words. Include short code if relevant.`

    const userPrompt = isFollowUp
      ? `Discussion so far:\n${recentContext}\n\nTopic: "${topic}"\nYour follow-up as ${spec.name}:`
      : `Topic: "${topic}"\nYour perspective as ${spec.name}:`

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          maxTokens: 400,
          role: bot.role,
        })
      })

      const result = await response.json()
      const content = result.content || result.choices?.[0]?.message?.content || ''
      if (!content) return

      const codeSnippets: { language: string; code: string }[] = []
      const codeRegex = /```(\w*)\n([\s\S]*?)```/g
      let match
      while ((match = codeRegex.exec(content)) !== null) {
        codeSnippets.push({ language: match[1] || 'text', code: match[2].trim() })
      }

      const msg = this.createBotMessage(bot,
        content.replace(/```\w*\n[\s\S]*?```/g, '').trim() || content,
        isFollowUp ? 'discussion' : 'analysis',
        undefined, undefined,
        codeSnippets.length > 0 ? codeSnippets : undefined,
      )
      this.addMessage(msg)
    } catch {
      const msg = this.createBotMessage(bot,
        `Having trouble connecting — but based on my ${role.focusAreas[0]?.toLowerCase() || ''} focus, this warrants a closer look.`,
        'discussion',
      )
      this.addMessage(msg)
    }
  }

  // ─── Thinking state (for UI indicators) ──────────────────────────────

  private thinkingListeners: ((botId: string, thinking: boolean) => void)[] = []

  onThinking(listener: (botId: string, thinking: boolean) => void): () => void {
    this.thinkingListeners.push(listener)
    return () => { this.thinkingListeners = this.thinkingListeners.filter(l => l !== listener) }
  }

  private notifyThinking(botId: string, thinking: boolean) {
    this.thinkingListeners.forEach(l => l(botId, thinking))
  }

  // ─── Message helpers ─────────────────────────────────────────────────

  private createBotMessage(
    bot: TeamBot, content: string, type: TeamMessage['type'],
    taskId?: string, filesAffected?: string[],
    codeSnippets?: { language: string; code: string }[],
  ): TeamMessage {
    const spec = BOT_SPECIALIZATIONS[bot.specialization]
    return {
      id: `msg-${Date.now()}-${bot.id}-${Math.random().toString(36).substring(2, 6)}`,
      botId: bot.id,
      botName: spec?.name || bot.name,
      botAvatar: spec?.avatar || '',
      botColor: BOT_COLORS[bot.specialization] || '#888',
      botSpecialization: bot.specialization,
      content,
      type,
      timestamp: Date.now(),
      taskId,
      filesAffected,
      codeSnippets,
    }
  }

  private summarizeTaskResult(task: BotTask, bot: TeamBot): string {
    const spec = BOT_SPECIALIZATIONS[bot.specialization]
    const result = task.result || ''
    const filesCount = task.filesAffected?.length || 0

    // Create a natural summary from the task
    if (result.length > 300) {
      const firstSentences = result.split(/[.!?\n]/).filter(s => s.trim()).slice(0, 2).join('. ')
      return `${firstSentences.trim()}. ${filesCount > 0 ? `(looked at ${filesCount} file${filesCount > 1 ? 's' : ''})` : ''}`
    }

    if (!result) {
      return `Finished ${task.description}. ${filesCount > 0 ? `Reviewed ${filesCount} file${filesCount > 1 ? 's' : ''}.` : 'Nothing critical found this cycle.'}`
    }

    return `${result.substring(0, 300)}${result.length > 300 ? '...' : ''}`
  }

  private getFixContext(bot: TeamBot): string {
    const phrases: Record<string, string[]> = {
      'code-reviewer': ['Cleaned up the code quality.', 'Fixed the issues I flagged.', 'Applied style and logic fixes.'],
      'debugger': ['Patched the bugs I identified.', 'Fixed the error paths.', 'Resolved the edge cases.'],
      'security-auditor': ['Hardened the security posture.', 'Patched the vulnerabilities.', 'Closed the security gaps.'],
      'test-engineer': ['Generated the test coverage.', 'Added the missing test cases.', 'Covered the edge cases.'],
      'docs-writer': ['Updated the documentation.', 'Added the missing comments.', 'Synced the docs with code.'],
      'optimizer': ['Optimized the hot paths.', 'Reduced the overhead.', 'Improved the performance.'],
      'architect': ['Refactored the structure.', 'Cleaned up the architecture.', 'Improved the module design.'],
    }
    const options = phrases[bot.specialization] || ['Applied the changes.']
    return options[Math.floor(Math.random() * options.length)]
  }

  private getRecoveryAdvice(bot: TeamBot): string {
    const advice: Record<string, string> = {
      'code-reviewer': 'Could be a parsing issue — I\'ll try a different approach next cycle.',
      'debugger': 'The error might be intermittent. I\'ll re-run with more context.',
      'security-auditor': 'Access might be restricted. Will retry with broader permissions.',
      'test-engineer': 'Dependency issue maybe. I\'ll check the test environment.',
      'docs-writer': 'Might be a formatting conflict. Will adjust and retry.',
      'optimizer': 'Profiling data was incomplete. Will gather more metrics.',
      'architect': 'The analysis scope was too large. I\'ll narrow the focus.',
    }
    return advice[bot.specialization] || 'Will retry next cycle.'
  }

  // ─── Public API ──────────────────────────────────────────────────────

  getMessages(): TeamMessage[] {
    return [...this.messages]
  }

  getThreads(): TeamThread[] {
    return [...this.threads]
  }

  addUserMessage(content: string): TeamMessage {
    const msg: TeamMessage = {
      id: `msg-user-${Date.now()}`,
      botId: 'user',
      botName: 'You',
      botAvatar: '',
      botColor: '#FF00FF',
      content,
      type: 'question',
      timestamp: Date.now(),
    }
    this.addMessage(msg)
    return msg
  }

  private addMessage(msg: TeamMessage) {
    this.messages.push(msg)
    // Keep last 500 messages
    if (this.messages.length > 500) {
      this.messages = this.messages.slice(-500)
    }
    this.saveToStorage()
    this.messageListeners.forEach(l => l(msg))
  }

  clearMessages() {
    this.messages = []
    this.threads = []
    this.saveToStorage()
  }

  // ─── Subscriptions ───────────────────────────────────────────────────

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.push(listener)
    return () => { this.messageListeners = this.messageListeners.filter(l => l !== listener) }
  }

  onThread(listener: ThreadListener): () => void {
    this.threadListeners.push(listener)
    return () => { this.threadListeners = this.threadListeners.filter(l => l !== listener) }
  }

  // ─── Storage ─────────────────────────────────────────────────────────

  private loadFromStorage() {
    try {
      const savedMsgs = localStorage.getItem('bloop-team-messages')
      if (savedMsgs) this.messages = JSON.parse(savedMsgs)
      const savedThreads = localStorage.getItem('bloop-team-threads')
      if (savedThreads) this.threads = JSON.parse(savedThreads)
    } catch { /* ignore */ }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('bloop-team-messages', JSON.stringify(this.messages.slice(-200)))
      localStorage.setItem('bloop-team-threads', JSON.stringify(this.threads.slice(-50)))
    } catch { /* ignore */ }
  }

  destroy() {
    this.unsubscribers.forEach(u => u())
    this.messageListeners = []
    this.threadListeners = []
    this.thinkingListeners = []
  }
}

// Singleton
export const teamDiscussionService = new TeamDiscussionService()
