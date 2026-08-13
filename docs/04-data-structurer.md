# Pattern 04: The Data Structurer (Structured Output)

## The Problem
Build an endpoint that takes messy, unstructured human text and forces the LLM to output a perfectly structured JSON object ready for a database.

## The Mindset Shift
LLMs are inherently probabilistic text generators, but software needs deterministic structured data. The AI product thinker knows they must build 'guardrails'. You don't trust the LLM to just output JSON; you enforce it at the API level and validate it with traditional code before it touches your DB.

## Architecture Flow
1. **Input Reception:** Receive messy text (e.g., 'I hated my order #12345, the shoes were too small!').
2. **Schema Definition:** Define a strict JSON schema (e.g., with fields: `issue_category`, `sentiment`, `order_id`).
3. **Enforced Prompting:** Call the LLM with JSON Mode enabled, passing the strict schema.
4. **Validation Layer:** Parse the LLM output. Verify it actually matches the schema using code.
5. **Database Storage:** If valid, write directly to a traditional database.

## Implementation (Live Demo Details)

To ensure traditional backend systems don't crash when trying to parse LLM output, we must use `responseSchema`. This guarantees the LLM will map the ambiguous text string precisely into the predefined keys and types.

```typescript
// 1. Define the rigorous API contract (Schema)
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    issue_category: { 
      type: Type.STRING, 
      enum: ['shipping', 'product_quality', 'customer_service', 'billing', 'other'],
      description: "Must be categorized precisely."
    },
    sentiment: { 
      type: Type.STRING, 
      enum: ['positive', 'neutral', 'negative'] 
    },
    urgency_score: { 
      type: Type.INTEGER, 
      description: "1 to 5, 5 being most urgent." 
    }
  },
  required: ['issue_category', 'sentiment', 'urgency_score']
};

// 2. Execute with JSON Mode enforced
const response = await gemini.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: `Extract data from this ticket:\n\n${userText}`,
  config: {
    responseMimeType: 'application/json',
    responseSchema: responseSchema
  }
});

// 3. The output is guaranteed to be ready for your Database ORM
const cleanData = JSON.parse(response.text);
// await db.insert(tickets).values(cleanData);
```

## System Design Delta
**Keep:** Database schemas, API endpoints, Data sanitization.
**Add:** JSON mode enforcement, Fallback parsing logic, Probabilistic categorical matching.

## Failure Lab
*   **Malformed JSON:** The model forgets a trailing comma or closing bracket, breaking the parser.
*   **Invented Categories:** The model outputs a category that wasn't in your allowed Enum list.
*   **Silent Truncation:** The model hits its max output token limit before closing the JSON object.

## Evaluation
*   **JSON Parse Success Rate:** The percentage of API calls that return strictly valid JSON.
*   **Schema Conformance:** How often the parsed JSON perfectly matches the expected interface.
