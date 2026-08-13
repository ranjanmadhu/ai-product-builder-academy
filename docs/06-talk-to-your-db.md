# Pattern 06: Talk to Your DB (Text-to-SQL)

## The Problem
Build a tool where a user asks plain-English questions. The AI writes SQL, a tool executes it against a database, and the AI summarizes results.

## The Mindset Shift
Security is paramount. AI product thinkers treat the LLM as an untrusted user. You *never* let an LLM write directly to a production database. You map the AI to the traditional security paradigm: Principle of Least Privilege (read-only access, sandboxed execution).

## Architecture Flow
1. **Schema Context:** Fetch the database schema (table names, columns, relationships) but NOT the actual row data.
2. **Query Translation:** Pass user question + schema to LLM. Prompt: "Write a PostgreSQL query for this request. Return ONLY valid SQL."
3. **Sanitization & Execution:** Backend receives SQL. **Crucial:** Run this on a READ-ONLY replica to prevent destructive commands. Execute query.
4. **Result Summarization:** Take the raw SQL results and pass it back to the LLM.
5. **Natural Language Output:** LLM translates the raw data into a friendly summary.

## System Design Delta
**Keep:** SQL syntax execution, Read-only replicas, Query performance monitoring.
**Add:** Schema context injection, SQL sanitization, Natural language interpretation.

## Failure Lab
*   **Destructive Queries:** The model generates a DROP TABLE or UPDATE statement instead of a SELECT.
*   **Inefficient Table Scans:** The model writes valid SQL that requires a full table scan, crashing the database.
*   **Schema Misinterpretation:** The model joins the wrong tables because column names are ambiguous.

## Evaluation
*   **Query Execution Success Rate:** Percentage of generated SQL queries that execute without throwing database syntax errors.
*   **Data Accuracy:** Does the SQL query actually return the data requested by the user intent?
