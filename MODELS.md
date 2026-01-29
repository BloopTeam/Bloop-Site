# Bloop AI Models Reference

Bloop supports **15+ AI providers** with **intelligent model routing** to automatically select the best model for each task.

## Quick Model Selection Guide

### 🎯 For Code Tasks
- **DeepSeek** - Best for pure coding, fastest, cheapest
- **Kimi K2.5** - Best for complex code with vision (256K context)
- **Anyscale** - Best for large codebases (128K context)
- **Gemini 1.5** - Best for massive codebases (1M context!)

### 🎨 For Creative Tasks
- **Grok (xAI)** - Fast, creative, great for brainstorming
- **Mistral Large** - Balanced creativity + code
- **Claude 3.5** - High-quality creative writing
- **GPT-4 Turbo** - Versatile creative + code

### 🏢 For Enterprise Tasks
- **Claude 3.5** - Best quality, safety-focused
- **GPT-4 Turbo** - Most capable, widely tested
- **Cohere** - Enterprise-grade instruction following

### 🔍 For Research/Search Tasks
- **Perplexity** - Real-time web search integration

### 🌍 For Multilingual Tasks
- **Qwen** - Excellent Chinese + English
- **Baidu Ernie** - Chinese-focused, vision support

### 💰 For Budget-Conscious Tasks
- **DeepSeek** - Ultra-cheap, code-focused
- **Together AI** - Very cheap, open-source models
- **ZeroOne** - Very cheap, excellent reasoning
- **Grok** - Very cheap, creative

## Complete Model List

### 1. Moonshot AI (Kimi K2.5) ⭐ NEW
- **Model**: `kimi-k2.5`
- **Context**: 256K tokens
- **Vision**: ✅ Yes
- **Specialization**: Multimodal, agentic, code + creativity
- **Best for**: Complex coding with vision, agent workflows
- **API Key**: `MOONSHOT_API_KEY`

### 2. DeepSeek
- **Model**: `deepseek-chat`
- **Context**: 64K tokens
- **Vision**: ❌ No
- **Specialization**: Code-focused
- **Best for**: Pure coding tasks, refactoring, debugging
- **API Key**: `DEEPSEEK_API_KEY`

### 3. Google Gemini
- **Model**: `gemini-1.5-pro`
- **Context**: 1M tokens (largest!)
- **Vision**: ✅ Yes
- **Specialization**: Multimodal, massive context
- **Best for**: Huge codebases, complex analysis
- **API Key**: `GOOGLE_GEMINI_API_KEY`

### 4. Anthropic Claude
- **Model**: `claude-3-5-sonnet-20241022`
- **Context**: 200K tokens
- **Vision**: ✅ Yes
- **Specialization**: High quality, safety-focused
- **Best for**: Enterprise, production code, critical tasks
- **API Key**: `ANTHROPIC_API_KEY`

### 5. OpenAI GPT
- **Model**: `gpt-4-turbo-preview`
- **Context**: 128K tokens
- **Vision**: ✅ Yes
- **Specialization**: Versatile, well-tested
- **Best for**: General purpose, production
- **API Key**: `OPENAI_API_KEY`

### 6. Mistral AI
- **Model**: `mistral-large-latest`
- **Context**: 32K tokens
- **Vision**: ✅ Yes
- **Specialization**: Creativity + code balance
- **Best for**: Creative coding, design + implementation
- **API Key**: `MISTRAL_API_KEY`

### 7. xAI (Grok)
- **Model**: `grok-beta`
- **Context**: 131K tokens
- **Vision**: ❌ No
- **Specialization**: Fast, creative
- **Best for**: Brainstorming, creative tasks, fast responses
- **API Key**: `XAI_API_KEY`

### 8. Perplexity
- **Model**: `llama-3.1-sonar-large-128k-online`
- **Context**: 4K tokens (but with web search)
- **Vision**: ❌ No
- **Specialization**: Search-enhanced, real-time info
- **Best for**: Research, current events, documentation lookup
- **API Key**: `PERPLEXITY_API_KEY`

### 9. Cohere
- **Model**: `command-r-plus`
- **Context**: 4K tokens
- **Vision**: ❌ No
- **Specialization**: Enterprise, instruction following
- **Best for**: Structured tasks, enterprise workflows
- **API Key**: `COHERE_API_KEY`

### 10. Together AI
- **Model**: `meta-llama/Meta-Llama-3-70B-Instruct-Turbo`
- **Context**: 32K tokens
- **Vision**: ❌ No
- **Specialization**: Open-source models
- **Best for**: Cost-effective general tasks
- **API Key**: `TOGETHER_API_KEY`

### 11. Anyscale
- **Model**: `meta-llama/Meta-Llama-3.1-405B-Instruct`
- **Context**: 128K tokens
- **Vision**: ❌ No
- **Specialization**: High-performance inference
- **Best for**: Large codebases, performance-critical
- **API Key**: `ANYSCALE_API_KEY`

### 12. Qwen (Alibaba)
- **Model**: `qwen-plus`
- **Context**: 32K tokens
- **Vision**: ✅ Yes
- **Specialization**: Multilingual (Chinese + English)
- **Best for**: Chinese codebases, multilingual projects
- **API Key**: `QWEN_API_KEY`

### 13. ZeroOne (01.ai)
- **Model**: `yi-1.5-34b-chat`
- **Context**: 200K tokens
- **Vision**: ❌ No
- **Specialization**: Excellent reasoning
- **Best for**: Complex reasoning tasks, logic-heavy code
- **API Key**: `ZEROONE_API_KEY`

### 14. Baidu Ernie
- **Model**: `ernie-4.0-8k`
- **Context**: 128K tokens
- **Vision**: ✅ Yes
- **Specialization**: Chinese-focused
- **Best for**: Chinese language projects, vision tasks
- **API Key**: `BAIDU_API_KEY`

## Intelligent Model Router

The router automatically selects the best model based on:

1. **Context Length** - Routes to models with sufficient context
2. **Task Type** - Code → DeepSeek/Kimi, Creative → Grok/Mistral
3. **Vision Requirements** - Routes to vision-capable models
4. **Speed Requirements** - Fast tasks → fast models
5. **Quality Requirements** - Critical tasks → high-quality models
6. **Cost Efficiency** - Routes to cheaper models when appropriate

## Usage Examples

### Specify a Model
```json
{
  "messages": [...],
  "model": "kimi-k2.5"
}
```

### Auto-Select (Recommended)
```json
{
  "messages": [...],
  "model": null  // Router picks best model
}
```

## Environment Variables

Add these to your `.env` file:

```bash
# Required (at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GEMINI_API_KEY=...

# Recommended
MOONSHOT_API_KEY=...          # Kimi K2.5
DEEPSEEK_API_KEY=...          # Code-focused
MISTRAL_API_KEY=...           # Creativity + code
XAI_API_KEY=...               # Grok (creative)

# Optional
COHERE_API_KEY=...
PERPLEXITY_API_KEY=...
TOGETHER_API_KEY=...
ANYSCALE_API_KEY=...
QWEN_API_KEY=...
ZEROONE_API_KEY=...
BAIDU_API_KEY=...
```

## Cost Comparison (per 1M tokens)

| Provider | Input | Output | Best For |
|----------|-------|--------|----------|
| DeepSeek | $0.14 | $0.28 | Budget coding |
| Together | $0.20 | $0.20 | Budget general |
| ZeroOne | $0.10 | $0.10 | Budget reasoning |
| Grok | $0.10 | $0.10 | Budget creative |
| Perplexity | $0.20 | $0.20 | Search tasks |
| Cohere | $1.00 | $1.00 | Enterprise |
| Kimi K2.5 | $0.80 | $2.00 | Complex multimodal |
| Mistral | $2.00 | $6.00 | Creative + code |
| Gemini | $1.25 | $5.00 | Massive context |
| Claude | $3.00 | $15.00 | High quality |
| GPT-4 | $10.00 | $30.00 | Premium |

*Prices are approximate and may vary*
