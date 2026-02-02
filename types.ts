export interface Palette {
  background: string;
  text: string;
  accent: string;
}

export type SlideLayout = 'image-top' | 'image-bottom' | 'text-only' | 'text-image-text';

export type SlideElement = 'title' | 'content' | 'image' | null;

export interface Position {
  x: number;
  y: number;
}

export interface FontPair {
  name: string;
  title: string;
  body: string;
}

export type Language = 'es' | 'en' | 'pt';

export interface Slide {
  id: string;
  title: string;
  content: string;
  imagePrompt: string;
  imageBase64: string | null; // Base64 string for the image
  isGeneratingImage: boolean;
  error?: boolean; // New property to track generation errors
  layout: SlideLayout;
  imageScale?: number; // Manual resizing
  
  // New positioning properties
  titlePos: Position;
  contentPos: Position;
  
  // New Font Size Properties
  titleFontSize?: number;
  contentFontSize?: number;

  imagePos: Position;
  textAlign: 'left' | 'center' | 'right';
  
  // Typography
  fontPair: FontPair;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // Optional image attached to message
}

export enum GenerationType {
  STRUCTURE = 'STRUCTURE',
  IMAGE = 'IMAGE',
  IMAGE_EDIT = 'IMAGE_EDIT',
  TEXT_EDIT = 'TEXT_EDIT'
}