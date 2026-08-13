# Pattern 01: Smart API Assistant (Tool Calling)

## The Problem
Build a chatbot that can actually *do* things. It will take natural language, translate it into an API request, and fetch real-time data to answer the user.

## The Mindset Shift
Stop thinking of the LLM as an all-knowing database. Think of it as a reasoning engine or a "router". It doesn't know the current weather or a user's age, but it knows how to use a tool if you give it the instructions. The challenge shifts from writing parsing logic to defining robust API schemas (contracts) for the LLM to read.

## Architecture Flow
1. **User Input:** Capture the natural language query (e.g., "What's the weather in Tokyo?").
2. **LLM as a Router:** Pass the query to the LLM along with a strict JSON schema defining available tools (`get_weather(city)`).
3. **Tool Execution:** The LLM outputs a structured request to call a tool. The *backend* executes the actual API call.
4. **Context Injection:** The backend returns the raw API data (JSON) back to the LLM.
5. **Final Generation:** The LLM reads the data and formulates a human-friendly response.

## Implementation (Live Demo Details)

Under the hood, we pass the user's intent to Gemini while supplying an array of allowed `tools` (API schemas). Gemini pauses generation and returns a `functionCall` if it decides a tool is needed.

```typescript
// 1. Define the tool schema
const tools = [{
  functionDeclarations: [
    {
      name: 'predict_age',
      description: 'Predicts the age of a person based on their first name.',
      parameters: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING, description: 'First name' } },
        required: ['name']
      }
    }
  ]
}];

// 2. Call the model with tools
const response = await gemini.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: [{ role: 'user', parts: [{ text: "How old is Ranjan?" }] }],
  tools: tools
});

// 3. Handle the Function Call
if (response.functionCalls) {
  const call = response.functionCalls[0];
  if (call.name === 'predict_age') {
    // 4. Execute actual backend API logic here
    const apiResult = await fetch(`https://api.agify.io?name=${call.args.name}`);
    
    // 5. Pass result back to model for final natural language generation
  }
}
```

## System Design Delta
**Keep:** API contracts, Authentication and authorization, Timeouts/retries, Transactional writes.
**Add:** Probabilistic tool selection, Ambiguous intent resolution, Tool-result grounding, Prompt injection risk.

## Failure Lab (What goes wrong)
*   **Hallucinated Tool Calls:** The model invents a tool name that doesn't exist in your schema. (Fix: Strict backend validation before executing).
*   **Argument Type Mismatches:** Passing a string when the API requires an integer.
*   **Infinite Loops:** The model repeatedly calls an API that fails, getting stuck in a retry loop.

## Evaluation
*   **Tool Selection Accuracy:** Percentage of times the correct API is chosen for a given intent.
*   **Argument Parse Rate:** How often the arguments provided by the model pass JSON schema validation.

## References
*   [Gemini Function Calling Docs](https://ai.google.dev/docs/function_calling)
