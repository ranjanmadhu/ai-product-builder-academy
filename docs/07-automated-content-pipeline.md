# Pattern 07: Automated Content Pipeline (Prompt Chaining)

## The Problem
Build a multi-step workflow: scrape URL -> AI summarizes -> AI writes blog -> AI drafts tweets.

## The Mindset Shift
Decomposition. Do not ask one prompt to do 5 things ("Scrape, summarize, write a blog, and make tweets"). The AI will lose focus and fail. AI System Design is about breaking complex tasks into small, highly specialized, predictable steps (nodes). If step 2 fails, you can retry it without re-running step 1.

## Architecture Flow
1. **Extraction (Traditional):** Backend uses a web scraper to extract raw text, stripping HTML.
2. **Node 1 (Synthesizer):** LLM Call 1: "Summarize this raw text into 3 key takeaways."
3. **Node 2 (Writer):** LLM Call 2: "Using these 3 takeaways, write a 500-word blog post in an engaging tone."
4. **Node 3 (Marketer):** LLM Call 3: "Based on this blog post, write 3 promotional Twitter threads."
5. **State Machine:** An orchestrator manages the passing of outputs from one step to the next.

## Implementation (Live Demo Details)

Instead of relying on a single mega-prompt to perform every action, the client orchestrates individual, distinct calls to specialized endpoints on the Express server. State is passed down sequentially, allowing for easy error boundaries and retries.

```typescript
// 1. Traditional web scraping (No AI involved yet)
const extractRes = await fetch('/api/pipeline/extract', {
  method: 'POST', body: JSON.stringify({ url: "https://wikipedia.org/..." })
});
const { text } = await extractRes.json();

// 2. Synthesizer Node (LLM Call 1: Fast, focused on comprehension)
const sumRes = await fetch('/api/pipeline/summarize', {
  method: 'POST', body: JSON.stringify({ text })
});
const { text: takeaways } = await sumRes.json();

// 3. Writer Node (LLM Call 2: Uses the takeaways to maintain accuracy)
const blogRes = await fetch('/api/pipeline/blog', {
  method: 'POST', body: JSON.stringify({ takeaways })
});
const { text: blog } = await blogRes.json();

// 4. Marketer Node (LLM Call 3: Adapts the blog tone for social media)
const tweetRes = await fetch('/api/pipeline/tweet', {
  method: 'POST', body: JSON.stringify({ blog })
});
const { text: tweets } = await tweetRes.json();
```

## System Design Delta
**Keep:** Cron jobs, Web scraping, State machines.
**Add:** Prompt chaining, Context passing, Mid-pipeline failure recovery.

## Failure Lab
*   **Context Degradation:** Information gets lost or distorted as it passes through multiple LLM nodes.
*   **Tone Inconsistency:** Node 2 writes in a different brand voice than Node 3.
*   **Cascading Failures:** If Node 1 produces garbage, all subsequent nodes waste tokens operating on garbage.

## Evaluation
*   **End-to-End Completion Rate:** Percentage of pipeline runs that successfully complete all steps without a validation error.
*   **Step-wise Validation Rate:** Tracking the pass/fail rate of intermediate guardrails between nodes.
