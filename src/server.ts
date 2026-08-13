import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import * as cheerio from 'cheerio';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini SDK
// Only initialize lazily when the endpoint is hit, or globally if we're sure the key is present.
// It's safer to instantiate it inside the route or using a getter.
let ai: GoogleGenAI | null = null;
function getAi() {
  if (!ai) {
    const key = process.env['GEMINI_API_KEY'];
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    ai = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return ai;
}

app.post('/api/voice-notes', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    const gemini = getAi();
    const response = await gemini.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: audioBase64, mimeType: mimeType || 'audio/webm' } },
            { text: 'Transcribe this audio exactly. Then, provide a brief summary and extract a list of action items.' }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          description: "Transcription and analysis of voice notes",
          properties: {
            transcript: {
              type: Type.STRING,
              description: "The exact transcript of the audio.",
            },
            summary: {
              type: Type.STRING,
              description: "A 1-2 sentence summary of what was said.",
            },
            action_items: {
              type: Type.ARRAY,
              description: "Actionable items mentioned in the audio.",
              items: { type: Type.STRING }
            }
          },
          required: ["transcript", "summary", "action_items"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "{}";
    const structuredData = JSON.parse(jsonStr);
    
    res.json(structuredData);
  } catch (error: unknown) {
    console.error('Error processing voice notes:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message || 'Failed to process audio' });
    } else {
      res.status(500).json({ error: 'Failed to process audio' });
    }
  }
});

app.post('/api/smart-assistant', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const gemini = getAi();
    
    // Define the tools (API connections) the model can use
    const tools: Record<string, unknown>[] = [{
      functionDeclarations: [
        {
          name: 'predict_age',
          description: 'Predict the age of a person based on their first name.',
          parameters: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING, description: 'The first name of the person.' } },
            required: ['name']
          }
        },
        {
          name: 'get_weather',
          description: 'Get the current weather for a given city.',
          parameters: {
            type: Type.OBJECT,
            properties: { city: { type: Type.STRING, description: 'The name of the city.' } },
            required: ['city']
          }
        },
        {
          name: 'get_random_joke',
          description: 'Get a random setup and punchline joke.'
        }
      ]
    }];

    const contents: Record<string, unknown>[] = [{ role: 'user', parts: [{ text }] }];
    const trace: Record<string, unknown>[] = [];

    // Step 1: Send the initial request with tools
    const response1 = await gemini.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: { tools }
    });

    if (response1.functionCalls && response1.functionCalls.length > 0) {
      // The model decided to call a tool
      const call = response1.functionCalls[0];
      trace.push({ type: 'call', tool: call.name, args: call.args });
      
      let apiResult: Record<string, unknown> = {};
      
      // Step 2: Execute the requested tool locally
      try {
        if (call.name === 'predict_age') {
          const args = call.args || {};
          const name = args['name'] || 'John';
          const fetched = await fetch(`https://api.agify.io?name=${name}`);
          apiResult = await fetched.json();
        } else if (call.name === 'get_weather') {
          const args = call.args || {};
          const city = args['city'] || 'London';
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(String(city))}&count=1`);
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            const { latitude, longitude, name } = geoData.results[0];
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const weatherData = await weatherRes.json();
            apiResult = { city: name, current_weather: weatherData.current_weather };
          } else {
            apiResult = { error: 'City not found' };
          }
        } else if (call.name === 'get_random_joke') {
          const fetched = await fetch('https://official-joke-api.appspot.com/random_joke');
          apiResult = await fetched.json();
        } else {
          apiResult = { error: 'Unknown function' };
        }
      } catch {
        // Suppress unused warning by just logging it or ignoring it explicitly
        apiResult = { error: 'Failed to fetch external API' };
      }

      trace.push({ type: 'result', data: apiResult });

      // Step 3: Return the tool's result to the model
      const content = response1.candidates?.[0]?.content;
      if (content) {
        contents.push(content as unknown as Record<string, unknown>); // Append the model's call request
      }
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: call.name, response: apiResult } }]
      });

      const response2 = await gemini.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: { tools }
      });

      res.json({ text: response2.text, trace });
    } else {
      // The model answered directly without tools
      res.json({ text: response1.text, trace });
    }

  } catch (error: unknown) {
    console.error('Error in smart assistant:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message || 'Failed to process request' });
    } else {
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
});

app.post('/api/structure-data', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const gemini = getAi();
    
    // We enforce a strict schema for extracting customer feedback data
    const response = await gemini.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Extract the requested data from this messy customer input: "${text}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          description: "Structured data extracted from customer feedback",
          properties: {
            order_id: {
              type: Type.STRING,
              description: "The order ID mentioned, if any. Usually alphanumeric or numeric.",
            },
            sentiment: {
              type: Type.STRING,
              description: "The overall sentiment of the user (e.g. POSITIVE, NEGATIVE, NEUTRAL)",
            },
            issue_category: {
              type: Type.STRING,
              description: "The category of the issue (e.g. SIZING, SHIPPING, QUALITY, BILLING, OTHER, NONE)",
            },
            summary: {
              type: Type.STRING,
              description: "A one-sentence summary of the customer's message.",
            },
            requires_human_review: {
              type: Type.BOOLEAN,
              description: "True if the sentiment is extremely negative or the issue sounds complex.",
            }
          },
          required: ["sentiment", "issue_category", "summary", "requires_human_review"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "{}";
    const structuredData = JSON.parse(jsonStr);
    
    res.json(structuredData);
  } catch (error: unknown) {
    console.error('Error structuring data:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message || 'Failed to process data' });
    } else {
      res.status(500).json({ error: 'Failed to process data' });
    }
  }
});

// Pipeline Endpoints
app.post('/api/pipeline/extract', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, img, svg, header, footer, nav').remove();
    let text = $('body').text().replace(/\s+/g, ' ').trim();
    if (text.length > 10000) {
      text = text.substring(0, 10000) + '...';
    }
    res.json({ text });
  } catch (error: unknown) {
    console.error('Error extracting text:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to extract text' });
    }
  }
});

app.post('/api/pipeline/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    const gemini = getAi();
    const response = await gemini.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Summarize the following text into exactly 3 key takeaways. Format as a simple bulleted list with no introduction or conclusion.\n\nText:\n${text}`
    });
    res.json({ text: response.text });
  } catch (error: unknown) {
    if (error instanceof Error) res.status(500).json({ error: error.message });
    else res.status(500).json({ error: 'Failed to summarize' });
  }
});

app.post('/api/pipeline/blog', async (req, res) => {
  try {
    const { takeaways } = req.body;
    const gemini = getAi();
    const response = await gemini.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Using the following 3 takeaways, write a ~150 word engaging blog post. Include a catchy title and format with markdown.\n\nTakeaways:\n${takeaways}`
    });
    res.json({ text: response.text });
  } catch (error: unknown) {
    if (error instanceof Error) res.status(500).json({ error: error.message });
    else res.status(500).json({ error: 'Failed to write blog' });
  }
});

app.post('/api/pipeline/tweet', async (req, res) => {
  try {
    const { blog } = req.body;
    const gemini = getAi();
    const response = await gemini.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Based on the following blog post, write 3 promotional Twitter threads (just the first tweet of each thread). Separate each tweet with a blank line. Use appropriate emojis and hashtags.\n\nBlog Post:\n${blog}`
    });
    res.json({ text: response.text });
  } catch (error: unknown) {
    if (error instanceof Error) res.status(500).json({ error: error.message });
    else res.status(500).json({ error: 'Failed to write tweets' });
  }
});

app.post('/api/vision/extract', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const gemini = getAi();
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        merchant: { type: Type.STRING },
        date: { type: Type.STRING },
        totalAmount: { type: Type.NUMBER },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER },
              quantity: { type: Type.NUMBER }
            },
            required: ['name', 'price']
          }
        }
      },
      required: ['merchant', 'items', 'totalAmount']
    };

    const response = await gemini.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Analyze this receipt or invoice. Extract the merchant name, date, total amount, and line items. If any are missing, leave them blank or guess from context.' },
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });

    res.json({ result: JSON.parse(response.text!) });
  } catch (error: unknown) {
    console.error('Vision extraction error:', error);
    if (error instanceof Error) res.status(500).json({ error: error.message });
    else res.status(500).json({ error: 'Failed to extract vision data' });
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
