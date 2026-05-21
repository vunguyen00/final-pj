# AI Writing Evaluation System - README

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

An advanced, multilingual AI-powered essay evaluation system integrated with your Next.js application using Ollama.

## 🎯 Features

### Core Capabilities
- **Multilingual Support**: English, Japanese, Korean, Chinese, Vietnamese
- **Comprehensive Evaluation**: Grammar, Vocabulary, Coherence, Task Response (0-10 scale)
- **Detailed Feedback**: 
  - ✅ Strengths and weaknesses identification
  - ✅ Actionable improvement suggestions
  - ✅ Specific corrections with explanations
  - ✅ Improved essay version with corrections applied
- **Educational Focus**: Designed to help language learners improve
- **Production Ready**: Secure, scalable, and well-tested

### Technical Features
- **Secure**: Input validation, sanitization, prompt injection prevention
- **Reliable**: Retry logic, timeout handling, comprehensive error management
- **Performant**: 5-15 second evaluations (after model loads)
- **Observable**: Complete logging of all operations
- **Extensible**: Clean architecture for easy enhancements

## 🚀 Quick Start (5 minutes)

### 1. Install Ollama
```bash
# Download from https://ollama.ai
# macOS, Windows, or Linux
```

### 2. Configure Environment
Create `.env.local` in project root:
```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

### 3. Download Model
```bash
ollama pull qwen2.5:7b
```

### 4. Start Development
```bash
npm run dev
```

### 5. Verify Setup
```bash
# Health check
curl http://localhost:3000/api/ai/essay-evaluation

# Test evaluation
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"essay": "Your essay text here with at least fifty characters..."}'
```

✅ **Done!** System is ready to use.

## 📚 Documentation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [QUICK_START.md](./QUICK_START.md) | 5-minute setup guide | 5 min |
| [AI_INTEGRATION.md](./AI_INTEGRATION.md) | Complete architecture & API reference | 20 min |
| [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md) | React component examples | 15 min |
| [ENV_SETUP.md](./ENV_SETUP.md) | Environment variables reference | 10 min |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Testing procedures & benchmarks | 15 min |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Architecture decisions & design | 15 min |

**New to the system?** Start with [QUICK_START.md](./QUICK_START.md)

## 🛠 API Usage

### Evaluate Essay

**Request:**
```bash
POST /api/ai/essay-evaluation
Content-Type: application/json

{
  "essay": "Your essay text..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "evaluation": {
      "scores": {
        "grammar": 8,
        "vocabulary": 7,
        "coherence": 8,
        "task_response": 9,
        "overall": 8
      },
      "summary": "Strong essay with clear structure...",
      "language": "English"
    },
    "analysis": {
      "strengths": ["Well organized", "Good vocabulary"],
      "weaknesses": ["Minor punctuation", "Some awkward phrasing"],
      "feedback": ["Consider more complex structures", "Smooth transitions"],
      "suggestions": ["Vary sentence length", "More specific examples"]
    },
    "improvements": {
      "corrections": [
        {
          "original": "The most important...",
          "improved": "The key consideration...",
          "reason": "More concise and academic"
        }
      ],
      "improved_version": "Full essay with corrections..."
    }
  }
}
```

### Health Check

**Request:**
```bash
GET /api/ai/essay-evaluation
```

**Response (200):**
```json
{
  "status": "healthy",
  "service": "essay-evaluation",
  "timestamp": "2025-05-19T10:30:00Z"
}
```

## 📁 Project Structure

```
lib/ai/                          # AI Services
├── index.ts                      # Main exports
├── types.ts                      # Type definitions
├── validators.ts                 # Input validation
├── prompt-builder.ts             # Prompt generation
├── ollama-service.ts             # Ollama API client
├── feedback-service.ts           # Response parsing
└── scoring-service.ts            # Main orchestrator

app/api/ai/essay-evaluation/
└── route.ts                      # API endpoints

docs/
├── QUICK_START.md               # Quick setup
├── AI_INTEGRATION.md            # Full docs
├── FRONTEND_EXAMPLES.md         # React examples
├── ENV_SETUP.md                 # Configuration
├── TESTING_GUIDE.md             # Testing
└── IMPLEMENTATION_SUMMARY.md    # Architecture
```

## 🎨 Frontend Integration

### Simple Component

```typescript
import { useState } from 'react';

export function EssayEvaluator() {
  const [essay, setEssay] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleEvaluate(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/ai/essay-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essay }),
      });
      
      const data = await response.json();
      setEvaluation(data.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleEvaluate}>
        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="Paste your essay here..."
        />
        <button disabled={loading}>
          {loading ? 'Evaluating...' : 'Evaluate'}
        </button>
      </form>
      
      {evaluation && (
        <div>
          <h2>Scores</h2>
          <p>Overall: {evaluation.evaluation.scores.overall}/10</p>
          
          <h2>Strengths</h2>
          <ul>
            {evaluation.analysis.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          
          <h2>Suggestions</h2>
          <ul>
            {evaluation.analysis.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**See [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md) for more examples**

## 🔧 Configuration

### Environment Variables

Required:
```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

Optional:
```env
NODE_ENV=development  # or production
```

### Model Selection

| Model | Size | Speed | Quality | RAM | Recommended Use |
|-------|------|-------|---------|-----|-----------------|
| qwen2.5:3b | 2GB | Fast ⚡ | Good | 4GB | Development/Testing |
| qwen2.5:7b | 5GB | Medium ⚙️ | Excellent | 8GB | **Production** ✅ |
| qwen2.5:14b | 10GB | Slow 🐢 | Best | 16GB | High Accuracy |

**Recommended:** `qwen2.5:7b` (best balance)

## 📊 Performance

### Response Times

| Scenario | Time |
|----------|------|
| First request | 20-45s (model loading) |
| Subsequent requests | 5-15s (cached) |
| Health check | <100ms |

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4GB | 8GB |
| CPU | 2 cores | 4+ cores |
| Disk | 10GB | 20GB |
| Network | 1Mbps | 10Mbps |

## 🔒 Security

✅ **Input Validation**: Type checking, length limits (50-10000 chars)
✅ **Sanitization**: Removes control characters, prevents injection
✅ **Prompt Injection Prevention**: Pattern detection
✅ **Error Masking**: Production errors don't leak details
✅ **Timeout Protection**: 60-second timeout prevents DoS
✅ **Type Safety**: Strict TypeScript types

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Manual testing
curl http://localhost:3000/api/ai/essay-evaluation

# Full test essay
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d @test_essay.json
```

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing procedures.

## 🌍 Supported Languages

| Language | Detection | Support | Example |
|----------|-----------|---------|---------|
| 🇬🇧 English | ✅ Auto | ✅ Full | "Hello world" |
| 🇯🇵 Japanese | ✅ Auto | ✅ Full | "こんにちは世界" |
| 🇰🇷 Korean | ✅ Auto | ✅ Full | "안녕하세요" |
| 🇨🇳 Chinese | ✅ Auto | ✅ Full | "你好世界" |
| 🇻🇳 Vietnamese | ✅ Auto | ✅ Full | "Xin chào thế giới" |

## 📈 Scoring Rubric

### Grammar (0-10)
- **9-10**: Virtually no errors, complex structures correct
- **7-8**: Very good, minor errors don't impede understanding
- **5-6**: Adequate, several errors but ideas clear
- **0-4**: Poor to very poor, frequent errors

### Vocabulary (0-10)
- **9-10**: Excellent range, precise, appropriate level
- **7-8**: Very good, adequate range
- **5-6**: Adequate, sometimes imprecise
- **0-4**: Poor, restricted or inappropriate

### Coherence (0-10)
- **9-10**: Well organized, logical, smooth transitions
- **7-8**: Very good organization, mostly smooth
- **5-6**: Adequate, some unclear transitions
- **0-4**: Poor organization, lacks clarity

### Task Response (0-10)
- **9-10**: Fully addresses prompt, comprehensive
- **7-8**: Very good, minor gaps
- **5-6**: Adequate, partial
- **0-4**: Limited to very poor

## 🚨 Troubleshooting

### "OLLAMA_URL is undefined"
```
✅ Solution:
1. Create .env.local in project root
2. Add OLLAMA_URL=http://127.0.0.1:11434
3. Restart npm run dev
```

### "AI service unavailable"
```
✅ Solution:
1. Check Ollama: curl http://127.0.0.1:11434/api/tags
2. Verify model: ollama list
3. Pull model: ollama pull qwen2.5:7b
```

### "Request timeout"
```
✅ Solution:
1. First request? Wait 20-45 seconds (normal)
2. Low RAM? Use qwen2.5:3b model
3. Slow network? Check connection
```

See [QUICK_START.md#troubleshooting](./QUICK_START.md) for more.

## 📦 What's Included

### Core Files (3,600 lines)
- 7 AI service modules (~1,100 lines)
- 1 API endpoint (~200 lines)
- 6 documentation files (~2,300 lines)

### Services Provided
- ✅ Type definitions & interfaces
- ✅ Input validation & sanitization
- ✅ Prompt generation & templates
- ✅ Ollama API integration
- ✅ Response parsing & validation
- ✅ Feedback generation & formatting
- ✅ REST API endpoint
- ✅ Health checks & monitoring

### No Breaking Changes
- ✅ Doesn't modify existing files
- ✅ No database schema changes
- ✅ No dependency conflicts
- ✅ Backward compatible

## 🔄 Integration Points

### Use Existing Services

```typescript
import { scoringService, validateEssay } from '@/lib/ai';

// In any server-side function
const evaluation = await scoringService.evaluateEssay(essay);
const validation = validateEssay(essay);
```

### Extend for Future Features

- Speaking evaluation (audio + transcription)
- IELTS band scoring
- TOPIK/JLPT/HSK support
- Multiple AI models
- Progress tracking
- Batch evaluation

## 📝 Examples

### Basic Usage
```typescript
const response = await fetch('/api/ai/essay-evaluation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ essay: 'Your essay...' }),
});
const data = await response.json();
console.log(data.data.evaluation.scores.overall);
```

### With Error Handling
```typescript
try {
  const response = await fetch('/api/ai/essay-evaluation', {
    method: 'POST',
    body: JSON.stringify({ essay }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
} catch (error) {
  console.error('Evaluation failed:', error.message);
}
```

### In React Component
See [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md) for complete component examples.

## 🤝 Contributing

### Adding Language Support
1. Update language detection in `lib/ai/validators.ts`
2. Add language-specific prompts in `lib/ai/prompt-builder.ts`
3. Test with sample text
4. Update documentation

### Custom Prompts
1. Edit `lib/ai/prompt-builder.ts`
2. Modify `SYSTEM_PROMPT` or create new templates
3. Test with different essay types
4. Verify scoring remains objective

### Extending Services
1. Keep clean separation of concerns
2. Add tests for new functionality
3. Update documentation
4. Follow existing code style

## 📋 Deployment Checklist

- [ ] Ollama installed on server
- [ ] Model pulled: `ollama pull qwen2.5:7b`
- [ ] Environment variables configured
- [ ] `.env.local` or `.env.production` set
- [ ] API endpoints tested
- [ ] Health check passes
- [ ] Monitoring/logs configured
- [ ] Firewall allows port 11434
- [ ] Sufficient RAM available (8GB+)
- [ ] Backup plan for failures

## 📞 Support

### Quick Links
- 📖 Documentation: [AI_INTEGRATION.md](./AI_INTEGRATION.md)
- 🚀 Setup: [QUICK_START.md](./QUICK_START.md)
- 💻 Examples: [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md)
- ⚙️ Config: [ENV_SETUP.md](./ENV_SETUP.md)
- 🧪 Testing: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

### Common Issues
- Check [QUICK_START.md#troubleshooting](./QUICK_START.md)
- Review [AI_INTEGRATION.md#troubleshooting](./AI_INTEGRATION.md#troubleshooting)
- Check logs: `tail -f .next/*.log`

## 📄 License

This implementation follows the same license as your main project.

---

## 🎉 Ready to Start?

1. **New User?** → Start with [QUICK_START.md](./QUICK_START.md)
2. **Need Details?** → Read [AI_INTEGRATION.md](./AI_INTEGRATION.md)
3. **Building UI?** → See [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md)
4. **Deployment?** → Check [ENV_SETUP.md](./ENV_SETUP.md)
5. **Testing?** → Use [TESTING_GUIDE.md](./TESTING_GUIDE.md)

**Questions?** Review the comprehensive documentation files - most questions are answered there.

---

**Version**: 1.0.0  
**Last Updated**: May 19, 2025  
**Status**: ✅ Production Ready
