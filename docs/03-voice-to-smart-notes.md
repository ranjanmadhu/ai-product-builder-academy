# Pattern 03: Voice-to-Smart-Notes (Audio + Chaining)

## The Problem
An app that takes spoken audio, transcribes it, and passes the text to an LLM to generate formatted summaries and action items.

## The Mindset Shift
This teaches "Model Chaining". You don't need one massive model to do everything. You can use a cheap, fast model for Speech-to-Text, and a reasoning model for the summarization. Error handling is crucial here: what if the transcription misses a word? The LLM needs to be prompted to handle messy transcripts gracefully.

## Architecture Flow
1. **Audio Capture:** Record audio via browser/app and compress/format it.
2. **Transcription:** Send audio to a model to get raw text.
3. **Prompt Design:** Construct a prompt: "Analyze this transcript. Output a summary and action items."
4. **LLM Processing:** Pass the raw transcript + prompt to a reasoning LLM.
5. **UI Rendering:** Display the structured text neatly to the user, allowing them to edit.

## Implementation (Live Demo Details)

When the user finishes recording audio, the frontend sends a `Base64` string to the backend. We pass this raw audio blob directly to the Gemini model using `inlineData`, along with a JSON Schema enforcement to guarantee the structure of the returned notes.

```typescript
// 1. Receive Base64 audio string from client
const { audioBase64 } = req.body;

// 2. Define the exact shape we want back
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING },
    summary: { type: Type.STRING },
    action_items: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    }
  }
};

// 3. Pass Audio + Text Instructions + Schema Guardrails
const response = await gemini.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: [
    {
      role: 'user',
      parts: [
        { text: 'Analyze this audio. Provide the exact transcript, a summary, and extract any action items.' },
        { inlineData: { mimeType: 'audio/webm', data: audioBase64 } }
      ]
    }
  ],
  config: {
    responseMimeType: 'application/json',
    responseSchema: responseSchema
  }
});

// 4. Safe parsing knowing the schema was enforced
const structuredData = JSON.parse(response.text);
```

## System Design Delta
**Keep:** Audio compression, Blob storage, Asynchronous job queues.
**Add:** Fuzzy transcription handling, Multi-modal token limits, Acoustic anomaly handling.

## Failure Lab
*   **Jargon Mistranslation:** Industry-specific acronyms are transcribed phonetically (e.g., 'SaaS' -> 'sass').
*   **Over-Summarization:** The LLM aggressively summarizes the transcript, losing critical action items.
*   **Speaker Diarization Failure:** Failing to distinguish between multiple speakers leads to misassigned action items.

## Evaluation
*   **Word Error Rate (WER):** The standard metric for measuring transcription accuracy.
*   **Action Item Extraction Rate:** Percentage of explicit commitments successfully extracted into structured tasks.
