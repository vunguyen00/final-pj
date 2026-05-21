# Testing Guide - AI Writing Evaluation System

## Unit Tests

### Test Structure

Create test files in `lib/ai/__tests__/`:

```
lib/ai/__tests__/
├── validators.test.ts
├── prompt-builder.test.ts
├── feedback-service.test.ts
└── scoring-service.test.ts
```

### Running Tests

```bash
# Add Jest to package.json
npm install --save-dev jest @types/jest

# Configure Jest in package.json
"jest": {
  "testEnvironment": "node",
  "testMatch": ["**/__tests__/**/*.test.ts"]
}

# Run tests
npm test

# Watch mode
npm test -- --watch
```

### Example Tests

#### Validators

```typescript
import {
  validateEssay,
  sanitizeEssay,
  detectLanguageFromText,
} from '@/lib/ai/validators';

describe('Essay Validators', () => {
  describe('validateEssay', () => {
    it('should validate a valid essay', () => {
      const essay = 'This is a valid essay with more than fifty characters here.';
      const result = validateEssay(essay);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty essay', () => {
      const result = validateEssay('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject too short essay', () => {
      const result = validateEssay('Too short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should reject too long essay', () => {
      const longEssay = 'a'.repeat(10001);
      const result = validateEssay(longEssay);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  describe('sanitizeEssay', () => {
    it('should remove control characters', () => {
      const essay = 'Hello\x00World\x01Test';
      const cleaned = sanitizeEssay(essay);
      expect(cleaned).toBe('HelloWorldTest');
    });

    it('should preserve newlines', () => {
      const essay = 'Line 1\nLine 2\nLine 3';
      const cleaned = sanitizeEssay(essay);
      expect(cleaned).toContain('\n');
    });
  });

  describe('detectLanguageFromText', () => {
    it('should detect English', () => {
      expect(detectLanguageFromText('Hello world')).toBe('English');
    });

    it('should detect Japanese', () => {
      expect(detectLanguageFromText('こんにちは世界')).toBe('Japanese');
    });

    it('should detect Korean', () => {
      expect(detectLanguageFromText('안녕하세요')).toBe('Korean');
    });

    it('should detect Chinese', () => {
      expect(detectLanguageFromText('你好世界')).toBe('Chinese');
    });

    it('should detect Vietnamese', () => {
      expect(detectLanguageFromText('Xin chào thế giới')).toBe('Vietnamese');
    });
  });
});
```

#### Feedback Service

```typescript
import { parseAIResponse, sanitizeResponse } from '@/lib/ai/feedback-service';

describe('Feedback Service', () => {
  const validResponse = {
    language: 'English',
    grammar: 8,
    vocabulary: 7,
    coherence: 8,
    task_response: 9,
    overall: 8,
    summary: 'Good essay',
    strengths: ['Well organized'],
    weaknesses: ['Minor errors'],
    feedback: ['Add more examples'],
    suggestions: ['Use complex sentences'],
    improved_version: 'Improved text',
    corrections: [
      {
        original: 'original text',
        improved: 'improved text',
        reason: 'Better phrasing',
      },
    ],
  };

  describe('parseAIResponse', () => {
    it('should parse valid JSON response', () => {
      const json = JSON.stringify(validResponse);
      const result = parseAIResponse(json);
      expect(result).not.toBeNull();
      expect(result?.overall).toBe(8);
    });

    it('should handle markdown wrapped JSON', () => {
      const wrapped = `\`\`\`json\n${JSON.stringify(validResponse)}\n\`\`\``;
      const result = parseAIResponse(wrapped);
      expect(result).not.toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const result = parseAIResponse('Not JSON');
      expect(result).toBeNull();
    });
  });

  describe('sanitizeResponse', () => {
    it('should remove invalid corrections', () => {
      const response = {
        ...validResponse,
        corrections: [
          { original: '', improved: 'text', reason: 'reason' },
          { original: 'text', improved: '', reason: 'reason' },
          { original: 'text', improved: 'better', reason: '' },
          { original: 'valid', improved: 'corrected', reason: 'valid reason' },
        ],
      };
      const sanitized = sanitizeResponse(response);
      expect(sanitized.corrections).toHaveLength(1);
    });

    it('should ensure arrays are not empty', () => {
      const response = {
        ...validResponse,
        strengths: [],
        weaknesses: [],
      };
      const sanitized = sanitizeResponse(response);
      expect(Array.isArray(sanitized.strengths)).toBe(true);
    });
  });
});
```

## Integration Tests

### API Endpoint Testing

```bash
# Test health check
curl http://localhost:3000/api/ai/essay-evaluation

# Expected: 200 status with healthy status

# Test successful evaluation
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "The importance of education cannot be overstated. Education provides knowledge and skills needed for success. It opens doors to opportunities and helps develop critical thinking. In conclusion, education is fundamental to personal and societal development."
  }'

# Expected: 200 status with complete evaluation

# Test validation error
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"essay": "Short"}'

# Expected: 400 status with error message

# Test missing field
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"text": "No essay field"}'

# Expected: 400 status with error message
```

### Test Coverage Matrix

| Component | Test Scenario | Expected Result |
|-----------|---------------|-----------------|
| Validators | Valid essay (50+ chars) | Pass validation |
| Validators | Empty essay | Fail validation |
| Validators | Too short essay | Fail with message |
| Validators | Too long essay (>10k) | Fail with message |
| Validators | Valid English | Detect "English" |
| Validators | Valid Japanese | Detect "Japanese" |
| Validators | Valid Korean | Detect "Korean" |
| Validators | Valid Chinese | Detect "Chinese" |
| Validators | Valid Vietnamese | Detect "Vietnamese" |
| Validators | Injection attempt | Fail safety check |
| API | POST with essay | 200 with results |
| API | GET request | 200 with health status |
| API | Missing essay field | 400 error |
| API | Invalid JSON | 400 error |
| API | Ollama unavailable | 503 error |
| API | Timeout | 504 error |
| Feedback | Valid AI response | Parsed successfully |
| Feedback | JSON with markdown | Parsed successfully |
| Feedback | Invalid JSON | Return null |
| Scoring | Complete flow | 200 with evaluation |

## Manual Testing Procedures

### Test 1: Basic Setup Verification

```bash
# 1. Check Ollama is running
curl http://127.0.0.1:11434/api/tags
# Response: { "models": [...] }

# 2. Check environment variables
grep OLLAMA .env.local
# Output: OLLAMA_URL=... OLLAMA_MODEL=...

# 3. Check API route exists
ls app/api/ai/essay-evaluation/route.ts

# 4. Start dev server
npm run dev
# Output: ready - started server on 0.0.0.0:3000

# 5. Test health endpoint
curl http://localhost:3000/api/ai/essay-evaluation
# Response: status: "healthy"
```

### Test 2: Full Evaluation Flow

```bash
# Create test essay file
cat > test_essay.txt << 'EOF'
The role of technology in modern education has become increasingly important. 
Technology provides students with access to vast amounts of information and 
facilitates interactive learning. Furthermore, it enables students to learn at 
their own pace and from anywhere. However, excessive technology use may lead to 
distraction. In conclusion, technology is a valuable tool that must be used 
wisely in education.
EOF

# Send to API
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "essay": "$(cat test_essay.txt)"
}
EOF

# Verify response contains:
# - success: true
# - evaluation.scores (grammar, vocabulary, coherence, task_response, overall)
# - analysis (strengths, weaknesses, feedback, suggestions)
# - improvements (corrections, improved_version)
```

### Test 3: Multilingual Evaluation

```bash
# Test Japanese
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "私は学生です。毎日学校に行きます。友達とよく勉強します。将来はエンジニアになりたいです。技術は非常に重要です。"
  }'
# Expect: language: "Japanese"

# Test Korean  
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "저는 학생입니다. 매일 학교에 갑니다. 친구들과 공부합니다. 미래에는 엔지니어가 되고 싶습니다."
  }'
# Expect: language: "Korean"

# Test Vietnamese
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "Tôi là một sinh viên. Tôi học tiếng Anh mỗi ngày. Tôi thích đọc sách. Tôi muốn trở thành giáo viên."
  }'
# Expect: language: "Vietnamese"
```

### Test 4: Error Handling

```bash
# Test 1: Empty essay
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"essay": ""}'
# Expect: 400, error: "Essay cannot be empty"

# Test 2: Too short
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"essay": "Short"}'
# Expect: 400, error: "too short"

# Test 3: Missing field
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"text": "invalid"}'
# Expect: 400, error: "Request must contain 'essay' field"

# Test 4: Ollama down (stop Ollama first)
curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"essay": "Test essay with enough characters..."}'
# Expect: 503, error: "AI service is unavailable"
```

### Test 5: Performance Testing

```bash
# Measure response time (first request - model loading)
time curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"essay": "Test essay with at least fifty characters to be valid..."}'
# Expected: 20-45 seconds real time

# Measure response time (subsequent requests - cached)
time curl -X POST http://localhost:3000/api/ai/essay-evaluation \
  -H "Content-Type: application/json" \
  -d '{"essay": "Test essay with at least fifty characters to be valid..."}'
# Expected: 5-15 seconds real time

# Load test (careful with system resources)
for i in {1..5}; do
  echo "Request $i"
  curl -X POST http://localhost:3000/api/ai/essay-evaluation \
    -H "Content-Type: application/json" \
    -d '{"essay": "Test essay number '$i' with sufficient content length..."}' \
    -w "\nTime: %{time_total}s\n"
  sleep 1
done
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: AI Service Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      ollama:
        image: ollama/ollama:latest
        options: >-
          --health-cmd "curl -f http://localhost:11434/api/tags"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Pull Ollama model
        run: |
          docker exec $(docker ps -q -f ancestor=ollama/ollama) \
            ollama pull qwen2.5:7b
      
      - name: Run unit tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          OLLAMA_URL: http://localhost:11434
          OLLAMA_MODEL: qwen2.5:7b
```

## Test Results Log Example

```json
{
  "timestamp": "2025-05-19T10:30:00Z",
  "tests": {
    "validators": {
      "valid_essay": "PASS",
      "empty_essay": "PASS",
      "short_essay": "PASS",
      "long_essay": "PASS",
      "language_detection": "PASS"
    },
    "feedback_service": {
      "parse_valid_json": "PASS",
      "parse_markdown_json": "PASS",
      "parse_invalid_json": "PASS",
      "sanitize_response": "PASS"
    },
    "api_endpoint": {
      "health_check": "PASS",
      "valid_evaluation": "PASS",
      "validation_error": "PASS",
      "missing_field_error": "PASS"
    },
    "multilingual": {
      "english": "PASS",
      "japanese": "PASS",
      "korean": "PASS",
      "chinese": "PASS",
      "vietnamese": "PASS"
    }
  },
  "summary": {
    "total": 24,
    "passed": 24,
    "failed": 0,
    "success_rate": "100%"
  }
}
```

## Performance Benchmarks

### Expected Metrics

```
Response Time Distribution:
- Health check: <100ms
- First evaluation: 20-45 seconds
- Subsequent evaluations: 5-15 seconds
- Average essay: 8-12 seconds

Resource Usage:
- Memory: 200-300MB (API process)
- Ollama: 4-6GB (model)
- Total: 4.5-6.5GB

Throughput:
- Serial: ~4-7 requests/minute
- Parallel (with multiple Ollama): 10-15 requests/minute
```

---

**Last Updated**: May 19, 2025
