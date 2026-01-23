import { GoogleGenAI, Type } from "@google/genai";
import { Slide } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for models
const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// --- Rate Limiting Helpers ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const runWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 4000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Check for rate limit error codes (429) or Resource Exhausted status
    if (retries > 0 && (
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.status === 'RESOURCE_EXHAUSTED'
    )) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await wait(delay);
      return runWithRetry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};

export const generateCarouselStructure = async (topic: string, style: string = 'Corporate Vector'): Promise<Omit<Slide, 'id' | 'imageBase64' | 'isGeneratingImage'>[]> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `
    Actúa como un Diseñador Visual Senior especializado en presentaciones de LinkedIn.
    INPUT USUARIO: "${topic}".
    ESTILO VISUAL SOLICITADO: "${style}".

    ESTILO VISUAL Y DISEÑO (OBLIGATORIO):
    1.  **Layout Dinámico:** Es CRÍTICO que mezcles diferentes layouts en el carrusel. NO uses el mismo layout consecutivamente.
    2.  **Jerarquía:** El TEXTO es lo más importante. La imagen es un complemento visual pequeño.
    3.  **Ilustración:** Las descripciones de imagen (imagePrompt) deben ser simples y limpias.
    
    REGLAS DE CONTENIDO:
    - Textos claros y potentes.
    - El slide 1 (Gancho) debe tener un título muy impactante.

    REGLAS DE FORMATO (CRÍTICO):
    - **Highlights**: Usa **doble asterisco** para resaltar palabras clave.
    - **Botones/Etiquetas**: Usa [[doble corchete]] para llamadas a la acción o etiquetas.

    ESTRUCTURA DE RESPUESTA (JSON):
    Devuelve un ARRAY JSON.
    
    LAYOUTS DISPONIBLES (USAR VARIADOS):
    - **text-image-text**: Título Arriba -> Imagen pequeña en medio -> Texto abajo.
    - **image-top**: Imagen en tercio superior -> Texto dominando el resto.
    - **image-bottom**: Texto dominando arriba -> Imagen en tercio inferior.
    - **text-only**: Título GIGANTE centrado. Úsalo para slides de énfasis.
    
    Para cada slide:
    - title: El titular.
    - content: El texto secundario.
    - imagePrompt: "Simple description of subject. Style: ${style}".
    - layout: Selecciona uno variado ('text-image-text' | 'image-top' | 'image-bottom' | 'text-only').
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

export const generateSlideImage = async (prompt: string, style: string = 'Corporate Vector'): Promise<string> => {
  return runWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: `High quality image. Style: ${style}. Context: ${prompt}. Ensure high resolution and correct proportions for the subject. If style involves people or logos, attempt realistic rendering.` }]
      }
    });

    // Extract base64 image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image generated");
  });
};

export const editSlideImage = async (currentImageBase64: string, instruction: string, style: string = 'Corporate Vector'): Promise<string> => {
  return runWithRetry(async () => {
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
            text: `Edit this image based on the following instruction: "${instruction}". Maintain the requested visual style: ${style}. Ensure high quality.`
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
  });
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