# AI Writing Evaluation System - Integration Guide

## Overview

This document explains the AI-powered multilingual writing evaluation system integrated into your Next.js application using Ollama.

## Architecture

```
Frontend (React)
    ↓
API Route: POST /api/ai/essay-evaluation
    ↓
Scoring Service (Orchestrator)
    ├─ Validation Layer (validators.ts)
    ├─ Prompt Builder (prompt-builder.ts)
    └─ Ollama Service (ollama-service.ts)
         ↓
Ollama Local API (http://127.0.0.1:11434)
    ↓
Response Processing
    ├─ JSON Parsing (feedback-service.ts)
    ├─ Response Validation
    └─ Formatting
    ↓
Response to Frontend
```

## Components

### 1. **Types** (`lib/ai/types.ts`)
- `AIEvaluationResponse`: Complete AI evaluation with scores, feedback, corrections
- `WritingScore`: Individual component scores (grammar, vocabulary, coherence, task_response)
- `OllamaChatRequest/Response`: Ollama API contract
- `AIServiceConfig`: Service configuration

### 2. **Validators** (`lib/ai/validators.ts`)
- `validateEssay()`: Checks length (50-10000 chars), validates input
- `sanitizeEssay()`: Removes control characters, prevents prompt injection
- `validateRequestBody()`: Type guards for API requests
- `detectLanguageFromText()`: Identifies language from content (Japanese, Korean, Chinese, Vietnamese, English)
- `validatePromptSafety()`: Detects injection attempts

### 3. **Prompt Builder** (`lib/ai/prompt-builder.ts`)
- System prompt with strict guidelines for multilingual evaluation
- User prompt template that requires JSON output
- Language-specific context support
- Prompt injection prevention

### 4. **Ollama Service** (`lib/ai/ollama-service.ts`)
- Communicates with local Ollama API
- Handles timeouts (60 seconds default)
- Health checks
- Logging and error tracking
- Singleton pattern for resource efficiency

### 5. **Feedback Service** (`lib/ai/feedback-service.ts`)
- Parses AI responses (handles markdown wrapping)
- Validates response structure
- Sanitizes response data
- Formats responses for clients

### 6. **Scoring Service** (`lib/ai/scoring-service.ts`)
- Main orchestrator for essay evaluation
- Implements retry logic (2 retries by default)
- Coordinates all components
- Comprehensive error handling and logging

### 7. **API Endpoint** (`app/api/ai/essay-evaluation/route.ts`)
- `POST /api/ai/essay-evaluation`: Evaluates essay
- `GET /api/ai/essay-evaluation`: Health check
- Request validation
- Error handling with appropriate HTTP status codes

## API Usage

### Request Format

```bash
POST /api/ai/essay-evaluation
Content-Type: application/json

{
  "essay": "Your essay text here..."
}
```

### Response Format (Success - 200)

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
      "summary": "Strong essay with clear structure and good vocabulary.",
      "language": "English"
    },
    "analysis": {
      "strengths": ["Good paragraph organization", "Rich vocabulary usage"],
      "weaknesses": ["Minor punctuation issues", "Some awkward phrasing"],
      "feedback": ["Consider using more complex sentence structures", "Some transitions could be smoother"],
      "suggestions": ["Vary sentence length for better flow", "Add more specific examples"]
    },
    "improvements": {
      "corrections": [
        {
          "original": "The most important thing is that...",
          "improved": "The key consideration is that...",
          "reason": "More concise and academic phrasing"
        }
      ],
      "improved_version": "Full essay with corrections applied..."
    }
  }
}
```

### Error Responses

**Invalid Request (400)**
```json
{
  "error": "Request must contain 'essay' field with string value"
}
```

**Ollama Unavailable (503)**
```json
{
  "error": "AI service is unavailable. Please ensure Ollama is running at http://127.0.0.1:11434"
}
```

**Timeout (504)**
```json
{
  "error": "Request timeout. Ollama took too long to respond."
}
```

**Server Error (500)**
```json
{
  "error": "Failed to evaluate essay. Please try again later.",
  "details": "Error details (development only)"
}
```

## Environment Variables

Create `.env.local`:

```env
# Ollama Configuration
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b

# Optional: Logging level
NODE_ENV=development
```

## Supported Languages

The system automatically detects and evaluates:
- **English**: Default, uses Latin alphabet patterns
- **Japanese**: Detects hiragana, katakana, kanji (U+3040-U+9FFF)
- **Korean**: Detects Hangul characters (U+AC00-U+D7AF)
- **Chinese**: Detects Hanzi characters (U+4E00-U+9FFF)
- **Vietnamese**: Detects Vietnamese diacritics (à, á, ả, etc.)

## Scoring Rubric (0-10)

### Grammar (0-10)
- **9-10**: Excellent. Virtually no errors. Complex structures used correctly.
- **7-8**: Very good. Minor errors don't impede understanding.
- **5-6**: Adequate. Several errors but main ideas clear.
- **3-4**: Limited. Frequent errors impede understanding.
- **0-2**: Very poor. Pervasive grammatical errors.

### Vocabulary (0-10)
- **9-10**: Excellent. Wide range, precise, academic level appropriate.
- **7-8**: Very good. Adequate range and precision.
- **5-6**: Adequate. Sometimes imprecise or repetitive.
- **3-4**: Limited. Restricted range, often imprecise.
- **0-2**: Very poor. Very limited or inappropriate vocabulary.

### Coherence (0-10)
- **9-10**: Excellent. Well organized, logical flow, smooth transitions.
- **7-8**: Very good. Organized with mostly smooth transitions.
- **5-6**: Adequate. Generally organized but some unclear transitions.
- **3-4**: Limited. Somewhat disorganized, unclear connections.
- **0-2**: Very poor. Lacks clear organization.

### Task Response (0-10)
- **9-10**: Excellent. Fully addresses prompt, comprehensive response.
- **7-8**: Very good. Addresses prompt well, minor gaps.
- **5-6**: Adequate. Addresses prompt partially.
- **3-4**: Limited. Only partially addresses prompt.
- **0-2**: Very poor. Doesn't address prompt.

## Ollama Setup

### Installation & Setup

```bash
# Download Ollama from https://ollama.ai
# macOS, Windows, or Linux

# On Windows/macOS, Ollama runs in the background
# To verify it's running:
curl http://127.0.0.1:11434/api/tags

# Expected response (with available models):
{
  "models": [
    {
      "name": "qwen2.5:7b",
      "modified_at": "2024-01-15T10:30:00Z",
      "size": 5000000000,
      "digest": "sha256:abc123..."
    }
  ]
}
```

### Pull the Required Model

```bash
ollama pull qwen2.5:7b

# This downloads ~5GB model (takes 5-10 minutes)
# Model will be cached locally after first download
```

### Running Ollama

**Windows/macOS**: Ollama app runs in background automatically after installation.

**Linux**:
```bash
# Start Ollama service
ollama serve

# In another terminal, run the API:
ollama pull qwen2.5:7b
```

### Verify Setup

```bash
# Test Ollama is responding
curl -X POST http://127.0.0.1:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

## Testing Locally

### 1. Start Ollama
```bash
# Ollama should be running in background
# Verify: curl http://127.0.0.1:11434/api/tags
```

### 2. Start Next.js Dev Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

### 3. Test Health Check
```bash
curl http://localhost:3000/api/ai/essay-evaluation
```

### 4. Test Essay Evaluation

```bash
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "The importance of learning English is paramount in todays world. English is spoken by millions of people around the globe. It serves as a lingua franca for business, science, and diplomacy. Moreover, mastering English opens doors to countless educational and professional opportunities. In conclusion, learning English is essential for success in the modern era."
  }'
```

### 5. Test Different Languages

**Japanese**:
```bash
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "私の名前は田中太郎です。日本で生まれました。毎日学校に行ってます。友達とよく遊びます。将来、エンジニアになりたいです。"
  }'
```

**Vietnamese**:
```bash
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "Tôi là một học sinh giỏi. Tôi thích học Tiếng Anh. Mỗi ngày tôi đọc sách Tiếng Anh. Tôi muốn trở thành một giáo viên. Tôi yêu thích sự học hỏi."
  }'
```

## Performance Considerations

### Response Times
- **First request**: 20-45 seconds (model loading)
- **Subsequent requests**: 5-15 seconds (model cached)
- **Average on modern hardware**: 8-12 seconds per essay

### Memory Usage
- **Ollama process**: ~4-6GB RAM (for 7B model)
- **API process**: ~200-300MB RAM
- **Total**: ~4.5-6.5GB RAM recommended

### Optimization Tips
1. **Keep Ollama running**: Don't stop/restart between requests
2. **Use connection pooling**: Reuse HTTP connections
3. **Cache evaluations**: Store results for identical essays
4. **Batch processing**: Queue essays for off-peak evaluation
5. **Monitor logs**: Check for repeated errors to improve prompts

## Logging

All requests are logged with:
- Timestamp
- Service name
- Action performed
- Duration
- Token usage (for Ollama)
- Errors if any

### Log Locations
- **Console**: Development mode shows all logs
- **stderr**: Production errors logged to stderr

### Example Log Entry
```json
{
  "timestamp": "2025-05-19T10:30:45.123Z",
  "level": "success",
  "service": "ScoringService",
  "action": "evaluateEssay",
  "duration": 8234,
  "language": "English",
  "overall_score": 8
}
```

## Security Considerations

### Prompt Injection Prevention
1. **Sanitization**: Removes control characters
2. **Pattern detection**: Blocks common injection attempts
3. **Length limits**: Prevents extremely long inputs
4. **Type validation**: Strict TypeScript types

### Best Practices
1. **Never trust user input**: All input sanitized before processing
2. **Environment variables**: Sensitive config in .env.local
3. **Error messages**: Development errors hidden in production
4. **Timeout protection**: Prevents hanging requests
5. **Rate limiting**: Consider adding at API gateway level

## Future Enhancements

### Planned Features
1. **Speaking Evaluation**: Audio transcription + evaluation
2. **IELTS Scoring**: Band score calculation (1-9)
3. **TOPIK/JLPT/HSK Support**: Standardized test scoring
4. **Multiple AI Models**: Claude, GPT, etc.
5. **Cached Evaluations**: Store and reuse results
6. **Batch Processing**: Evaluate multiple essays
7. **User Progress Tracking**: Track improvement over time
8. **Custom Rubrics**: Client-defined scoring criteria

### Extension Points
1. **Ollama Service**: Easy to switch AI providers
2. **Prompt Builder**: Language-specific templates
3. **Scoring Service**: Custom scoring algorithms
4. **Validators**: Additional validation rules
5. **Response Formatters**: Custom response structures

## Troubleshooting

### Ollama Connection Error
```
Error: Ollama request timeout after 60000ms
```
**Solution**: 
1. Verify Ollama is running: `curl http://127.0.0.1:11434/api/tags`
2. Check firewall settings
3. Restart Ollama service

### JSON Parse Error
```
Failed to parse AI response
```
**Solution**:
1. Check Ollama is using correct model: `ollama list`
2. Verify model responds correctly: Test with simple prompt
3. Check available memory

### Out of Memory Error
```
OOM: Model loading failed
```
**Solution**:
1. Close other applications
2. Use smaller model (qwen2.5:3b)
3. Increase system RAM
4. Use GPU acceleration (if available)

## References

- [Ollama Documentation](https://ollama.ai)
- [Qwen Model](https://github.com/QwenLM/Qwen)
- [JSON Schema](https://json-schema.org/)
- [Language Detection](https://github.com/pemistahl/lingua)

---

**Last Updated**: May 19, 2025  
**Version**: 1.0.0  
**Status**: Production Ready
