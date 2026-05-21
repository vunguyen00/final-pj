# Environment Variables Setup

## Overview

This document outlines all environment variables needed for the AI writing evaluation system.

## Required Variables

### `.env.local` - Development

```env
# =====================================
# DATABASE (Existing)
# =====================================
DATABASE_URL="postgresql://user:password@localhost:5432/your_db"

# =====================================
# AUTH (Existing)
# =====================================
AUTH_SECRET="your-secret-key-here"
JWT_SECRET="your-jwt-secret-here"

# =====================================
# AI WRITING EVALUATION (NEW)
# =====================================

# Ollama API endpoint
# Default: http://127.0.0.1:11434
# Change if Ollama runs on different host/port
OLLAMA_URL=http://127.0.0.1:11434

# Ollama model to use
# Default: qwen2.5:7b (recommended)
# Alternatives:
#   - qwen2.5:3b (faster, lower quality)
#   - qwen2.5:14b (slower, higher quality)
#   - llama2:7b (different model)
#   - mistral:7b (different model)
OLLAMA_MODEL=qwen2.5:7b

# =====================================
# OPTIONAL: Node Environment
# =====================================

# Set to 'development' to see detailed logs
NODE_ENV=development

# Set to 'production' to hide error details from clients
# NODE_ENV=production
```

### `.env.production` - Production

```env
DATABASE_URL="postgresql://prod-user:prod-password@prod-db.example.com:5432/prod_db"

AUTH_SECRET="your-production-secret-key"
JWT_SECRET="your-production-jwt-secret"

# Point to your production Ollama instance
OLLAMA_URL=http://ollama-server.your-domain.com:11434
OLLAMA_MODEL=qwen2.5:7b

NODE_ENV=production
```

## Variable Details

### `OLLAMA_URL`

**Purpose**: Endpoint where Ollama API is running

**Format**: `http://[host]:[port]`

**Examples**:
- Local development: `http://127.0.0.1:11434`
- Docker container: `http://ollama:11434`
- Remote server: `http://ollama.example.com:11434`
- With proxy: `http://proxy.example.com:11434`

**Default**: `http://127.0.0.1:11434`

**How to find your Ollama URL**:
```bash
# If running locally
echo "http://127.0.0.1:11434"

# If running in Docker
docker inspect <container-id> | grep IPAddress
# Then use: http://<ip-address>:11434

# If running on server
# SSH into server and check Ollama process
ps aux | grep ollama
```

### `OLLAMA_MODEL`

**Purpose**: Which Ollama model to use for evaluations

**Available Models**:

| Model | Size | Speed | Quality | RAM Needed |
|-------|------|-------|---------|-----------|
| qwen2.5:3b | 2GB | Fast | Good | 4GB |
| qwen2.5:7b | 5GB | Medium | Excellent | 8GB |
| qwen2.5:14b | 10GB | Slow | Best | 16GB |
| llama2:7b | 4GB | Medium | Good | 8GB |
| mistral:7b | 4GB | Medium | Good | 8GB |

**Default**: `qwen2.5:7b` (recommended for balance)

**Recommendation by Use Case**:
- **Development/Testing**: `qwen2.5:3b` (faster)
- **Production**: `qwen2.5:7b` (balanced)
- **High Quality**: `qwen2.5:14b` (if resources allow)

**How to pull a model**:
```bash
ollama pull qwen2.5:7b
# First pull downloads 5GB (one-time)
```

## Verification

### Check if variables are loaded

```typescript
// In your Next.js code
console.log({
  ollamaUrl: process.env.OLLAMA_URL,
  ollamaModel: process.env.OLLAMA_MODEL,
});
// Should output:
// {
//   ollamaUrl: 'http://127.0.0.1:11434',
//   ollamaModel: 'qwen2.5:7b'
// }
```

### Test Ollama connection

```bash
# From terminal
curl -X GET http://127.0.0.1:11434/api/tags

# Expected response:
# {
#   "models": [
#     {
#       "name": "qwen2.5:7b",
#       "modified_at": "2024-01-15T10:30:00Z",
#       "size": 5000000000,
#       "digest": "sha256:..."
#     }
#   ]
# }
```

### Test from Node.js

```typescript
// Quick test script
async function testOllama() {
  const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    const data = await response.json();
    console.log("✓ Ollama connected");
    console.log("Available models:", data.models.map(m => m.name));
  } catch (error) {
    console.error("✗ Ollama connection failed:", error);
  }
}

testOllama();
```

## Setup Checklist

### ✓ Local Development

- [ ] Install Ollama from https://ollama.ai
- [ ] Ollama running in background
- [ ] Create `.env.local` file in project root
- [ ] Add `OLLAMA_URL=http://127.0.0.1:11434`
- [ ] Add `OLLAMA_MODEL=qwen2.5:7b`
- [ ] Run `ollama pull qwen2.5:7b`
- [ ] Test: `curl http://127.0.0.1:11434/api/tags`
- [ ] Start Next.js: `npm run dev`
- [ ] Test API: `curl http://localhost:3000/api/ai/essay-evaluation` (should return 200)

### ✓ Docker Deployment

- [ ] Create Ollama container: `docker run -d -p 11434:11434 ollama/ollama`
- [ ] In Next.js container, set: `OLLAMA_URL=http://ollama:11434`
- [ ] Containers should be on same network
- [ ] Test connection from Next.js container

### ✓ Production Deployment

- [ ] Ollama running on production server
- [ ] Firewall allows connections to port 11434
- [ ] Update `.env.production` with production Ollama URL
- [ ] Test: `curl http://[production-ip]:11434/api/tags`
- [ ] Deploy Next.js with production env vars
- [ ] Monitor logs for connection issues

## Troubleshooting

### Variable not loading

**Problem**: `process.env.OLLAMA_URL` is undefined

**Solutions**:
1. Restart Next.js dev server (`npm run dev`)
2. Check `.env.local` file exists in project root
3. Check variable names are exact (case-sensitive)
4. Restart IDE/terminal
5. Check for `.env.local.example` copy issues

### Ollama connection fails

**Problem**: "Failed to connect to Ollama"

**Solutions**:
1. Verify Ollama is running: `curl http://127.0.0.1:11434/api/tags`
2. Check `OLLAMA_URL` is correct
3. Verify firewall allows port 11434
4. Check Ollama process: `ps aux | grep ollama`
5. Restart Ollama service

### Model not found

**Problem**: "Model qwen2.5:7b not found"

**Solutions**:
1. List available models: `ollama list`
2. Pull model: `ollama pull qwen2.5:7b`
3. Check `OLLAMA_MODEL` matches available model name
4. Wait for model to fully download

### Different behavior between dev and production

**Causes**:
1. Different `.env.local` vs `.env.production`
2. Different Ollama URLs
3. Different model versions
4. Different Node environment

**Solutions**:
1. Verify both `.env` files are correct
2. Use same `OLLAMA_MODEL` in both
3. Use same Ollama version
4. Test production env locally: `NODE_ENV=production npm run build && npm start`

## Best Practices

### Security

```env
# ✗ BAD - exposing secrets
OLLAMA_URL=http://username:password@ollama.com:11434

# ✓ GOOD - using environment variables only
OLLAMA_URL=http://ollama.com:11434
OLLAMA_AUTH_TOKEN=secret-token-here  # if needed
```

### Performance

```env
# ✓ GOOD - consistent model choice
OLLAMA_MODEL=qwen2.5:7b

# ✗ BAD - changing models frequently causes reloads
# Don't change OLLAMA_MODEL in production
```

### Documentation

```env
# ✓ GOOD - documented why this value
# Using smaller model for faster response in development
OLLAMA_MODEL=qwen2.5:3b

# ✓ GOOD - include example
# Format: http://[host]:[port]
OLLAMA_URL=http://127.0.0.1:11434
```

## Environment-Specific Examples

### Development (Fast Iteration)
```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
NODE_ENV=development
```

### Staging (Pre-Production)
```env
OLLAMA_URL=http://ollama-staging.internal.com:11434
OLLAMA_MODEL=qwen2.5:7b
NODE_ENV=production
```

### Production (High Performance)
```env
OLLAMA_URL=http://ollama-prod.internal.com:11434
OLLAMA_MODEL=qwen2.5:7b
NODE_ENV=production
```

### Docker Compose
```yaml
version: '3'
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    
  app:
    build: .
    environment:
      - OLLAMA_URL=http://ollama:11434
      - OLLAMA_MODEL=qwen2.5:7b
    depends_on:
      - ollama
```

---

**Last Updated**: May 19, 2025
