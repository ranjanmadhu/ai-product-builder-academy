export interface Pattern {
  id: string;
  title: string;
  problem: string;
  architecture: { step: string; description: string }[];
  mindset: string;
  skills: string[];
  compare: {
    keep: string[];
    add: string[];
  };
  failureLab: { title: string; description: string }[];
  evaluation: { metric: string; description: string }[];
}

export const intro = {
  title: "AI Product Builder Academy",
  subtitle: "Implementation Guide",
  philosophy: "Building AI products requires a fundamental shift in how developers think about software architecture, data flow, and user experience.",
  traditional: [
    { title: "Deterministic Logic", desc: "If A happens, do B. The code executes exactly as written every single time." },
    { title: "Structured Databases", desc: "Data must be rigidly structured (e.g., SQL) before the application can make use of it." },
    { title: "Hardcoded Error Handling", desc: "Developers anticipate specific edge cases (try/catch) and write fallback logic." }
  ],
  ai: [
    { title: "Probabilistic Generation", desc: "Inputs are messy (natural language), and outputs can vary. Developers manage probabilities, not just logic." },
    { title: "Unstructured to Structured", desc: "The AI acts as a translation layer, turning messy human input into structured JSON for traditional databases." },
    { title: "Guardrails & Evals", desc: "Instead of hardcoding every edge case, developers build 'guardrails' to validate outputs and prevent hallucinations." }
  ],
  goldenRule: "Never trust the model completely. Always design systems with a 'Human-in-the-loop' (HITL) fallback, strict output validation (forcing JSON), and secure sandboxes (like read-only database execution). AI is an incredible reasoning engine, but a terrible system of record."
};

export const patterns: Pattern[] = [
  {
    id: "smart-api",
    title: "1. Smart API Assistant",
    problem: "Build a chatbot that can actually do things. It will take natural language, translate it into an API request, and fetch real-time data to answer the user.",
    architecture: [
      { step: "User Input", description: "Capture the natural language query from the user (e.g., 'What is the weather in London?')." },
      { step: "LLM as a Router", description: "Pass the query to the LLM along with a strict JSON schema defining available tools (e.g., get_weather(location))." },
      { step: "Tool Execution", description: "The LLM outputs a structured request to call a tool. The backend executes the actual API call (e.g., calling OpenWeather API)." },
      { step: "Context Injection", description: "The backend returns the raw API data (JSON) back to the LLM." },
      { step: "Final Generation", description: "The LLM reads the data and formulates a human-friendly response." }
    ],
    mindset: "Stop thinking of the LLM as an all-knowing database. Think of it as a reasoning engine or a 'router'. It doesn't know the weather, but it knows how to use a weather tool if you give it the instructions. The challenge shifts from writing parsing logic to defining robust API schemas for the LLM to read.",
    skills: ["Function Calling", "Schema Definition", "State Management"],
    compare: {
      keep: ["API contracts", "Authentication and authorization", "Timeouts, retries, observability", "Transactional and idempotent writes"],
      add: ["Probabilistic tool selection", "Ambiguous intent resolution", "Tool-result grounding", "Prompt injection and over-action risk"]
    },
    failureLab: [
      { title: "Hallucinated Tool Calls", description: "The model invents a tool name that doesn't exist in your schema." },
      { title: "Argument Type Mismatches", description: "Passing a string when the API requires an integer (e.g., age as 'twenty')." },
      { title: "Infinite Loops", description: "The model repeatedly calls an API that fails, getting stuck in a retry loop." }
    ],
    evaluation: [
      { metric: "Tool Selection Accuracy", description: "Percentage of times the correct API is chosen for a given intent." },
      { metric: "Argument Parse Rate", description: "How often the arguments provided by the model pass JSON schema validation." }
    ]
  },
  {
    id: "policy-bot",
    title: "2. Company Policy Bot",
    problem: "Build a chatbot that uses RAG to search through HR documents and accurately answer questions about leave policies, without hallucinating.",
    architecture: [
      { step: "Ingestion Pipeline", description: "Extract text from HR PDFs/Docs, split it into overlapping chunks, and convert those chunks into mathematical vectors (Embeddings)." },
      { step: "Vector Database", description: "Store the chunks and their embeddings in a Vector DB." },
      { step: "Retrieval", description: "When a user asks a question, embed their query and perform a Cosine Similarity search to find the top 3 most relevant document chunks." },
      { step: "Augmented Prompting", description: "Inject the retrieved chunks into a system prompt: 'Answer the user using ONLY the following context: [Chunks]'." },
      { step: "Constrained Generation", description: "The LLM synthesizes the answer based purely on the injected HR context." }
    ],
    mindset: "Garbage in, Garbage out (GIGO). In traditional DBs, an exact SQL match works. In AI, if your chunking strategy is bad (e.g., splitting a sentence in half), the LLM gets bad context and will hallucinate. The design focus is on the Data Pipeline (chunking/embedding), not just the LLM.",
    skills: ["Vector Math", "Chunking Strategies", "Prompt Constraints"],
    compare: {
      keep: ["Access controls (RBAC)", "Data retention policies", "Database scaling and indexing"],
      add: ["Embedding generation latency", "Semantic search logic", "Chunking strategies", "Prompt injection defense"]
    },
    failureLab: [
      { title: "Out-of-Context Retrieval", description: "The semantic search returns irrelevant documents because of poor chunking." },
      { title: "Extractive Hallucination", description: "The model answers the question using pre-trained knowledge instead of the provided context." },
      { title: "Context Window Overflow", description: "Retrieving too many chunks causes the model to 'forget' instructions at the beginning of the prompt." }
    ],
    evaluation: [
      { metric: "Retrieval Recall@K", description: "Did the top K retrieved chunks actually contain the answer?" },
      { metric: "Answer Faithfulness", description: "Is the generated answer 100% derivable from the retrieved context without external additions?" }
    ]
  },
  {
    id: "voice-notes",
    title: "3. Voice-to-Smart-Notes",
    problem: "An app that takes spoken audio, uses a speech-to-text API to transcribe it, and passes the text to an LLM to generate formatted summaries and action items.",
    architecture: [
      { step: "Audio Capture", description: "Record audio via browser/app and compress/format it." },
      { step: "Transcription API", description: "Send audio to a deterministic or specialized model (like Whisper) to get raw text." },
      { step: "Prompt Design", description: "Construct a prompt: 'Analyze this transcript. Output 1. A brief summary, 2. A bulleted list of action items with assignees.'" },
      { step: "LLM Processing", description: "Pass the raw transcript + prompt to a reasoning LLM." },
      { step: "UI Rendering", description: "Display the structured text neatly to the user, allowing them to edit." }
    ],
    mindset: "This teaches 'Model Chaining'. You don't need one massive model to do everything. Use a cheap, fast model for Speech-to-Text, and a smart, reasoning model for the summarization. Error handling is crucial here: what if the transcription misses a word? The LLM needs to be prompted to handle messy transcripts gracefully.",
    skills: ["Audio Processing", "Model Chaining", "Fuzzy Text Handling"],
    compare: {
      keep: ["Audio compression", "Blob storage", "Asynchronous job queues"],
      add: ["Fuzzy transcription handling", "Multi-modal token limits", "Acoustic anomaly handling"]
    },
    failureLab: [
      { title: "Jargon Mistranslation", description: "Industry-specific acronyms are transcribed phonetically (e.g., 'SaaS' -> 'sass')." },
      { title: "Over-Summarization", description: "The LLM aggressively summarizes the transcript, losing critical action items." },
      { title: "Speaker Diarization Failure", description: "Failing to distinguish between multiple speakers leads to misassigned action items." }
    ],
    evaluation: [
      { metric: "Word Error Rate (WER)", description: "The standard metric for measuring transcription accuracy." },
      { metric: "Action Item Extraction Rate", description: "Percentage of explicit commitments successfully extracted into structured tasks." }
    ]
  },
  {
    id: "data-structurer",
    title: "4. The Data Structurer",
    problem: "Build an endpoint that takes messy, unstructured human text and forces the LLM to output a perfectly structured JSON object ready for a database.",
    architecture: [
      { step: "Input Reception", description: "Receive messy text (e.g., 'I hated my order #12345, the shoes were too small!')." },
      { step: "Schema Definition", description: "Define a strict JSON schema (e.g., Pydantic model with fields: issue_category, sentiment, order_id)." },
      { step: "Enforced Prompting", description: "Call the LLM with JSON Mode enabled, passing the strict schema and the unstructured text." },
      { step: "Validation Layer", description: "Parse the LLM output. Use code to verify it actually matches the schema (e.g., is order_id an integer?)." },
      { step: "Database Storage", description: "If valid, write directly to a traditional SQL/NoSQL database." }
    ],
    mindset: "LLMs are inherently probabilistic text generators, but software needs deterministic structured data. The AI product thinker knows they must build 'guardrails'. You don't trust the LLM to just output JSON; you enforce it at the API level and validate it with traditional code before it touches your DB.",
    skills: ["Structured Outputs", "Data Validation", "Prompt Engineering"],
    compare: {
      keep: ["Database schemas", "API endpoints", "Data sanitization"],
      add: ["JSON mode enforcement", "Fallback parsing logic", "Probabilistic categorical matching"]
    },
    failureLab: [
      { title: "Malformed JSON", description: "The model forgets a trailing comma or closing bracket, breaking parser." },
      { title: "Invented Categories", description: "The model outputs a category that wasn't in your allowed Enum list." },
      { title: "Silent Truncation", description: "The model hits its max output token limit before closing the JSON object." }
    ],
    evaluation: [
      { metric: "JSON Parse Success Rate", description: "The percentage of API calls that return strictly valid JSON." },
      { metric: "Schema Conformance", description: "How often the parsed JSON perfectly matches the expected TypeScript interface." }
    ]
  },
  {
    id: "vision-extractor",
    title: "5. Vision Data Extractor",
    problem: "Build an app where a user uploads an image of a receipt. Use a Vision-capable LLM to analyze the image and output a digital table of items and prices.",
    architecture: [
      { step: "Image Processing", description: "Receive image, resize/compress to fit token limits, and convert to Base64 format." },
      { step: "Multimodal Payload", description: "Send a payload containing both the Base64 image and text instructions ('Extract items and prices as a list of objects')." },
      { step: "Vision LLM Analysis", description: "The model 'reads' the pixels and correlates them to text tokens." },
      { step: "Data Normalization", description: "Parse the output. Ensure prices are formatted as numbers (e.g., stripping '$' signs)." },
      { step: "Frontend Table", description: "Render the extracted data in an editable data grid so the user can verify." }
    ],
    mindset: "When blending modalities (Vision + Text), hallucination risks change. Vision models might 'invent' a price if it's blurry. The product design must include a 'Human-in-the-Loop' (HITL) step. Never auto-charge a credit card based on Vision AI; always show it to the user for confirmation first.",
    skills: ["Multimodal APIs", "Image Optimization", "Human-in-the-Loop Design"],
    compare: {
      keep: ["Image hosting", "CDNs", "Upload progress indicators"],
      add: ["Base64 encoding limits", "Visual hallucination", "Resolution downsampling logic"]
    },
    failureLab: [
      { title: "Blurry Text Misread", description: "A blurry '8' is interpreted as a '3', drastically changing a receipt total." },
      { title: "Imagined Details", description: "The model 'sees' a brand name or item that isn't actually present in the photo." },
      { title: "Layout Confusion", description: "Multi-column tables are read strictly left-to-right, scrambling row data." }
    ],
    evaluation: [
      { metric: "OCR Accuracy Equivalence", description: "How well the model extracts exact text compared to a deterministic OCR tool." },
      { metric: "Field Extraction Precision", description: "The accuracy of pulling specific target fields (e.g., Total Amount) from complex layouts." }
    ]
  },
  {
    id: "talk-db",
    title: "6. Talk to Your DB",
    problem: "Build a tool where a user asks plain-English questions. The AI writes SQL, a tool executes it against a dummy DB, and the AI summarizes results.",
    architecture: [
      { step: "Schema Context", description: "Fetch the database schema (table names, columns, relationships) but NOT the actual row data." },
      { step: "Query Translation", description: "Pass user question + schema to LLM. Prompt: 'Write a PostgreSQL query for this request. Return ONLY valid SQL.'" },
      { step: "Sanitization & Execution", description: "Backend receives SQL. Crucial: Run this on a READ-ONLY replica to prevent destructive commands. Execute query." },
      { step: "Result Summarization", description: "Take the raw SQL results and pass it back to the LLM." },
      { step: "Natural Language Output", description: "LLM translates the raw data into a friendly summary." }
    ],
    mindset: "Security is paramount. AI product thinkers treat the LLM as an untrusted user. You never let an LLM write directly to a production database. You map the AI to the traditional security paradigm: Principle of Least Privilege (read-only access, sandboxed execution).",
    skills: ["Prompt Context Injection", "Security Sandboxing", "Data Translation"],
    compare: {
      keep: ["SQL syntax execution", "Read-only replicas", "Query performance monitoring"],
      add: ["Schema context injection", "SQL sanitization", "Natural language interpretation"]
    },
    failureLab: [
      { title: "Destructive Queries", description: "The model generates a DROP TABLE or UPDATE statement instead of a SELECT." },
      { title: "Inefficient Table Scans", description: "The model writes valid SQL that requires a full table scan, crashing the database." },
      { title: "Schema Misinterpretation", description: "The model joins the wrong tables because column names are ambiguous." }
    ],
    evaluation: [
      { metric: "Query Execution Success Rate", description: "Percentage of generated SQL queries that execute without throwing database syntax errors." },
      { metric: "Data Accuracy", description: "Does the SQL query actually return the data requested by the user intent?" }
    ]
  },
  {
    id: "content-pipeline",
    title: "7. Automated Content Pipeline",
    problem: "Build a multi-step workflow: scrape URL -> AI summarizes -> AI writes blog -> AI drafts tweets.",
    architecture: [
      { step: "Extraction (Traditional)", description: "User inputs URL. Backend uses a web scraper to extract raw text, stripping HTML." },
      { step: "Node 1 (Synthesizer)", description: "LLM Call 1: 'Summarize this raw text into 3 key takeaways.'" },
      { step: "Node 2 (Writer)", description: "LLM Call 2: 'Using these 3 takeaways, write a 500-word blog post in an engaging tone.'" },
      { step: "Node 3 (Marketer)", description: "LLM Call 3: 'Based on this blog post, write 3 promotional Twitter threads.'" },
      { step: "State Machine", description: "An orchestrator (like LangChain or a simple Node script) manages the passing of outputs from one step to the next." }
    ],
    mindset: "Decomposition. Do not ask one prompt to do 5 things ('Scrape, summarize, write a blog, and make tweets'). The AI will lose focus and fail. AI System Design is about breaking complex tasks into small, highly specialized, predictable steps (nodes). If step 2 fails, you can retry it without re-running step 1.",
    skills: ["Workflow Orchestration", "Task Decomposition", "Prompt Chaining"],
    compare: {
      keep: ["Cron jobs", "Web scraping", "State machines"],
      add: ["Prompt chaining", "Context passing", "Mid-pipeline failure recovery"]
    },
    failureLab: [
      { title: "Context Degradation", description: "Information gets lost or distorted as it passes through multiple LLM nodes." },
      { title: "Tone Inconsistency", description: "Node 2 writes in a different brand voice than Node 3." },
      { title: "Cascading Failures", description: "If Node 1 produces garbage, all subsequent nodes waste tokens operating on garbage." }
    ],
    evaluation: [
      { metric: "End-to-End Completion Rate", description: "Percentage of pipeline runs that successfully complete all steps without a validation error." },
      { metric: "Step-wise Validation Rate", description: "Tracking the pass/fail rate of intermediate guardrails between nodes." }
    ]
  }
];
