# Quick Start Guide - AI Writing Evaluation

## 5-Minute Setup

### Step 1: Install Ollama (2 minutes)

1. **Download** from https://ollama.ai
2. **Install** for your OS (Windows/Mac/Linux)
3. **Start** - Ollama app runs in background automatically

### Step 2: Download Model (3 minutes)

```bash
# Open terminal and run:
ollama pull qwen2.5:7b

# This downloads ~5GB (takes 2-5 minutes)
# Downloads are cached, only needed once
```

### Step 3: Configure Environment Variables (1 minute)

Create `.env.local` in project root:

```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

### Step 4: Start Your Application

```bash
npm run dev
```

### Step 5: Test It

```bash
# In another terminal, test the API:
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "The rapid growth of technology has transformed our world. Artificial intelligence is now everywhere. It helps us work more efficiently. However, we must be careful about its misuse. In conclusion, technology is a powerful tool that we must use wisely."
  }'

# You should get a JSON response with scores and feedback
```

## Verify Everything Works

### Check Ollama is Running

```bash
curl http://127.0.0.1:11434/api/tags
# Should show available models including qwen2.5:7b
```

### Check API is Healthy

```bash
curl http://localhost:3000/api/ai/essay-evaluation
# Should return status: "healthy"
```

### Run Full Evaluation

```bash
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"essay": "Your test essay here with at least 50 characters of content..."}'

# Response includes:
# - Scores (grammar, vocabulary, coherence, task_response, overall)
# - Analysis (strengths, weaknesses, feedback, suggestions)
# - Corrections with explanations
# - Improved version of essay
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "OLLAMA_URL is undefined" | Restart `npm run dev` after adding `.env.local` |
| "AI service unavailable" | Check Ollama running: `curl http://127.0.0.1:11434/api/tags` |
| "Model not found" | Run: `ollama pull qwen2.5:7b` |
| "Timeout" | First request takes 20-45s (model loading). Wait or check RAM. |
| "Out of memory" | Close other apps or use smaller model: `qwen2.5:3b` |

## Next Steps

1. **Add to Your Frontend**
   - See [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md)
   - Copy component example and integrate

2. **Learn More**
   - Read [AI_INTEGRATION.md](./AI_INTEGRATION.md) for full documentation
   - Check [ENV_SETUP.md](./ENV_SETUP.md) for environment details

3. **Customize**
   - Modify prompts in `lib/ai/prompt-builder.ts`
   - Adjust scoring in `lib/ai/scoring-service.ts`
   - Change validation rules in `lib/ai/validators.ts`

## File Structure

```
lib/ai/
├── index.ts                  # Main exports
├── types.ts                  # Type definitions
├── validators.ts             # Input validation
├── prompt-builder.ts         # AI prompts
├── ollama-service.ts         # Ollama API
├── feedback-service.ts       # Response parsing
└── scoring-service.ts        # Main orchestrator

app/api/ai/essay-evaluation/
└── route.ts                  # API endpoint

docs/
├── AI_INTEGRATION.md         # Full documentation
├── FRONTEND_EXAMPLES.md      # React examples
├── ENV_SETUP.md             # Environment config
└── QUICK_START.md           # This file
```

## Example Response

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
      "summary": "Strong essay with clear structure and good vocabulary usage.",
      "language": "English"
    },
    "analysis": {
      "strengths": [
        "Well-organized paragraphs with clear progression",
        "Good use of transition phrases"
      ],
      "weaknesses": [
        "Minor punctuation inconsistencies",
        "Could use more specific examples"
      ],
      "feedback": [
        "Your introduction effectively sets up the main argument",
        "Consider adding more concrete examples to support claims"
      ],
      "suggestions": [
        "Replace 'very' with more specific adverbs",
        "Add more variety to sentence starters",
        "Include citations or sources for claims"
      ]
    },
    "improvements": {
      "corrections": [
        {
          "original": "The rapid growth of technology has transformed our world.",
          "improved": "Rapid technological advancement has fundamentally transformed our world.",
          "reason": "More concise and academic phrasing"
        }
      ],
      "improved_version": "Full essay with all corrections applied..."
    }
  }
}
```

## Performance Tips

- **First request**: 20-45 seconds (model loading)
- **Subsequent requests**: 5-15 seconds (cached)
- Keep Ollama running between requests
- Monitor system RAM (4-6GB needed)

## Getting Help

- **Ollama Issues**: Check https://ollama.ai
- **API Issues**: See [AI_INTEGRATION.md](./AI_INTEGRATION.md#troubleshooting)
- **Frontend Issues**: See [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md)

---

**Ready to integrate into your app? Start with [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md)**

**Last Updated**: May 19, 2025
