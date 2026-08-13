# Pattern 02: Company Policy Bot (RAG)

## The Problem
Build a chatbot that uses RAG (Retrieval-Augmented Generation) to search through documents (like HR policies) and accurately answer questions without hallucinating.

## The Mindset Shift
Garbage in, Garbage out (GIGO). In traditional DBs, an exact SQL match works. In AI, if your chunking strategy is bad (e.g., splitting a sentence in half), the LLM gets bad context and will hallucinate. The design focus is on the Data Pipeline (chunking/embedding), not just the LLM.

## Architecture Flow
1. **Ingestion Pipeline:** Extract text from PDFs/Docs, split it into chunks, and convert those chunks into mathematical vectors (Embeddings).
2. **Vector Database:** Store the chunks and their embeddings.
3. **Retrieval:** When a user asks a question, embed their query and perform a Cosine Similarity search to find the top most relevant document chunks.
4. **Augmented Prompting:** Inject the retrieved chunks into a system prompt: "Answer using ONLY the following context: [Chunks]".
5. **Constrained Generation:** The LLM synthesizes the answer based purely on the injected context.

## System Design Delta
**Keep:** Access controls (RBAC), Data retention policies, Database scaling.
**Add:** Embedding generation latency, Semantic search logic, Chunking strategies, Prompt injection defense.

## Failure Lab
*   **Out-of-Context Retrieval:** The semantic search returns irrelevant documents because of poor chunking.
*   **Extractive Hallucination:** The model answers the question using pre-trained knowledge instead of the provided context.
*   **Context Window Overflow:** Retrieving too many chunks causes the model to "forget" instructions at the beginning of the prompt.

## Evaluation
*   **Retrieval Recall@K:** Did the top K retrieved chunks actually contain the answer?
*   **Answer Faithfulness:** Is the generated answer 100% derivable from the retrieved context?
