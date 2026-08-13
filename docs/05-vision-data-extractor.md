# Pattern 05: Vision Data Extractor (Multimodal)

## The Problem
Build an app where a user uploads an image of a receipt. Use a Vision-capable LLM to analyze the image and output a digital table of items and prices.

## The Mindset Shift
When blending modalities (Vision + Text), hallucination risks change. Vision models might 'invent' a price if it's blurry. The product design must include a 'Human-in-the-Loop' (HITL) step. Never auto-charge a credit card based on Vision AI; always show it to the user for confirmation first.

## Architecture Flow
1. **Image Processing:** Receive image, resize/compress to fit token limits, and convert to Base64 format.
2. **Multimodal Payload:** Send a payload containing both the Base64 image and text instructions.
3. **Vision LLM Analysis:** The model 'reads' the pixels and correlates them to text tokens.
4. **Data Normalization:** Parse the output. Ensure prices are formatted as numbers.
5. **Frontend Table:** Render the extracted data in an editable data grid so the user can verify.

## Implementation (Live Demo Details)

To guarantee the Vision model outputs a deterministic format suitable for an editable table, we combine multimodal parts (`inlineData` for the image) with `responseSchema` for JSON enforcement.

```typescript
// 1. Define the rigorous API contract for a receipt
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

// 2. Pass the Base64 image and enforce the schema
const response = await gemini.models.generateContent({
  model: 'gemini-3.6-flash', // Multimodal capable
  contents: [
    {
      role: 'user',
      parts: [
        { text: 'Analyze this receipt or invoice. Extract the merchant name, date, total amount, and line items.' },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
      ]
    }
  ],
  config: {
    responseMimeType: 'application/json',
    responseSchema: responseSchema
  }
});

// 3. The output is guaranteed to be a structured object, ready for UI rendering
const receiptData = JSON.parse(response.text);
```

## System Design Delta
**Keep:** Image hosting, CDNs, Upload progress indicators.
**Add:** Base64 encoding limits, Visual hallucination, Resolution downsampling logic.

## Failure Lab
*   **Blurry Text Misread:** A blurry '8' is interpreted as a '3', drastically changing a receipt total.
*   **Imagined Details:** The model 'sees' a brand name or item that isn't actually present in the photo.
*   **Layout Confusion:** Multi-column tables are read strictly left-to-right, scrambling row data.

## Evaluation
*   **OCR Accuracy Equivalence:** How well the model extracts exact text compared to a deterministic OCR tool.
*   **Field Extraction Precision:** The accuracy of pulling specific target fields (e.g., Total Amount) from complex layouts.
