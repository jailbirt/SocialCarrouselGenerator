import { GoogleGenAI, Type } from "@google/genai";
import { Slide } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for models
const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export const generateCarouselStructure = async (topic: string): Promise<Omit<Slide, 'id' | 'imageBase64' | 'isGeneratingImage'>[]> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `
    Actúa como un Diseñador Visual Senior especializado en presentaciones de tecnología (Estilo Stripe, Apple, Notion).
    INPUT USUARIO: "${topic}".

    ESTILO VISUAL Y DISEÑO (OBLIGATORIO):
    1.  **Layout:** Simétrico, Centrado, Limpio. Mucho espacio en blanco.
    2.  **Tipografía:** Gigante. Títulos masivos que ocupan el centro de atención.
    3.  **Ilustración:** Estilo "Corporate Memphis" o Vector Plano. Fondos blancos, colores vibrantes pero profesionales.
    
    REGLAS DE CONTENIDO:
    - Textos EXTREMADAMENTE CORTOS. No escribas párrafos. Máximo 2 líneas por bloque de texto.
    - El slide 1 (Gancho) debe tener un título de pocas palabras (3-6 palabras máximo) pero muy impactante.

    REGLAS DE FORMATO (CRÍTICO):
    - **Highlights**: Usa **doble asterisco** para resaltar la parte más importante del título. Se verá como un subrayado/marcador.
    - **Botones/Etiquetas**: Usa [[doble corchete]] para palabras de acción o etiquetas. Se verán como botones redondeados azules.
    - **Emojis**: Úsalos con moderación para dar color (ej: ⚡, ✨, 🚀).

    ESTRUCTURA DE RESPUESTA (JSON):
    Devuelve un ARRAY JSON.
    
    LAYOUTS PREFERIDOS:
    - **text-image-text**: Título Grande Arriba -> Ilustración Central -> Bajada Corta Abajo. (Uso común).
    - **image-top**: Ilustración Arriba -> Título Grande Centro -> Bajada Abajo.
    - **text-only**: Título GIGANTE centrado. Ideal para portadas.
    
    Para cada slide:
    - title: El titular (usa **..**, [[..]]).
    - content: El texto secundario (usa **..**, [[..]]).
    - imagePrompt: "Flat vector illustration, minimalist corporate memphis style, white background, [subject], vibrant tech colors".
    - layout: 'text-image-text' | 'image-top' | 'image-bottom' | 'text-only'.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            layout: { type: Type.STRING, enum: ['image-top', 'image-bottom', 'text-only', 'text-image-text'] }
          },
          required: ["title", "content", "imagePrompt", "layout"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return JSON.parse(text);
};

export const generateSlideImage = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [{ text: `High quality, flat vector illustration, minimalist corporate memphis style, white background, no text inside image, clean lines, vibrant blue and orange accents: ${prompt}` }]
    }
  });

  // Extract base64 image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("No image generated");
};

export const editSlideImage = async (currentImageBase64: string, instruction: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png', // Assuming PNG for simplicity
            data: currentImageBase64
          }
        },
        {
          text: `Maintain the flat vector corporate style. White background. ${instruction}`
        }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("No edited image generated");
};

export const determineEditIntent = async (userMessage: string): Promise<'CONTENT' | 'IMAGE'> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `Analyze this user request in the context of editing a presentation slide: "${userMessage}".
    Does the user want to change the text/content OR change the visual/image style?
    Return JSON with property "intent" being either "CONTENT" or "IMAGE".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING, enum: ["CONTENT", "IMAGE"] }
        }
      }
    }
  });
  
  const result = JSON.parse(response.text || '{"intent": "CONTENT"}');
  return result.intent;
};

// General update (legacy or fallback)
export const updateSlideContent = async (currentSlide: Slide, instruction: string): Promise<Partial<Slide>> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `
    Task: Update a presentation slide based on user instructions.
    
    Current Slide Data:
    - Title: "${currentSlide.title}"
    - Content: "${currentSlide.content}"
    
    User Instruction: "${instruction}"
    
    Strict Rules:
    1. If the user provides specific text, USE IT EXACTLY.
    2. Maintain formatting style:
       - **double asterisks** for Marker Highlight.
       - [[double brackets]] for Blue Pill Button.
    
    Return the updated JSON object with "title" and "content".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to update content");
  return JSON.parse(text);
};

// NEW: Targeted Field Update
export const updateSpecificSlideField = async (
  currentText: string, 
  fieldType: 'title' | 'content', 
  instruction: string
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `
    Task: Rewrite the ${fieldType} of a presentation slide based on the user's instruction.

    Current ${fieldType}: "${currentText}"
    Instruction: "${instruction}"

    FORMATTING RULES (CRITICAL):
    1. Use **double asterisks** (e.g., **word**) for marker highlight.
    2. Use [[double brackets]] (e.g., [[phrase]]) for blue pill buttons.
    3. Return ONLY the new text string. No JSON.
    `,
    config: {
      responseMimeType: "text/plain",
    }
  });

  return response.text || currentText;
};