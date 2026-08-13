# AI Product Design Lab

An interactive field guide for designing trustworthy AI product features. This repository contains the source code for a web-based learning platform that demonstrates 7 practical AI-in-product patterns, emphasizing system design and uncertainty engineering over simply treating the model as "magic."

## Overview
Building AI products requires a fundamental shift in how developers think about software architecture, data flow, and user experience. 

This lab breaks down 7 core patterns. For each pattern, we analyze:
*   **Architecture Flow:** The steps from user input to final grounded response.
*   **System Design Delta:** What traditional principles to keep (API contracts, Auth) and what new AI layer concerns to add (Probabilistic Routing, JSON Mode Enforcement).
*   **Failure Lab:** Common failure modes (e.g., Hallucinated Tool Calls, Blurry Text Misreads).
*   **Evaluation:** Key metrics to measure success for each specific pattern.

## The Patterns
We have detailed blog posts exploring the system design behind each challenge:
1. [Smart API Assistant](01-smart-api-assistant.md) - From language to safe action via Tool Calling.
2. [Company Policy Bot](02-company-policy-bot.md) - Answers with evidence via RAG.
3. [Voice-to-Smart-Notes](03-voice-to-smart-notes.md) - A pipeline with inspectable stages.
4. [The Data Structurer](04-data-structurer.md) - Probabilistic extraction, deterministic contract.
5. [Vision Data Extractor](05-vision-data-extractor.md) - Pixels to evidence-backed rows.
6. [Talk to Your DB](06-talk-to-your-db.md) - Natural language over governed data.
7. [Automated Content Pipeline](07-automated-content-pipeline.md) - Workflow beats one giant prompt.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Gemini API Key from Google AI Studio.

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
**CRITICAL SECURITY NOTE:** This codebase does **not** contain hardcoded API keys. All API keys must be securely provided via environment variables. The API calls happen server-side (`src/server.ts`), which is the correct architecture to prevent leaking keys to the client browser.

Create a `.env` file in the root directory and add your Gemini API Key:
```env
GEMINI_API_KEY="your_api_key_here"
```

*Note: You can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).*

### 3. Run the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## Architecture Note
This is a full-stack Angular application utilizing Server-Side Rendering (SSR) via an Express backend (`src/server.ts`).
- **Client (Angular):** Handles the interactive UI, pattern switching, and tab states.
- **Server (Express):** Securely holds the `GEMINI_API_KEY` and proxies all AI requests, performing backend validation, prompt injection, and external tool execution.
