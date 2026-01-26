import { GoogleGenAI, Type } from "@google/genai";
import { Slide, Language } from "../types";

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

const getLanguageName = (lang: Language): string => {
  switch(lang) {
    case 'pt': return 'Português Brasileiro';
    case 'en': return 'English';
    default: return 'Español';
  }
};

export const generateCarouselStructure = async (
  topic: string, 
  style: string = 'Corporate Vector',
  mode: 'generate' | 'literal' = 'generate',
  language: Language = 'es'
): Promise<Omit<Slide, 'id' | 'imageBase64' | 'isGeneratingImage' | 'fontPair'>[]> => {
  
  const langName = getLanguageName(language);
  let systemInstruction = "";

  if (mode === 'literal') {
    // LITERAL MODE PROMPT
    systemInstruction = `
    Actúa como un Formateador de Estructura JSON estricto.
    INPUT USUARIO: "${topic}".
    ESTILO VISUAL: "${style}".

    OBJETIVO: Convertir el texto del usuario en un array JSON de slides, RESPETANDO EL TEXTO EXACTO.

    REGLAS CRÍTICAS (MODO LITERAL):
    1. **NO PARAFRASEAR**: Usa el texto del usuario *exactamente* como está escrito para 'title' y 'content'.
    2. **NO INVENTAR**: No agregues información que no esté en el input.
    3. **SEGMENTACIÓN**: Si el usuario escribe "Slide 1: ... Slide 2: ...", respeta esa división. Si es un bloque de texto, divídelo lógicamente pero sin cambiar las palabras.
    4. **FORMATO**: Si el usuario usa **negritas** o [[botones]], mantenlos.

    TU TRABAJO DE DISEÑO:
    - Aunque el texto sea literal, DEBES elegir el 'layout' más adecuado para la cantidad de texto de cada slide.
    - DEBES generar un 'imagePrompt' creativo basado en el texto del usuario y el estilo visual "${style}".
    
    ESTRUCTURA DE RESPUESTA (JSON Array):
    Items: title, content, imagePrompt, layout.
    `;
  } else {
    // GENERATE (CREATIVE) MODE PROMPT
    systemInstruction = `
    Actúa como un Diseñador Visual Senior especializado en presentaciones de LinkedIn y Estrategia SEO.
    INPUT USUARIO: "${topic}".
    ESTILO VISUAL SOLICITADO: "${style}".
    IDIOMA DE SALIDA OBLIGATORIO: ${langName}.

    ESTILO VISUAL Y DISEÑO (OBLIGATORIO):
    1.  **Layout Dinámico:** Es CRÍTICO que mezcles diferentes layouts en el carrusel. NO uses el mismo layout consecutivamente.
    2.  **Jerarquía:** El TEXTO es lo más importante. La imagen es un complemento visual pequeño.
    3.  **Ilustración:** Las descripciones de imagen (imagePrompt) deben ser simples y limpias.
    
    REGLAS DE CONTENIDO Y SEO:
    - Genera todo el contenido en **${langName}**.
    - **SEO**: Utiliza palabras clave relevantes para el tema en ${langName} dentro de los títulos y el contenido.
    - Textos claros, profesionales y potentes.
    - El slide 1 (Gancho) debe tener un título muy impactante para detener el scroll.

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
    - title: El titular en ${langName}.
    - content: El texto secundario en ${langName}.
    - imagePrompt: "Simple description of subject. Style: ${style}". (Keep prompt in English for better image generation, or simple Spanish).
    - layout: Selecciona uno variado ('text-image-text' | 'image-top' | 'image-bottom' | 'text-only').
    `;
  }

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: systemInstruction,
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
export const updateSlideContent = async (currentSlide: Slide, instruction: string, language: Language = 'es'): Promise<Partial<Slide>> => {
  const langName = getLanguageName(language);
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `
    Task: Update a presentation slide based on user instructions.
    OUTPUT LANGUAGE: ${langName}.
    
    Current Slide Data:
    - Title: "${currentSlide.title}"
    - Content: "${currentSlide.content}"
    
    User Instruction: "${instruction}"
    
    Strict Rules:
    1. If the user provides specific text, USE IT EXACTLY.
    2. If the user asks to rewrite, rewrite in ${langName} optimizing for SEO.
    3. Maintain formatting style:
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
  instruction: string,
  language: Language = 'es'
): Promise<string> => {
  const langName = getLanguageName(language);
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `
    Task: Rewrite the ${fieldType} of a presentation slide based on the user's instruction.
    OUTPUT LANGUAGE: ${langName}.

    Current ${fieldType}: "${currentText}"
    Instruction: "${instruction}"

    FORMATTING RULES (CRITICAL):
    1. Use **double asterisks** (e.g., **word**) for marker highlight.
    2. Use [[double brackets]] (e.g., [[phrase]]) for blue pill buttons.
    3. Return ONLY the new text string in ${langName}. No JSON.
    `,
    config: {
      responseMimeType: "text/plain",
    }
  });

  return response.text || currentText;
};

// NEW: Paraphrase function
export const paraphraseText = async (textToRewrite: string, language: Language = 'es'): Promise<string> => {
  const langName = getLanguageName(language);
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `
    Task: Paraphrase and improve the following text for a LinkedIn slide. 
    Make it more engaging, professional, and concise.
    OUTPUT LANGUAGE: ${langName}.
    SEO Focus: Use relevant business/professional keywords in ${langName}.

    Input Text: "${textToRewrite}"

    Rules:
    1. Ensure the output is in ${langName}.
    2. Keep any markdown like **bold** or [[brackets]].
    3. Return ONLY the rewritten text.
    `,
    config: {
      responseMimeType: "text/plain",
    }
  });
  return response.text || textToRewrite;
};