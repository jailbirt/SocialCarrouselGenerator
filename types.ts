export interface Palette {
  background: string;
  title: string;
  body: string;
  accent: string;
}

export type SlideLayout = 'image-top' | 'image-bottom' | 'text-only' | 'text-image-text';

export type SlideElement = 'title' | 'content' | 'image' | null;

export interface Slide {
  id: string;
  title: string;
  content: string;
  imagePrompt: string;
  imageBase64: string | null; // Base64 string for the image
  isGeneratingImage: boolean;
  layout: SlideLayout;
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