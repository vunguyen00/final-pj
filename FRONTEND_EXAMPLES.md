# Frontend Integration Examples

## React Component Example

### Simple Essay Evaluation Component

```typescript
'use client';

import { useState } from 'react';

interface EvaluationData {
  evaluation: {
    scores: {
      grammar: number;
      vocabulary: number;
      coherence: number;
      task_response: number;
      overall: number;
    };
    summary: string;
    language: string;
  };
  analysis: {
    strengths: string[];
    weaknesses: string[];
    feedback: string[];
    suggestions: string[];
  };
  improvements: {
    corrections: Array<{
      original: string;
      improved: string;
      reason: string;
    }>;
    improved_version: string;
  };
}

interface EvaluationError {
  error: string;
  details?: string;
}

export function EssayEvaluator() {
  const [essay, setEssay] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/essay-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essay }),
      });

      if (!response.ok) {
        const errorData: EvaluationError = await response.json();
        throw new Error(errorData.error || 'Failed to evaluate essay');
      }

      const data = await response.json();
      setEvaluation(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Essay Evaluation</h1>

      {/* Input Form */}
      <form onSubmit={handleEvaluate} className="mb-8">
        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="Paste your essay here..."
          className="w-full h-64 p-4 border rounded-lg resize-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !essay.trim()}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
        >
          {loading ? 'Evaluating...' : 'Evaluate Essay'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {evaluation && (
        <div className="space-y-6">
          {/* Scores */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Scores</h2>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Grammar', value: evaluation.evaluation.scores.grammar },
                { label: 'Vocabulary', value: evaluation.evaluation.scores.vocabulary },
                { label: 'Coherence', value: evaluation.evaluation.scores.coherence },
                { label: 'Task Response', value: evaluation.evaluation.scores.task_response },
                { label: 'Overall', value: evaluation.evaluation.scores.overall },
              ].map((score) => (
                <div key={score.label} className="text-center">
                  <div className="text-4xl font-bold text-blue-600">
                    {score.value}
                  </div>
                  <div className="text-sm text-gray-600">{score.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-gray-700">
              {evaluation.evaluation.summary}
            </p>
          </div>

          {/* Analysis */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Analysis</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-green-700 mb-2">Strengths</h3>
                <ul className="list-disc list-inside space-y-1">
                  {evaluation.analysis.strengths.map((s, i) => (
                    <li key={i} className="text-gray-700">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-red-700 mb-2">Weaknesses</h3>
                <ul className="list-disc list-inside space-y-1">
                  {evaluation.analysis.weaknesses.map((w, i) => (
                    <li key={i} className="text-gray-700">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Feedback & Suggestions</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-2">Feedback</h3>
                <ul className="space-y-2">
                  {evaluation.analysis.feedback.map((f, i) => (
                    <li key={i} className="text-gray-700 p-2 bg-blue-50 rounded">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-2">Suggestions</h3>
                <ul className="space-y-2">
                  {evaluation.analysis.suggestions.map((s, i) => (
                    <li key={i} className="text-gray-700 p-2 bg-yellow-50 rounded">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Corrections */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Specific Corrections</h2>
            <div className="space-y-4">
              {evaluation.improvements.corrections.map((c, i) => (
                <div key={i} className="border-l-4 border-purple-600 p-4">
                  <div className="font-bold text-red-600">Original:</div>
                  <p className="text-gray-700 mb-2">{c.original}</p>
                  <div className="font-bold text-green-600">Improved:</div>
                  <p className="text-gray-700 mb-2">{c.improved}</p>
                  <div className="font-bold text-blue-600">Reason:</div>
                  <p className="text-gray-700">{c.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Improved Version */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Improved Version</h2>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-700">
              {evaluation.improvements.improved_version}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Usage in Page

```typescript
// app/student/essay-evaluation/page.tsx

import { EssayEvaluator } from '@/components/EssayEvaluator';

export default function EssayEvaluationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <EssayEvaluator />
    </div>
  );
}
```

## Advanced Features

### With Loading States

```typescript
export function EssayEvaluatorWithProgress() {
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setProgress('Sending to AI service...');

    try {
      setProgress('AI is analyzing your essay...');
      const response = await fetch('/api/ai/essay-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essay }),
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      setProgress('Processing results...');
      const data = await response.json();
      // Handle results
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div>
      {loading && progress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="mt-4">{progress}</p>
          </div>
        </div>
      )}
      {/* Form */}
    </div>
  );
}
```

### With Caching

```typescript
export function EssayEvaluatorWithCache() {
  const [cache, setCache] = useState<Map<string, EvaluationData>>(new Map());

  async function handleEvaluate(essay: string) {
    // Check cache first
    if (cache.has(essay)) {
      return cache.get(essay);
    }

    // Fetch from API
    const response = await fetch('/api/ai/essay-evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essay }),
    });

    const data = await response.json();

    // Store in cache
    setCache(new Map(cache).set(essay, data.data));

    return data.data;
  }

  return <div>{/* Component */}</div>;
}
```

### Batch Evaluation

```typescript
async function evaluateManyEssays(essays: string[]) {
  const results = [];

  for (const essay of essays) {
    const response = await fetch('/api/ai/essay-evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essay }),
    });

    if (response.ok) {
      const data = await response.json();
      results.push(data.data);
    } else {
      results.push({ error: 'Evaluation failed' });
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
```

## Integration with Existing Components

### Add to Student Dashboard

```typescript
// components/StudentDashboard.tsx

import { EssayEvaluator } from '@/components/EssayEvaluator';
import { CourseList } from '@/components/CourseList';

export function StudentDashboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <CourseList />
      </div>
      <div className="col-span-1">
        <EssayEvaluator />
      </div>
    </div>
  );
}
```

### Add to Learning Module

```typescript
// app/student/learning/[lessonId]/components/EssayTask.tsx

interface EssayTaskProps {
  lessonId: string;
  prompt: string;
}

export function EssayTask({ lessonId, prompt }: EssayTaskProps) {
  const [essay, setEssay] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);

  async function handleSubmit() {
    const response = await fetch('/api/ai/essay-evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essay }),
    });

    const data = await response.json();
    setEvaluation(data.data);
    setSubmitted(true);

    // Save progress to database
    await fetch(`/api/learning/lessons/${lessonId}/essay-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        essay,
        evaluation: data.data,
      }),
    });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Essay Task</h2>
      <p className="mb-6 text-gray-700">{prompt}</p>

      {!submitted ? (
        <div>
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder="Write your essay here..."
            className="w-full h-64 p-4 border rounded-lg"
          />
          <button
            onClick={handleSubmit}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Submit Essay
          </button>
        </div>
      ) : evaluation ? (
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Your Evaluation</h3>
          {/* Display evaluation results */}
        </div>
      ) : null}
    </div>
  );
}
```

## Error Handling Best Practices

```typescript
async function evaluateWithFallback(essay: string) {
  try {
    const response = await fetch('/api/ai/essay-evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essay }),
    });

    switch (response.status) {
      case 400:
        throw new Error('Invalid essay format');
      case 503:
        throw new Error('AI service is temporarily unavailable');
      case 504:
        throw new Error('Request timed out. Please try again later');
      case 500:
        throw new Error('Server error occurred');
    }

    return await response.json();
  } catch (error) {
    // Fallback: show cached result or basic feedback
    console.error('Evaluation failed:', error);
    return {
      error: 'Could not evaluate essay',
      fallback: true,
    };
  }
}
```

---

**Last Updated**: May 19, 2025
