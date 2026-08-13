import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { intro, patterns } from './data';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly introData = intro;
  readonly patternsList = patterns;
  
  // State for the currently selected item. 'intro' or pattern ID.
  readonly selection = signal<string>('intro');
  readonly activeTab = signal<'plan' | 'failure' | 'eval'>('plan');
  
  // Computed property to get the currently selected pattern, if any.
  readonly selectedPattern = computed(() => {
    const currentSelection = this.selection();
    if (currentSelection === 'intro') return null;
    return this.patternsList.find(p => p.id === currentSelection) || null;
  });

  readonly structurerCodeSnippet = `const response = await gemini.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: \\\`Extract the requested data from this messy customer input: "\${text}"\\\`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          order_id: { type: Type.STRING },
          sentiment: { type: Type.STRING },
          issue_category: { type: Type.STRING },
          summary: { type: Type.STRING },
          requires_human_review: { type: Type.BOOLEAN }
        },
        required: ["sentiment", "issue_category", "summary", "requires_human_review"]
      }
    }
  });`;

  readonly voiceNotesCodeSnippet = `const response = await gemini.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: audioBase64, mimeType: 'audio/webm' } },
          { text: 'Transcribe this audio exactly. Then, provide a brief summary and extract a list of action items.' }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: { type: Type.STRING },
          summary: { type: Type.STRING },
          action_items: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ["transcript", "summary", "action_items"]
      }
    }
  });`;

  readonly smartApiCodeSnippet = `// 1. Define Tools
const tools = [{
  functionDeclarations: [
    { 
      name: 'get_weather', 
      description: 'Get weather for city.',
      parameters: {
        type: Type.OBJECT,
        properties: { city: { type: Type.STRING } },
        required: ['city']
      }
    },
    { name: 'get_random_joke', description: 'Get a random joke.' },
    { 
      name: 'predict_age', 
      description: 'Predict age from name.',
      parameters: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING } },
        required: ['name']
      }
    }
  ]
}];

// 2. Initial Call
const response1 = await gemini.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: [{ role: 'user', parts: [{ text }] }],
  config: { tools }
});

// 3. Check for tool calls & execute
if (response1.functionCalls) {
  const call = response1.functionCalls[0];
  const apiResult = await executeLocalFunction(call.name, call.args);

  // 4. Return result to model for final answer
  contents.push(response1.candidates[0].content);
  contents.push({
    role: 'user',
    parts: [{ functionResponse: { name: call.name, response: apiResult } }]
  });
  
  const finalResponse = await gemini.models.generateContent({
    model: 'gemini-3.6-flash',
    contents,
    config: { tools }
  });
}`;

  // Smart API Live Demo State
  readonly apiInput = signal("What is the weather like in Tokyo right now?");
  readonly apiOutput = signal<{text?: string, trace?: any[]} | null>(null);
  readonly apiIsLoading = signal(false);
  readonly apiError = signal<string | null>(null);

  updateApiInput(event: Event) {
    this.apiInput.set((event.target as HTMLTextAreaElement).value);
  }

  async runSmartApi() {
    this.apiIsLoading.set(true);
    this.apiOutput.set(null);
    this.apiError.set(null);
    
    try {
      const response = await fetch('/api/smart-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: this.apiInput() })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }
      
      this.apiOutput.set(data);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.apiError.set(e.message || "An unknown error occurred");
      } else {
        this.apiError.set("An unknown error occurred");
      }
    } finally {
      this.apiIsLoading.set(false);
    }
  }

  // Data Structurer Live Demo State
  readonly demoInput = signal("I am extremely disappointed. Order #99482 arrived 3 days late, and the jacket is way too big. I want a refund.");
  readonly demoOutput = signal<string | null>(null);
  readonly demoIsLoading = signal(false);
  readonly demoError = signal<string | null>(null);

  updateDemoInput(event: Event) {
    this.demoInput.set((event.target as HTMLTextAreaElement).value);
  }

  async runDataStructurer() {
    this.demoIsLoading.set(true);
    this.demoOutput.set(null);
    this.demoError.set(null);
    
    try {
      const response = await fetch('/api/structure-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: this.demoInput() })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }
      
      this.demoOutput.set(JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.demoError.set(e.message || "An unknown error occurred");
      } else {
        this.demoError.set("An unknown error occurred");
      }
    } finally {
      this.demoIsLoading.set(false);
    }
  }

  // Voice Notes Live Demo State
  readonly isRecording = signal(false);
  readonly voiceOutput = signal<{transcript?: string, summary?: string, action_items?: string[]} | null>(null);
  readonly voiceIsLoading = signal(false);
  readonly voiceError = signal<string | null>(null);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.voiceError.set(null);
      this.voiceOutput.set(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch (err: unknown) {
      this.voiceError.set("Microphone access denied or unavailable.");
      console.error(err);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
    }
  }

  async processAudio(blob: Blob) {
    this.voiceIsLoading.set(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const result = reader.result as string;
        const base64data = result.split(',')[1];
        
        const response = await fetch('/api/voice-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64data, mimeType: blob.type })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to process audio');
        this.voiceOutput.set(data);
        this.voiceIsLoading.set(false);
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.voiceError.set(err.message || "Failed to process audio");
      } else {
        this.voiceError.set("Failed to process audio");
      }
      this.voiceIsLoading.set(false);
    }
  }

  selectItem(id: string) {
    this.selection.set(id);
    this.activeTab.set('plan');
    
    // Attempt to scroll the main content area to top if we can find it
    const mainArea = document.querySelector('main');
    if (mainArea) {
      mainArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Pipeline Live Demo State
  readonly pipelineUrl = signal("https://en.wikipedia.org/wiki/Artificial_intelligence");
  readonly pipelineActiveStep = signal<0 | 1 | 2 | 3 | 4>(0);
  readonly pipelineText = signal("");
  readonly pipelineTakeaways = signal("");
  readonly pipelineBlog = signal("");
  readonly pipelineTweets = signal("");
  readonly pipelineError = signal("");

  updatePipelineUrl(event: Event) {
    this.pipelineUrl.set((event.target as HTMLInputElement).value);
  }

  async runPipeline() {
    this.pipelineError.set("");
    this.pipelineText.set("");
    this.pipelineTakeaways.set("");
    this.pipelineBlog.set("");
    this.pipelineTweets.set("");

    try {
      // Step 1: Extract
      this.pipelineActiveStep.set(1);
      const extractRes = await fetch('/api/pipeline/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: this.pipelineUrl() })
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error || 'Failed to extract text');
      this.pipelineText.set(extractData.text);

      // Step 2: Summarize
      this.pipelineActiveStep.set(2);
      const sumRes = await fetch('/api/pipeline/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: this.pipelineText() })
      });
      const sumData = await sumRes.json();
      if (!sumRes.ok) throw new Error(sumData.error || 'Failed to summarize text');
      this.pipelineTakeaways.set(sumData.text);

      // Step 3: Blog
      this.pipelineActiveStep.set(3);
      const blogRes = await fetch('/api/pipeline/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takeaways: this.pipelineTakeaways() })
      });
      const blogData = await blogRes.json();
      if (!blogRes.ok) throw new Error(blogData.error || 'Failed to write blog');
      this.pipelineBlog.set(blogData.text);

      // Step 4: Tweet
      this.pipelineActiveStep.set(4);
      const tweetRes = await fetch('/api/pipeline/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog: this.pipelineBlog() })
      });
      const tweetData = await tweetRes.json();
      if (!tweetRes.ok) throw new Error(tweetData.error || 'Failed to write tweets');
      this.pipelineTweets.set(tweetData.text);

      // Done
      this.pipelineActiveStep.set(0);

    } catch (err: unknown) {
      if (err instanceof Error) {
        this.pipelineError.set(err.message || "Pipeline failed");
      } else {
        this.pipelineError.set("Pipeline failed");
      }
      this.pipelineActiveStep.set(0);
    }
  }

  // Vision Data Extractor Live Demo State
  readonly visionImageBase64 = signal<string | null>(null);
  readonly visionMimeType = signal<string | null>(null);
  readonly visionLoading = signal(false);
  readonly visionData = signal<any>(null);
  readonly visionError = signal("");

  readonly visionCodeSnippet = `const responseSchema = {
  type: Type.OBJECT,
  properties: {
    merchant: { type: Type.STRING },
    date: { type: Type.STRING },
    totalAmount: { type: Type.NUMBER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, price: { type: Type.NUMBER }, quantity: { type: Type.NUMBER } },
        required: ['name', 'price']
      }
    }
  }, required: ['merchant', 'items', 'totalAmount']
};

const response = await gemini.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: [{
    role: 'user',
    parts: [
      { text: 'Analyze this receipt or invoice. Extract the merchant name, date, total amount, and line items.' },
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
    ]
  }],
  config: { responseMimeType: 'application/json', responseSchema }
});`;

  onVisionFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const [prefix, base64] = result.split(',');
      const mimeType = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';
      this.visionImageBase64.set(base64);
      this.visionMimeType.set(mimeType);
      this.visionData.set(null);
      this.visionError.set("");
    };
    reader.readAsDataURL(file);
  }

  async runVisionExtraction() {
    if (!this.visionImageBase64()) return;
    this.visionLoading.set(true);
    this.visionError.set("");
    this.visionData.set(null);

    try {
      const res = await fetch('/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: this.visionImageBase64(),
          mimeType: this.visionMimeType()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract data');
      this.visionData.set(data.result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.visionError.set(err.message || "Extraction failed");
      } else {
        this.visionError.set("Extraction failed");
      }
    } finally {
      this.visionLoading.set(false);
    }
  }
}
