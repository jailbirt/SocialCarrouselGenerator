import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Slide, Palette, ChatMessage, SlideElement, Position, FontPair, Language } from './types';
import { generateCarouselStructure, generateSlideImage, editSlideImage, determineEditIntent, updateSlideContent, updateSpecificSlideField, paraphraseText } from './services/geminiService';
import { SlideView } from './components/SlideView';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { 
  Send, 
  Download, 
  Loader2, 
  Palette as PaletteIcon, 
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Paperclip,
  X,
  MousePointer2,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Trash2,
  Info,
  AlertCircle,
  Paintbrush,
  Images,
  FileDown,
  Maximize,
  Smile,
  PenTool,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  Type as TypeIcon,
  Wand2,
  Brain,
  FileText,
  HelpCircle,
  Check,
  Save,
  CircleHelp,
  History,
  Globe,
  Heart,
  UserPlus,
  ExternalLink
} from 'lucide-react';

// --- OFFICIAL BRAND ICONS ---
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 72 72" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fillRule="evenodd">
      <rect className="fill-[#0077B5]" fill="#0077B5" x="0" y="0" width="72" height="72" rx="8"/>
      <path className="fill-[#FFF]" fill="#FFF" d="M13.139 27.848h9.623V58.81h-9.623V27.848zm4.813-15.391c3.076 0 5.586 2.508 5.586 5.583 0 3.078-2.51 5.585-5.586 5.585-3.078 0-5.585-2.507-5.585-5.585 0-3.075 2.507-5.583 5.585-5.583zM28.983 27.848h9.223v4.228h.133c1.284-2.433 4.418-4.996 9.106-4.996 9.734 0 11.534 6.406 11.534 14.735v16.995h-9.605V43.766c0-3.587-.065-8.203-4.998-8.203-5.003 0-5.77 3.908-5.77 7.943v15.304h-9.617V27.848z"/>
    </g>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="insta_gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <path fill="url(#insta_gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const STORAGE_KEY = 'carrousel_generator_state_v1';

// --- CONFIGURATION FOR SOCIAL GROWTH ---
// REPLACE THESE URLs WITH YOUR OWN PROFILES AND PINNED POSTS
const SOCIAL_CONFIG = {
  linkedinProfile: "https://www.linkedin.com/in/javierailbirt/", 
  instagramProfile: "https://www.instagram.com/javier_ailbirt/",
  // Post where you want them to comment (e.g. pinned post) - Using profile as placeholder for now
  linkedinPost: "https://www.linkedin.com/in/javierailbirt/", 
  // Leave empty to hide the Instagram Comment button until you have a specific post
  instagramPost: "" 
};

// --- TRANSLATIONS CONFIGURATION (SEO OPTIMIZED) ---
const UI_TEXT = {
  es: {
    appTitle: "Generador de Carruseles IA",
    aiMode: "Generación IA",
    literalMode: "Entrada Literal",
    topicLabel: "Tema o Descripción",
    topicPlaceholder: "Ej: Estrategia de Marketing (Convertir texto a carrusel)...",
    literalLabel: "Contenido Literal",
    literalPlaceholder: "Diapositiva 1: [Título] - [Contenido]\nDiapositiva 2: ...",
    literalHint: "La IA usará tu texto exactamente como lo escribas.",
    visualStyle: "Estilo Visual",
    customStyleLabel: "Prompt de Estilo Personalizado",
    customStylePlaceholder: "Ej: Arte pixel en ciudad neón...",
    typography: "Tipografía",
    palette: "Paleta de Colores",
    generateBtn: "Generar Carrusel con IA",
    formatBtn: "Formatear Diapositivas",
    exportTitle: "EXPORTAR",
    linkedinBtn: "LinkedIn (PDF)",
    instagramBtn: "Instagram (IMG)",
    createNew: "Crear Nuevo",
    startCreating: "Generador de Carruseles con IA",
    startCreatingSub: "Crea carruseles online para LinkedIn e Instagram en segundos.",
    tuningTitle: "Ajustes",
    resetPos: "Restablecer",
    fontPairing: "Fuente",
    fontSize: "Tamaño de Texto",
    aiRewrite: "Reescribir IA",
    insertEmoji: "Insertar Emoji",
    chatPlaceholder: "Escribe instrucciones...",
    activityLog: "Historial",
    tourStep1Title: "Paso 1: Define el Tema",
    tourStep1Content: "¡Empieza aquí! Describe el tema para crear carruseles online automáticamente.",
    tourStep2Title: "Paso 2: Estilo Visual",
    tourStep2Content: "Elige la vibra artística para tu generador de carruseles.",
    tourStep3Title: "Paso 3: Tipografía",
    tourStep3Content: "Selecciona pares de fuentes profesionales.",
    tourStep4Title: "Paso 4: Paleta de Colores",
    tourStep4Content: "Elige los colores de tu marca.",
    tourStep5Title: "Paso 5: Generar",
    tourStep5Content: "¡Haz clic para usar la inteligencia artificial!",
    tourStep6Title: "Vista Previa Interactiva",
    tourStep6Content: "Haz clic en cualquier texto o imagen para seleccionarlo.",
    tourStep7Title: "Ajuste Fino",
    tourStep7Content: "Edita textos e imágenes del carrusel fácilmente.",
    tourStep8Title: "Asistente IA",
    tourStep8Content: "Usa el asistente para mejorar tu carrusel para LinkedIn.",
    tourStep9Title: "Exportar",
    tourStep9Content: "¿Listo? Exporta como PDF (LinkedIn) o ZIP (Instagram).",
    loadingStructure: "Diseñando estructura del carrusel con IA...",
    loadingImages: "Renderizando imágenes con inteligencia artificial...",
    loadingRewrite: "Optimizando texto...",
    loadingExportPDF: "Generando carrusel PDF...",
    loadingExportZIP: "Generando imágenes para Instagram...",
    errorTitle: "Error",
    resetConfirmTitle: "¿Crear nuevo carrusel?",
    resetConfirmText: "Esta acción borrará tu trabajo actual.",
    cancel: "Cancelar",
    confirm: "Sí, Crear Nuevo",
    // Social Modal
    growthTitle: "¡Tu Carrusel se está creando!",
    growthSubtitle: "Mientras la IA trabaja, ¿me apoyas con un clic?",
    actionFollow: "Sígueme para más",
    actionComment: "Dejar un comentario",
    actionSkip: "Volver a mi carrusel",
    commentHint: "Se abrirá mi post destacado. ¡Dime qué opinas!"
  },
  en: {
    appTitle: "AI Carousel Generator",
    aiMode: "AI Generation",
    literalMode: "Literal Input",
    topicLabel: "Topic or Description",
    topicPlaceholder: "e.g. Marketing Strategy (Convert text to carousel)...",
    literalLabel: "Literal Content",
    literalPlaceholder: "Slide 1: [Title] - [Content]\nSlide 2: ...",
    literalHint: "AI will use your text exactly as typed.",
    visualStyle: "Visual Style",
    customStyleLabel: "Custom Style Prompt",
    customStylePlaceholder: "e.g. Pixel art characters in a neon city...",
    typography: "Typography Style",
    palette: "Color Palette",
    generateBtn: "Generate AI Carousel",
    formatBtn: "Format Slides",
    exportTitle: "EXPORT",
    linkedinBtn: "LinkedIn (PDF)",
    instagramBtn: "Instagram (IMG)",
    createNew: "Create New",
    startCreating: "AI Carousel Generator",
    startCreatingSub: "Create carousels online for LinkedIn & Instagram instantly.",
    tuningTitle: "Tuning",
    resetPos: "Reset Pos",
    fontPairing: "Font Pairing",
    fontSize: "Text Size",
    aiRewrite: "AI Rewrite",
    insertEmoji: "Insert Emoji",
    chatPlaceholder: "Type instructions...",
    activityLog: "Activity Log",
    tourStep1Title: "Step 1: Define Topic",
    tourStep1Content: "Start here! Describe your topic to create carousels online.",
    tourStep2Title: "Step 2: Visual Style",
    tourStep2Content: "Choose the artistic vibe for your carousel generator.",
    tourStep3Title: "Step 3: Typography",
    tourStep3Content: "Select font pairings that match your brand.",
    tourStep4Title: "Step 4: Color Palette",
    tourStep4Content: "Pick brand colors.",
    tourStep5Title: "Step 5: Generate",
    tourStep5Content: "Click to generate carousel with AI!",
    tourStep6Title: "Interactive Preview",
    tourStep6Content: "Click elements to edit your carousel.",
    tourStep7Title: "Fine Tuning",
    tourStep7Content: "Customize fonts and positioning.",
    tourStep8Title: "AI Assistant",
    tourStep8Content: "Use AI to refine your LinkedIn carousel.",
    tourStep9Title: "Export",
    tourStep9Content: "Ready? Export PDF (LinkedIn) or Images (Instagram).",
    loadingStructure: "Designing carousel structure...",
    loadingImages: "Rendering AI images...",
    loadingRewrite: "Rewriting text...",
    loadingExportPDF: "Generating carousel PDF...",
    loadingExportZIP: "Generating Instagram images...",
    errorTitle: "Error",
    resetConfirmTitle: "Create new carousel?",
    resetConfirmText: "This will delete current work.",
    cancel: "Cancel",
    confirm: "Yes, Create New",
    growthTitle: "Your Carousel is Cooking!",
    growthSubtitle: "While AI works, support the creator?",
    actionFollow: "Follow for updates",
    actionComment: "Leave a comment",
    actionSkip: "Back to my carousel",
    commentHint: "This opens my pinned post. Let me know your thoughts!"
  },
  pt: {
    appTitle: "Gerador de Carrosséis IA",
    aiMode: "Geração IA",
    literalMode: "Entrada Literal",
    topicLabel: "Tópico ou Descrição",
    topicPlaceholder: "Ex: Estratégia de Marketing (Converter texto em carrossel)...",
    literalLabel: "Conteúdo Literal",
    literalPlaceholder: "Slide 1: [Título] - [Conteúdo]\nSlide 2: ...",
    literalHint: "A IA usará seu texto exatamente como digitado.",
    visualStyle: "Estilo Visual",
    customStyleLabel: "Prompt de Estilo Personalizado",
    customStylePlaceholder: "Ex: Pixel art em cidade neon...",
    typography: "Tipografia",
    palette: "Paleta de Cores",
    generateBtn: "Gerar Carrossel com IA",
    formatBtn: "Formatar Slides",
    exportTitle: "EXPORTAR",
    linkedinBtn: "LinkedIn (PDF)",
    instagramBtn: "Instagram (IMG)",
    createNew: "Criar Novo",
    startCreating: "Gerador de Carrosséis com IA",
    startCreatingSub: "Crie carrosséis online para LinkedIn e Instagram em segundos.",
    tuningTitle: "Ajustes",
    resetPos: "Redefinir",
    fontPairing: "Fonte",
    fontSize: "Tamanho do Texto",
    aiRewrite: "Reescrever IA",
    insertEmoji: "Inserir Emoji",
    chatPlaceholder: "Digite instruções...",
    activityLog: "Histórico",
    tourStep1Title: "Passo 1: Definir Tópico",
    tourStep1Content: "Comece aqui! Descreva o tópico para criar carrosséis online.",
    tourStep2Title: "Passo 2: Estilo Visual",
    tourStep2Content: "Escolha o estilo do seu gerador de carrosséis.",
    tourStep3Title: "Passo 3: Tipografia",
    tourStep3Content: "Selecione fontes profissionais.",
    tourStep4Title: "Passo 4: Paleta de Cores",
    tourStep4Content: "Escolha as cores da marca.",
    tourStep5Title: "Passo 5: Gerar",
    tourStep5Content: "Clique para gerar carrossel com inteligência artificial!",
    tourStep6Title: "Visualização Interativa",
    tourStep6Content: "Clique nos elementos para editar.",
    tourStep7Title: "Ajuste Fino",
    tourStep7Content: "Personalize fontes e posições.",
    tourStep8Title: "Assistente IA",
    tourStep8Content: "Use a IA para melhorar seu carrossel para LinkedIn.",
    tourStep9Title: "Exportar",
    tourStep9Content: "Pronto? Exporte PDF (LinkedIn) ou Imagens (Instagram).",
    loadingStructure: "Projetando estrutura do carrossel...",
    loadingImages: "Renderizando imagens com IA...",
    loadingRewrite: "Otimizando texto...",
    loadingExportPDF: "Gerando carrossel PDF...",
    loadingExportZIP: "Gerando imagens para Instagram...",
    errorTitle: "Erro",
    resetConfirmTitle: "Novo Carrossel?",
    resetConfirmText: "Isso excluirá seu trabalho atual.",
    cancel: "Cancelar",
    confirm: "Sim, Criar Novo",
    growthTitle: "Seu Carrossel está Chegando!",
    growthSubtitle: "Enquanto a IA trabalha, pode me apoiar?",
    actionFollow: "Seguir para mais",
    actionComment: "Deixar um comentário",
    actionSkip: "Voltar ao carrossel",
    commentHint: "Isso abre meu post fixado. Diz o que achou!"
  }
};

const INITIAL_PALETTE: Palette = {
  background: '#1a1a1a', // Dark background by default to show off the feature
  text: '#ffffff',       // White text
  accent: '#3b82f6'      // Blue accent
};

const STYLE_PRESETS = [
  "Corporate Vector (Default)",
  "Modern Flat Vector", 
  "Hyper-realistic Photo",
  "3D Render (Pixar Style)",
  "Minimalist Line Art",
  "Cyberpunk Neon",
  "Hand Drawn Sketch",
  "Custom Style"
];

const AVAILABLE_FONTS = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'Merriweather', value: "'Merriweather', serif" },
  { name: 'Oswald', value: "'Oswald', sans-serif" },
  { name: 'Playfair Display', value: "'Playfair Display', serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Source Sans 3', value: "'Source Sans 3', sans-serif" },
  { name: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" }
];

const FONT_PAIRS: FontPair[] = [
  { name: 'Modern', title: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" },
  { name: 'Clean', title: "'Inter', sans-serif", body: "'Inter', sans-serif" },
  { name: 'Elegant', title: "'Playfair Display', serif", body: "'Lato', sans-serif" },
  { name: 'Bold', title: "'Oswald', sans-serif", body: "'Roboto', sans-serif" },
  { name: 'Classic', title: "'Merriweather', serif", body: "'Source Sans 3', sans-serif" },
  { name: 'Modern Clean', title: "'Montserrat', sans-serif", body: "'Open Sans', sans-serif" },
];

const PALETTE_PRESETS = [
  { name: 'Dark Modern (Default)', palette: { background: '#1a1a1a', text: '#ffffff', accent: '#3b82f6' } },
  { name: 'Clean Light', palette: { background: '#ffffff', text: '#1a1a1a', accent: '#2563eb' } },
  { name: 'LinkedIn Blue & Orange', palette: { background: '#004182', text: '#ffffff', accent: '#ea580c' } },
  { name: 'Tech Royal & Amber', palette: { background: '#1e40af', text: '#f8fafc', accent: '#fbbf24' } },
  { name: 'Deep Navy & Coral', palette: { background: '#0f172a', text: '#ffffff', accent: '#f87171' } },
  { name: 'Swiss Red & Black', palette: { background: '#dc2626', text: '#ffffff', accent: '#000000' } },
  { name: 'Cyber Black & Neon', palette: { background: '#09090b', text: '#e4e4e7', accent: '#22c55e' } },
  { name: 'Electric Purple', palette: { background: '#581c87', text: '#faf5ff', accent: '#22d3ee' } },
  { name: 'Midnight & Magenta', palette: { background: '#020617', text: '#ffffff', accent: '#d946ef' } },
  { name: 'Slate & Gold', palette: { background: '#334155', text: '#f8fafc', accent: '#fcd34d' } },
  { name: 'Corporate Grey', palette: { background: '#f3f4f6', text: '#111827', accent: '#059669' } },
  { name: 'Luxury Black', palette: { background: '#000000', text: '#e2e8f0', accent: '#fbbf24' } },
  { name: 'Deep Forest', palette: { background: '#022c22', text: '#ecfccb', accent: '#84cc16' } },
  { name: 'Warm Sand', palette: { background: '#fff7ed', text: '#451a03', accent: '#d97706' } },
  { name: 'Sage & Charcoal', palette: { background: '#e2e8f0', text: '#0f172a', accent: '#4d7c0f' } },
  { name: 'Vaporwave Pink', palette: { background: '#fce7f3', text: '#831843', accent: '#db2777' } },
  { name: 'Soft Pastel', palette: { background: '#fdf4ff', text: '#4a044e', accent: '#c026d3' } },
  { name: 'Custom Palette', palette: null }
];

// --- Local Storage Helper ---
const getSavedState = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultValue;
    const parsed = JSON.parse(saved);
    return parsed[key] !== undefined ? parsed[key] : defaultValue;
  } catch (e) {
    console.warn("Failed to load state", e);
    return defaultValue;
  }
};

const PortalTooltip: React.FC<{
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  offset?: number;
  className?: string;
}> = ({ anchorRef, children, position = 'top', offset = 8, className = '' }) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - offset;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + offset;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - offset;
        break;
    }
    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    const rAF = requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(rAF);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef, position, offset]);

  if (!coords) return null;

  return createPortal(
    <div
      className={`fixed z-[99999] ${className}`}
      style={{
        top: coords.top,
        left: coords.left,
        transform: 
          position === 'top' ? 'translate(-50%, -100%)' :
          position === 'bottom' ? 'translate(-50%, 0)' :
          position === 'right' ? 'translate(0, -50%)' :
          'translate(-100%, -50%)'
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// ... (TourPopover and HelpTooltip components remain same)
interface TourPopoverProps {
  step: number;
  totalSteps: number;
  title: string;
  content: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  position?: 'right' | 'bottom' | 'top' | 'left';
  anchorRef: React.RefObject<HTMLElement | null>;
}

const TourPopover: React.FC<TourPopoverProps> = ({ step, totalSteps, title, content, onNext, onPrev, onSkip, position = 'right', anchorRef }) => {
  return (
    <PortalTooltip anchorRef={anchorRef} position={position} offset={15} className="pointer-events-auto filter drop-shadow-2xl">
       <div className="w-72 bg-white rounded-xl border border-blue-200 p-5 animate-in zoom-in-95 duration-200 relative shadow-2xl">
          <div className={`absolute w-4 h-4 bg-white border-l border-b border-blue-200 transform rotate-45 
            ${position === 'right' ? '-left-2 top-1/2 -translate-y-1/2' : 
              position === 'left' ? '-right-2 top-1/2 -translate-y-1/2 rotate-[225deg]' :
              position === 'bottom' ? '-top-2 left-1/2 -translate-x-1/2 rotate-[135deg]' :
              '-bottom-2 left-1/2 -translate-x-1/2 rotate-[-45deg]'
            }`} 
          />
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              Step {step + 1}/{totalSteps}
            </span>
            <button onClick={onSkip} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1 rounded-full transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="font-bold text-gray-900 text-sm mb-2">{title}</h4>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">{content}</p>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <button 
              onClick={onPrev} 
              disabled={step === 0}
              className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 font-medium px-3 py-1.5"
            >
              Back
            </button>
            <button 
              onClick={onNext} 
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all hover:scale-105"
            >
              {step === totalSteps - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
       </div>
    </PortalTooltip>
  );
};

const HelpTooltip: React.FC<{ index: number; title?: string; content?: string }> = ({ index, title, content }) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const displayTitle = title;
  const displayContent = content;

  if (!displayTitle && !displayContent) return null;

  return (
    <>
      <div 
        ref={triggerRef}
        className="group relative inline-block ml-1.5 align-middle"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <CircleHelp className="w-3.5 h-3.5 text-blue-300 hover:text-blue-500 cursor-help transition-colors" />
      </div>
      {isVisible && (
        <PortalTooltip anchorRef={triggerRef} position="top" offset={8} className="pointer-events-none">
          <div className="w-56 p-3 bg-white border border-blue-100 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
             <h4 className="font-bold text-gray-800 text-xs mb-1">{displayTitle}</h4>
             <p className="text-[10px] text-gray-500 leading-relaxed">{displayContent}</p>
          </div>
        </PortalTooltip>
      )}
    </>
  );
};

const App: React.FC = () => {
  // --- State (Initialized with LocalStorage) ---
  const [language, setLanguage] = useState<Language>(() => getSavedState<Language>('language', 'es'));
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false); 

  const [topic, setTopic] = useState(() => getSavedState<string>('topic', ''));
  const [contentMode, setContentMode] = useState<'generate' | 'literal'>(() => getSavedState<'generate' | 'literal'>('contentMode', 'generate'));
  const [imageStyle, setImageStyle] = useState(() => getSavedState<string>('imageStyle', 'Corporate Vector (Default)')); 
  
  const [selectedFontPairName, setSelectedFontPairName] = useState(() => getSavedState<string>('selectedFontPairName', FONT_PAIRS[0].name)); 
  const [customTitleFont, setCustomTitleFont] = useState(() => getSavedState<string>('customTitleFont', AVAILABLE_FONTS[7].value));
  const [customBodyFont, setCustomBodyFont] = useState(() => getSavedState<string>('customBodyFont', AVAILABLE_FONTS[0].value));
  
  const [palettePresetName, setPalettePresetName] = useState(() => getSavedState<string>('palettePresetName', PALETTE_PRESETS[0].name));
  const [palette, setPalette] = useState<Palette>(() => getSavedState<Palette>('palette', INITIAL_PALETTE));
  
  const [customStylePrompt, setCustomStylePrompt] = useState(() => getSavedState<string>('customStylePrompt', '')); 
  const [slides, setSlides] = useState<Slide[]>(() => getSavedState<Slide[]>('slides', []));
  
  // TOUR STATE
  const [showTour, setShowTour] = useState(() => getSavedState<boolean>('showTour', true));
  const [currentTourStep, setCurrentTourStep] = useState(() => getSavedState<number>('currentTourStep', 0));
  
  const [isPaletteDropdownOpen, setIsPaletteDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<SlideElement>(null);
  const [lastFocusedCursorIndex, setLastFocusedCursorIndex] = useState<number>(0);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number | null>(null); 
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  
  const [showChatEmojiPicker, setShowChatEmojiPicker] = useState(false); 
  const [showInlineEmojiPicker, setShowInlineEmojiPicker] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false); // New Growth Modal State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const step0Ref = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const step5Ref = useRef<HTMLDivElement>(null); 
  const step6Ref = useRef<HTMLDivElement>(null); 
  const step7Ref = useRef<HTMLDivElement>(null); 
  const step8Ref = useRef<HTMLDivElement>(null); 

  const slidesContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  // NEW: Ref for inline emoji button
  const inlineEmojiBtnRef = useRef<HTMLButtonElement>(null);
  const chatEmojiBtnRef = useRef<HTMLButtonElement>(null);

  // Helper for translation
  const t = (key: keyof typeof UI_TEXT['es']) => {
    return UI_TEXT[language][key] || UI_TEXT['es'][key];
  };

  // SEO: Dynamic Document Title
  useEffect(() => {
    const titles = {
      es: "Generador de Carruseles IA para LinkedIn e Instagram | Crear Online",
      en: "AI Carousel Generator for LinkedIn & Instagram | Create Online",
      pt: "Gerador de Carrosséis com IA para LinkedIn e Instagram | Online"
    };
    document.title = titles[language] || titles['es'];
  }, [language]);

  useEffect(() => {
    const saveState = () => {
      setSaveStatus('saving');
      try {
        const sanitizedSlides = slides.map(s => ({
            ...s,
            imageBase64: null 
        }));

        const stateToSave = {
          language,
          topic,
          contentMode,
          imageStyle,
          selectedFontPairName,
          customTitleFont,
          customBodyFont,
          palettePresetName,
          palette,
          customStylePrompt,
          slides: sanitizedSlides, 
          showTour,
          currentTourStep
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        setSaveStatus('saved');
      } catch (e: any) {
        console.error("Storage error", e);
        if (e.name === 'QuotaExceededError') {
           setErrorMessage("Local storage quota exceeded. Settings saved, but large data might be lost.");
        }
        setSaveStatus('error');
      }
    };

    const timeoutId = setTimeout(saveState, 1500); 
    return () => clearTimeout(timeoutId);

  }, [language, topic, contentMode, imageStyle, selectedFontPairName, customTitleFont, customBodyFont, palettePresetName, palette, customStylePrompt, slides, showTour, currentTourStep]);

  const handleNextStep = () => setCurrentTourStep(prev => prev + 1);
  const handlePrevStep = () => setCurrentTourStep(prev => Math.max(0, prev - 1));
  const handleSkipTour = () => setShowTour(false);

  const handleToggleTour = () => {
    if (showTour) {
      setShowTour(false);
    } else {
      const startStep = slides.length > 0 ? 5 : 0;
      setCurrentTourStep(startStep);
      setShowTour(true);
      setIsSidebarOpen(true);
    }
  };

  useEffect(() => {
    if (showTour && currentTourStep < 5 && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  }, [showTour, currentTourStep]);

  const getEffectiveStyle = () => imageStyle === 'Custom Style' ? customStylePrompt : imageStyle;

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [chatHistory]);

  const scrollToSlide = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };
  useEffect(() => { if (selectedSlideId) scrollToSlide(selectedSlideId); }, [selectedSlideId]);

  const handlePrevSlide = () => {
    if (!selectedSlideId || slides.length === 0) return;
    const currentIndex = slides.findIndex(s => s.id === selectedSlideId);
    if (currentIndex > 0) {
      const prevId = slides[currentIndex - 1].id;
      setSelectedSlideId(prevId);
      setSelectedElement(null); 
    }
  };

  const handleNextSlide = () => {
    if (!selectedSlideId || slides.length === 0) return;
    const currentIndex = slides.findIndex(s => s.id === selectedSlideId);
    if (currentIndex < slides.length - 1) {
      const nextId = slides[currentIndex + 1].id;
      setSelectedSlideId(nextId);
      setSelectedElement(null); 
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement || (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable)) return;
      if (e.key === 'ArrowLeft') handlePrevSlide();
      if (e.key === 'ArrowRight') handleNextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlideId, slides]);

  const handleCreateNew = () => setShowResetConfirm(true);

  const performReset = () => {
    setSlides([]);
    setTopic('');
    setContentMode('generate');
    setImageStyle('Corporate Vector (Default)'); 
    setSelectedFontPairName(FONT_PAIRS[0].name);
    setPalettePresetName(PALETTE_PRESETS[0].name);
    setIsPaletteDropdownOpen(false);
    setCustomStylePrompt('');
    setChatHistory([]);
    setSelectedSlideId(null);
    setSelectedElement(null);
    setPalette(INITIAL_PALETTE);
    setChatInput('');
    setCursorPosition(null);
    setPendingImage(null);
    setIsGenerating(false);
    setIsSidebarOpen(true);
    setShowResetConfirm(false);
    setLastFocusedCursorIndex(0);
    setShowGrowthModal(false);
    
    const tempShowTour = showTour;
    const tempLanguage = language;
    localStorage.removeItem(STORAGE_KEY);
    setCurrentTourStep(0); 
    if (tempShowTour) setShowTour(true); 
    setLanguage(tempLanguage); // Preserve language preference on reset
  };

  const handlePalettePresetChange = (presetName: string) => {
    setPalettePresetName(presetName);
    const preset = PALETTE_PRESETS.find(p => p.name === presetName);
    if (preset && preset.palette) setPalette(preset.palette);
    setIsPaletteDropdownOpen(false);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (imageStyle === 'Custom Style' && !customStylePrompt.trim()) {
      setErrorMessage(t('customStylePlaceholder'));
      return;
    }
    if (showTour && currentTourStep === 4) handleNextStep();

    setIsGenerating(true);
    setLoadingMessage(t('loadingStructure'));
    setSlides([]);
    setSelectedSlideId(null);
    setSelectedElement(null);
    setChatHistory([]);
    setShowGrowthModal(false);

    const effectiveStyle = getEffectiveStyle();
    let selectedFontPair: FontPair;
    if (selectedFontPairName === 'Custom Typography') {
      selectedFontPair = { name: 'Custom', title: customTitleFont, body: customBodyFont };
    } else {
      selectedFontPair = FONT_PAIRS.find(f => f.name === selectedFontPairName) || FONT_PAIRS[0];
    }

    try {
      const rawSlides = await generateCarouselStructure(topic, effectiveStyle, contentMode, language);
      
      const newSlides: Slide[] = rawSlides.map((s, index) => ({
        ...s,
        id: `slide-${Date.now()}-${index}`,
        imageBase64: null,
        isGeneratingImage: true,
        error: false,
        layout: s.layout || 'image-bottom',
        imageScale: 1.0, 
        titlePos: { x: 0, y: 0 },
        contentPos: { x: 0, y: 0 },
        titleFontSize: 120, // Default Title Font Size
        contentFontSize: 60, // Default Content Font Size
        imagePos: { x: 0, y: 0 },
        textAlign: 'center',
        fontPair: selectedFontPair 
      }));

      setSlides(newSlides);
      if (newSlides.length > 0) setSelectedSlideId(newSlides[0].id);

      // --- TRIGGER GROWTH MODAL HERE ---
      // Show modal after structure is done, while images generate
      setTimeout(() => setShowGrowthModal(true), 1500);

      setLoadingMessage(t('loadingImages'));
      generateImagesForSlides(newSlides, effectiveStyle);

    } catch (error) {
      console.error(error);
      setErrorMessage('Failed to generate carousel. Please check API Key or try again.');
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const generateImagesForSlides = async (currentSlides: Slide[], styleToUse: string) => {
    const updatedSlides = [...currentSlides];
    
    for (let i = 0; i < updatedSlides.length; i++) {
      if (updatedSlides[i].layout === 'text-only') {
        setSlides(prev => prev.map(s => s.id === updatedSlides[i].id ? { ...s, isGeneratingImage: false } : s));
        continue;
      }

      try {
        const base64 = await generateSlideImage(updatedSlides[i].imagePrompt, styleToUse);
        setSlides(prev => prev.map(s => s.id === updatedSlides[i].id ? { ...s, imageBase64: base64, isGeneratingImage: false, error: false } : s));
      } catch (e) {
        console.error(`Failed to generate image for slide ${i}`, e);
        setSlides(prev => prev.map(s => s.id === updatedSlides[i].id ? { ...s, isGeneratingImage: false, error: true } : s));
      }

      if (i < updatedSlides.length - 1) {
         await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  };

  const handleRegenerateImage = async (e: React.MouseEvent, slideId: string) => {
    e.stopPropagation();
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isGeneratingImage: true, error: false } : s));
    const effectiveStyle = getEffectiveStyle();

    try {
      const base64 = await generateSlideImage(slide.imagePrompt, effectiveStyle);
      setSlides(prev => prev.map(s => s.id === slideId ? { ...s, imageBase64: base64, isGeneratingImage: false, error: false } : s));
    } catch (error) {
       console.error(error);
       setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isGeneratingImage: false, error: true } : s));
    }
  };

  const handleSlideContentUpdate = (id: string, newContent: string) => setSlides(prev => prev.map(s => s.id === id ? { ...s, content: newContent } : s));
  const handleSlideTitleUpdate = (id: string, newTitle: string) => setSlides(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));

  const handleFontChange = (id: string, fontPairName: string) => {
    let fontPair: FontPair;
    if (fontPairName === 'Custom Typography') {
      fontPair = { name: 'Custom', title: customTitleFont, body: customBodyFont };
    } else {
      fontPair = FONT_PAIRS.find(f => f.name === fontPairName) || FONT_PAIRS[0];
    }
    setSlides(prev => prev.map(s => s.id === id ? { ...s, fontPair } : s));
  };

  useEffect(() => {
    if (selectedFontPairName === 'Custom Typography') {
       setSlides(prev => prev.map(s => {
         if (s.fontPair.name === 'Custom') {
           return { ...s, fontPair: { name: 'Custom', title: customTitleFont, body: customBodyFont } }
         }
         return s;
       }));
    }
  }, [customTitleFont, customBodyFont, selectedFontPairName]);

  const handleParaphrase = async (id: string, element: 'title' | 'content') => {
     const slide = slides.find(s => s.id === id);
     if(!slide) return;
     const originalText = element === 'title' ? slide.title : slide.content;
     if(!originalText) return;
     setLoadingMessage(t('loadingRewrite'));
     setIsGenerating(true);
     try {
       const newText = await paraphraseText(originalText, language);
       setSlides(prev => prev.map(s => s.id === id ? { ...s, [element]: newText } : s));
       setChatHistory(prev => [...prev, { role: 'model', text: `I've rewritten the ${element}.` }]);
     } catch(e) {
       console.error(e);
       setErrorMessage("Failed to paraphrase text.");
     } finally {
       setIsGenerating(false);
       setLoadingMessage('');
     }
  };

  const handleImageScaleUpdate = (id: string, scale: number) => setSlides(prev => prev.map(s => s.id === id ? { ...s, imageScale: scale } : s));
  
  const handlePositionUpdate = (id: string, element: SlideElement, axis: 'x' | 'y', value: number) => {
    if (!element) return;
    setSlides(prev => prev.map(s => {
      if (s.id !== id) return s;
      const propName = element === 'title' ? 'titlePos' : element === 'content' ? 'contentPos' : 'imagePos';
      return { ...s, [propName]: { ...s[propName], [axis]: value } };
    }));
  };

  const handleResetPosition = (id: string, element: SlideElement) => {
     if (!element) return;
     setSlides(prev => prev.map(s => {
       if (s.id !== id) return s;
       const propName = element === 'title' ? 'titlePos' : element === 'content' ? 'contentPos' : 'imagePos';
       return { ...s, [propName]: { x: 0, y: 0 } };
     }));
  };

  const handleTextAlignUpdate = (id: string, align: 'left' | 'center' | 'right') => setSlides(prev => prev.map(s => s.id === id ? { ...s, textAlign: align } : s));

  // --- NEW FONT SIZE HANDLER ---
  const handleFontSizeUpdate = (id: string, element: 'title' | 'content', size: number) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, [element === 'title' ? 'titleFontSize' : 'contentFontSize']: size } : s));
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => { if (typeof e.target?.result === 'string') setPendingImage(e.target.result); };
    reader.readAsDataURL(file);
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) processFile(e.target.files[0]); };
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) { processFile(file); e.preventDefault(); }
      }
    }
  };
  const onChatEmojiClick = (emojiData: EmojiClickData) => {
     const currentPos = cursorPosition ?? chatInput.length;
     const newText = chatInput.slice(0, currentPos) + emojiData.emoji + chatInput.slice(currentPos);
     setChatInput(newText);
     setCursorPosition(currentPos + emojiData.emoji.length);
     setShowChatEmojiPicker(false);
  };
  const onInlineEmojiClick = (emojiData: EmojiClickData) => {
      if (!selectedSlideId || !selectedElement) return;
      const slide = slides.find(s => s.id === selectedSlideId);
      if (!slide) return;
      const elementKey = selectedElement === 'title' ? 'title' : 'content';
      if (elementKey !== 'title' && elementKey !== 'content') return;
      const currentText = slide[elementKey] || '';
      const insertAt = Math.min(lastFocusedCursorIndex, currentText.length);
      const newText = currentText.slice(0, insertAt) + emojiData.emoji + currentText.slice(insertAt);
      setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, [elementKey]: newText } : s));
      setLastFocusedCursorIndex(insertAt + emojiData.emoji.length);
      setShowInlineEmojiPicker(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !pendingImage) || isGenerating) return;

    const userMsg = chatInput;
    const uploadedImage = pendingImage;
    const effectiveStyle = getEffectiveStyle();
    
    setChatInput('');
    setCursorPosition(null);
    setPendingImage(null);
    setShowChatEmojiPicker(false);
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg, image: uploadedImage || undefined }]);

    if (!selectedSlideId) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Please select a slide to edit content or modify images." }]);
      return;
    }

    const currentSlide = slides.find(s => s.id === selectedSlideId);
    if (!currentSlide) return;

    if (selectedElement === 'image' || uploadedImage) {
      if (uploadedImage) {
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, imageBase64: uploadedImage, isGeneratingImage: false } : s));
        if (!userMsg.trim()) {
          setChatHistory(prev => [...prev, { role: 'model', text: "I've replaced the image." }]);
          return;
        }
      }
      if (userMsg.trim()) {
        if (!currentSlide.imageBase64 && !uploadedImage) {
          setLoadingMessage(t('loadingImages'));
          setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: true } : s));
          try {
            const newImage = await generateSlideImage(userMsg, effectiveStyle);
            setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, imageBase64: newImage, isGeneratingImage: false } : s));
            setChatHistory(prev => [...prev, { role: 'model', text: "I've generated a new image." }]);
          } catch (err) {
            setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: false, error: true } : s));
          }
        } else {
           setLoadingMessage('Editing image...');
           setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: true } : s));
           try {
             const newImage = await editSlideImage(currentSlide.imageBase64!, userMsg, effectiveStyle);
             setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, imageBase64: newImage, isGeneratingImage: false } : s));
             setChatHistory(prev => [...prev, { role: 'model', text: "I've updated the image." }]);
           } catch (err) {
             setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: false } : s));
           }
        }
      }
      return;
    }

    if (selectedElement === 'title' || selectedElement === 'content') {
      if (!userMsg.trim()) return;
      const currentText = selectedElement === 'title' ? currentSlide.title : currentSlide.content;
      setChatHistory(prev => [...prev, { role: 'model', text: `Updating the ${selectedElement}...` }]);
      try {
        const newText = await updateSpecificSlideField(currentText, selectedElement, userMsg, language);
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, [selectedElement]: newText } : s));
        setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: `I've updated the ${selectedElement}.` }]);
      } catch (err) {
         setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Error updating text." }]);
      }
      return;
    }

    setChatHistory(prev => [...prev, { role: 'model', text: "Processing..." }]);
    try {
      const intent = await determineEditIntent(userMsg);
      if (intent === 'IMAGE') {
        if (!currentSlide.imageBase64 && !uploadedImage) {
           setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Wait for the image to finish generating first." }]);
           return;
        }
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: true } : s));
        const newImage = await editSlideImage(currentSlide.imageBase64!, userMsg, effectiveStyle);
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, imageBase64: newImage, isGeneratingImage: false } : s));
        setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Image updated." }]);
      } else {
        const updatedContent = await updateSlideContent(currentSlide, userMsg, language);
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, ...updatedContent } : s));
        setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Slide text updated." }]);
      }
    } catch (error) {
      setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Error processing request." }]);
      setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: false } : s));
    }
  };

  const handleExportPDF = async () => {
    if (slides.length === 0) return;
    setLoadingMessage(t('loadingExportPDF'));
    setIsGenerating(true);

    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn("Font loading check failed", e);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1350] });
      
      for (let i = 0; i < slides.length; i++) {
        const slideElement = document.getElementById(`slide-render-${slides[i].id}`);
        if (slideElement) {
          const imgData = await toJpeg(slideElement, {
            quality: 0.80, 
            pixelRatio: 1.0, 
            backgroundColor: palette.background, 
            cacheBust: true,
            skipAutoScale: true,
            style: { background: palette.background } // Force background to prevent transparency issues
          });

          if (i > 0) pdf.addPage([1080, 1350]);
          pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
        }
      }
      pdf.save('linkedin-carousel.pdf');
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to export PDF. Please check your browser settings or try again.");
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const handleExportZIP = async () => {
    if (slides.length === 0) return;
    setLoadingMessage(t('loadingExportZIP'));
    setIsGenerating(true);

    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn("Font loading check failed", e);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const zip = new JSZip();

    try {
      for (let i = 0; i < slides.length; i++) {
        const slideElement = document.getElementById(`slide-render-${slides[i].id}`);
        if (slideElement) {
          const imgData = await toJpeg(slideElement, {
            quality: 0.90, 
            pixelRatio: 1.0, 
            backgroundColor: palette.background, 
            cacheBust: true,
            skipAutoScale: true,
            style: { background: palette.background }
          });
          
          const base64Data = imgData.replace(/^data:image\/jpeg;base64,/, "");
          zip.file(`slide-${i + 1}.jpg`, base64Data, {base64: true});
        }
      }

      const content = await zip.generateAsync({type: "blob"});
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'instagram-carousel-images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to export ZIP. Please try again.");
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const getChatPlaceholder = () => {
    if (!selectedSlideId) return "Select a slide first";
    return t('chatPlaceholder');
  };

  const getPaletteTooltip = (key: string) => {
    switch(key) {
      case 'accent': return 'Color for highlights (**) and buttons';
      case 'text': return 'Color for all titles and body text';
      case 'background': return 'Main background color of the slides';
      default: return '';
    }
  };

  const currentSlide = selectedSlideId ? slides.find(s => s.id === selectedSlideId) : null;
  const currentPos = currentSlide && selectedElement 
    ? (selectedElement === 'title' ? currentSlide.titlePos : selectedElement === 'content' ? currentSlide.contentPos : currentSlide.imagePos) 
    : { x: 0, y: 0 };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      
      {/* ... (Modals) ... */}
      {showGrowthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300 relative border-4 border-blue-50">
             {/* Close Button */}
             <button 
               onClick={() => setShowGrowthModal(false)}
               className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
             >
               <X className="w-5 h-5" />
             </button>

             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-inner">
                   <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('growthTitle')}</h3>
                <p className="text-gray-500 font-medium">{t('growthSubtitle')}</p>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Follow Section */}
                <div className="flex flex-col gap-2">
                   <a 
                     href={SOCIAL_CONFIG.linkedinProfile} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-[#0077B5] text-white rounded-xl font-bold text-sm hover:bg-[#006396] transition-transform hover:scale-105 shadow-md shadow-blue-200"
                   >
                      <LinkedInIcon className="w-5 h-5" /> LinkedIn
                   </a>
                   <a 
                     href={SOCIAL_CONFIG.instagramProfile} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-transform hover:scale-105 shadow-md shadow-pink-200"
                   >
                      <InstagramIcon className="w-5 h-5" /> Instagram
                   </a>
                   <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-wider mt-1">{t('actionFollow')}</p>
                </div>

                {/* Comment Section */}
                <div className="flex flex-col gap-2">
                   {SOCIAL_CONFIG.linkedinPost && (
                     <a 
                       href={SOCIAL_CONFIG.linkedinPost} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-gray-50 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all group"
                     >
                        <MessageSquare className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                        <span className="text-xs font-bold leading-tight text-center">{t('actionComment')}</span>
                     </a>
                   )}
                   
                   {/* Conditional Instagram Post Button - Hidden if empty string */}
                   {SOCIAL_CONFIG.instagramPost && (
                     <a 
                       href={SOCIAL_CONFIG.instagramPost} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-gray-50 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-pink-400 hover:text-pink-600 hover:bg-pink-50 transition-all group"
                     >
                        <Heart className="w-6 h-6 text-gray-400 group-hover:text-pink-500" />
                        <span className="text-xs font-bold leading-tight text-center">{t('actionComment')}</span>
                     </a>
                   )}
                   
                   <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-wider mt-1">
                      {SOCIAL_CONFIG.instagramPost ? "Posts Destacados" : "LinkedIn Post"}
                   </p>
                </div>
             </div>

             <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3 mb-6">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  {t('commentHint')}
                </p>
             </div>

             <button 
               onClick={() => setShowGrowthModal(false)}
               className="w-full py-3 text-gray-500 font-semibold hover:text-gray-900 transition-colors text-sm"
             >
               {t('actionSkip')}
             </button>
           </div>
        </div>
      )}

      {/* UNIFIED LEFT SIDEBAR */}
      <div 
        className={`bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-300 relative shadow-xl overflow-hidden
          ${isSidebarOpen ? 'w-96 opacity-100' : 'w-0 opacity-0'}`}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 min-w-[24rem]">
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
            <Sparkles className="text-blue-600 w-5 h-5 flex-shrink-0" />
            {t('appTitle')}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={handleToggleTour}
              className={`p-1.5 rounded-full transition-colors ${showTour ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
              title={showTour ? "Close Guided Tour" : "Start Guided Tour"}
            >
              {showTour ? <X className="w-4 h-4" /> : <CircleHelp className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-[10px] font-medium text-gray-500 whitespace-nowrap" title="Your settings are saved automatically">
               {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
               {saveStatus === 'saved' && <Check className="w-3 h-3 text-green-500" />}
               {saveStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
               {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}
            </div>
          </div>
        </div>

        {slides.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-in fade-in duration-300 min-w-[24rem]">
            {/* ... (Initial Inputs: Content Mode, Topic, Style, Typography, Palette, Generate) ... */}
            <div className="space-y-4 relative">
              <div className="flex items-center p-1 bg-gray-100 rounded-lg relative">
                <div className="relative group/mode flex-1"><button onClick={() => setContentMode('generate')} className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${contentMode === 'generate' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Brain className="w-3.5 h-3.5" />{t('aiMode')}</button></div>
                <div className="relative group/mode flex-1"><button onClick={() => setContentMode('literal')} className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${contentMode === 'literal' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><FileText className="w-3.5 h-3.5" />{t('literalMode')}</button></div>
              </div>
              <div ref={step0Ref} className="relative"><label className="text-sm font-bold text-gray-800 block">{t('topicLabel')}<HelpTooltip index={0} title={t('tourStep1Title')} content={t('tourStep1Content')} /></label><textarea className={`w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:outline-none resize-none h-32 transition-all text-sm leading-relaxed ${contentMode === 'generate' ? 'focus:ring-blue-500' : 'focus:ring-purple-500'}`} placeholder={contentMode === 'generate' ? t('topicPlaceholder') : t('literalPlaceholder')} value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isGenerating} />{showTour && currentTourStep === 0 && (<TourPopover step={0} totalSteps={9} title={t('tourStep1Title')} content={t('tourStep1Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="right" anchorRef={step0Ref} />)}</div>
              {contentMode === 'literal' && (<p className="text-xs text-purple-600 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> {t('literalHint')}</p>)}
              <div ref={step1Ref} className="space-y-2 relative"><label className="text-sm font-bold text-gray-800 flex items-center gap-2"><Paintbrush className="w-4 h-4 text-blue-600" />{t('visualStyle')}<HelpTooltip index={1} title={t('tourStep2Title')} content={t('tourStep2Content')} /></label><div className="relative"><select value={imageStyle} onChange={(e) => setImageStyle(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm appearance-none cursor-pointer" disabled={isGenerating}>{STYLE_PRESETS.map(style => (<option key={style} value={style}>{style}</option>))}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>{imageStyle === 'Custom Style' && (<div className="animate-in fade-in slide-in-from-top-2 duration-300"><div className="flex items-center gap-2 mt-2 mb-1"><PenTool className="w-3 h-3 text-purple-600" /><span className="text-xs font-semibold text-purple-700">{t('customStyleLabel')}</span></div><textarea value={customStylePrompt} onChange={(e) => setCustomStylePrompt(e.target.value)} className="w-full p-3 bg-purple-50 border border-purple-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm resize-none h-20" placeholder={t('customStylePlaceholder')} disabled={isGenerating} /></div>)}{showTour && currentTourStep === 1 && (<TourPopover step={1} totalSteps={9} title={t('tourStep2Title')} content={t('tourStep2Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="right" anchorRef={step1Ref} />)}</div>
              <div ref={step2Ref} className="space-y-2 relative"><label className="text-sm font-bold text-gray-800 flex items-center gap-2"><TypeIcon className="w-4 h-4 text-blue-600" />{t('typography')}<HelpTooltip index={2} title={t('tourStep3Title')} content={t('tourStep3Content')} /></label><div className="relative"><select value={selectedFontPairName} onChange={(e) => setSelectedFontPairName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm appearance-none cursor-pointer" disabled={isGenerating}>{FONT_PAIRS.map(font => (<option key={font.name} value={font.name}>{font.name} ({font.title.split(',')[0].replace(/'/g, '')} + {font.body.split(',')[0].replace(/'/g, '')})</option>))}<option value="Custom Typography">Custom Typography</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>{selectedFontPairName === 'Custom Typography' && (<div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in slide-in-from-top-2"><div className="space-y-1"><label className="text-[10px] uppercase font-bold text-gray-500">Title Font</label><select value={customTitleFont} onChange={(e) => setCustomTitleFont(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">{AVAILABLE_FONTS.map(f => (<option key={f.name} value={f.value}>{f.name}</option>))}</select></div><div className="space-y-1"><label className="text-[10px] uppercase font-bold text-gray-500">Body Font</label><select value={customBodyFont} onChange={(e) => setCustomBodyFont(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">{AVAILABLE_FONTS.map(f => (<option key={f.name} value={f.value}>{f.name}</option>))}</select></div></div>)}{showTour && currentTourStep === 2 && (<TourPopover step={2} totalSteps={9} title={t('tourStep3Title')} content={t('tourStep3Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="right" anchorRef={step2Ref} />)}</div>
              
              {/* Step 4: Palette */}
              <div ref={step3Ref} className="space-y-2 relative">
                 <div className="flex items-center justify-between"><label className="text-sm font-bold text-gray-800 flex items-center gap-2"><PaletteIcon className="w-4 h-4 text-blue-600" />{t('palette')}<HelpTooltip index={3} title={t('tourStep4Title')} content={t('tourStep4Content')} /></label></div>
                 <div className="relative">
                    <button onClick={() => setIsPaletteDropdownOpen(!isPaletteDropdownOpen)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-left" disabled={isGenerating}>
                       <div className="flex items-center gap-3"><div className="flex -space-x-1 shrink-0"><div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.background }} /><div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.text }} /><div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.accent }} /></div><span className="text-sm text-gray-700 font-medium truncate">{palettePresetName}</span></div>
                       <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isPaletteDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isPaletteDropdownOpen && (<div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-200">{PALETTE_PRESETS.map((preset) => (<button key={preset.name} onClick={() => handlePalettePresetChange(preset.name)} className="w-full p-2 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left group/item"><div className="flex -space-x-1 shrink-0">{preset.palette ? (<><div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.palette.background }} /><div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.palette.text }} /><div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.palette.accent }} /></>) : (<div className="w-4 h-4 rounded-full border border-gray-200 bg-gradient-to-br from-red-400 to-blue-500" />)}</div><span className={`text-sm flex-1 ${palettePresetName === preset.name ? 'font-bold text-blue-600' : 'text-gray-700 group-hover/item:text-gray-900'}`}>{preset.name}</span>{palettePresetName === preset.name && <Check className="w-3 h-3 text-blue-600" />}</button>))}</div>)}
                    {isPaletteDropdownOpen && (<div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsPaletteDropdownOpen(false)} />)}
                 </div>

                 {/* BUG FIX: EDITABLE CUSTOM PALETTE */}
                 {palettePresetName === 'Custom Palette' && (
                   <div className="grid grid-cols-2 gap-4 mt-3 animate-in fade-in slide-in-from-top-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                     {(Object.keys(palette) as Array<keyof Palette>).map((key) => (
                        <div key={key} className="flex flex-col gap-1 group/palette relative">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400">{key}</span>
                            <div className="relative group/tooltip">
                              <Info className="w-3 h-3 text-gray-300 hover:text-blue-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 text-center shadow-lg">{getPaletteTooltip(key)}<div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <input type="color" value={palette[key]} onChange={(e) => setPalette(prev => ({...prev, [key]: e.target.value}))} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                            <input 
                              type="text" 
                              value={palette[key]} 
                              onChange={(e) => setPalette(prev => ({...prev, [key]: e.target.value}))}
                              className="text-xs text-gray-600 font-mono border-none focus:outline-none w-16 bg-transparent"
                            />
                          </div>
                        </div>
                     ))}
                   </div>
                 )}
                 {showTour && currentTourStep === 3 && (<TourPopover step={3} totalSteps={9} title={t('tourStep4Title')} content={t('tourStep4Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="right" anchorRef={step3Ref} />)}
              </div>

              <div ref={step4Ref} className="relative"><button onClick={handleGenerate} disabled={!topic.trim() || isGenerating || (imageStyle === 'Custom Style' && !customStylePrompt.trim())} className={`w-full py-3.5 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 mt-4 relative group ${contentMode === 'generate' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'} disabled:opacity-50 disabled:cursor-not-allowed`}>{isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}{contentMode === 'generate' ? t('generateBtn') : t('formatBtn')}<div onClick={(e) => e.stopPropagation()} className="absolute right-4 top-1/2 -translate-y-1/2"><HelpTooltip index={4} title={t('tourStep5Title')} content={t('tourStep5Content')} /></div></button>{showTour && currentTourStep === 4 && (<TourPopover step={4} totalSteps={9} title={t('tourStep5Title')} content={t('tourStep5Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="top" anchorRef={step4Ref} />)}</div>
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100"></div>
          </div>
        ) : (
          <>
            {/* NEW: FINE TUNING CONTROLS (MOVED TO TOP) */}
            {currentSlide && (
              <div ref={step6Ref} className="flex-none p-4 bg-white border-b border-gray-200 animate-in slide-in-from-top-2 z-10 min-w-[24rem]">
                {showTour && currentTourStep === 6 && (<div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-1"><TourPopover step={6} totalSteps={9} title={t('tourStep7Title')} content={t('tourStep7Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="bottom" anchorRef={step6Ref} /></div>)}

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
                    {selectedElement ? <Move className="w-3 h-3 text-blue-600" /> : <TypeIcon className="w-3 h-3 text-blue-600" />}
                    {selectedElement ? "Element Tuning" : "Slide Typography"}
                    <HelpTooltip index={10} title={t('tourStep7Title')} content={t('tourStep7Content')} />
                  </h3>
                  {selectedElement && (<button onClick={() => handleResetPosition(currentSlide.id, selectedElement)} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors" title={t('resetPos')}><RotateCcw className="w-3 h-3" /> {t('resetPos')}</button>)}
                </div>

                {(!selectedElement) && (
                  <div className="mb-4">
                     <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">{t('fontPairing')}<HelpTooltip index={7} /></label>
                     <div className="relative">
                        <select value={currentSlide.fontPair.name === 'Custom' ? 'Custom Typography' : currentSlide.fontPair.name} onChange={(e) => handleFontChange(currentSlide.id, e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs appearance-none cursor-pointer">
                          {FONT_PAIRS.map(font => (<option key={font.name} value={font.name}>{font.name} ({font.title.split(',')[0].replace(/'/g, '')} + {font.body.split(',')[0].replace(/'/g, '')})</option>))}
                          <option value="Custom Typography">Custom Typography</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                     </div>
                     {currentSlide.fontPair.name === 'Custom' && (<div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in slide-in-from-top-2"><div className="space-y-1"><label className="text-[10px] uppercase font-bold text-gray-500">Title Font</label><select value={customTitleFont} onChange={(e) => setCustomTitleFont(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">{AVAILABLE_FONTS.map(f => (<option key={f.name} value={f.value}>{f.name}</option>))}</select></div><div className="space-y-1"><label className="text-[10px] uppercase font-bold text-gray-500">Body Font</label><select value={customBodyFont} onChange={(e) => setCustomBodyFont(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">{AVAILABLE_FONTS.map(f => (<option key={f.name} value={f.value}>{f.name}</option>))}</select></div></div>)}
                  </div>
                )}

                {/* --- FONT SIZE CONTROL MOVED TO TOP --- */}
                {(selectedElement === 'title' || selectedElement === 'content') && (
                    <div className="mb-4 pt-2 border-t border-gray-100">
                        <div className="flex justify-between text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">
                            {t('fontSize')}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold w-10 text-right font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                                {selectedElement === 'title' ? currentSlide.titleFontSize || 120 : currentSlide.contentFontSize || 60}px
                            </span>
                            <input
                                type="range"
                                min={selectedElement === 'title' ? "40" : "20"}
                                max={selectedElement === 'title' ? "300" : "150"}
                                step="2"
                                value={selectedElement === 'title' ? currentSlide.titleFontSize || 120 : currentSlide.contentFontSize || 60}
                                onChange={(e) => handleFontSizeUpdate(currentSlide.id, selectedElement, parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
                            />
                        </div>
                    </div>
                )}

                {(selectedElement === 'title' || selectedElement === 'content') && (
                   <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="relative flex-1 group/tooltip-wrapper"><button onClick={() => handleParaphrase(currentSlide.id, selectedElement)} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 p-2.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 border border-purple-100 transition-colors"><Wand2 className="w-3.5 h-3.5" /> {t('aiRewrite')}</button><div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto"><HelpTooltip index={8} /></div></div>
                      
                      {/* EMOJI BUTTON WITH REF FOR PORTAL POSITIONING */}
                      <div className="relative flex-1">
                        <div className="relative w-full group/tooltip-wrapper">
                          <button 
                            ref={inlineEmojiBtnRef}
                            onClick={() => setShowInlineEmojiPicker(!showInlineEmojiPicker)} 
                            className="w-full flex items-center justify-center gap-2 p-2.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-100 border border-yellow-100 transition-colors"
                          >
                             <Smile className="w-3.5 h-3.5" /> {t('insertEmoji')}
                          </button>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto"><HelpTooltip index={9} /></div>
                        </div>
                        
                        {/* EMOJI PICKER IN PORTAL TO AVOID CLIPPING */}
                        {showInlineEmojiPicker && (
                          <PortalTooltip 
                            anchorRef={inlineEmojiBtnRef} 
                            position="bottom" 
                            offset={5} 
                            className="pointer-events-auto z-[9999]"
                          >
                            <div className="shadow-2xl rounded-xl border border-gray-200 overflow-hidden">
                                <div className="fixed inset-0 z-0" onClick={() => setShowInlineEmojiPicker(false)}></div>
                                <div className="relative z-10">
                                    <EmojiPicker onEmojiClick={onInlineEmojiClick} theme={Theme.LIGHT} width={300} height={400} previewConfig={{ showPreview: false }} />
                                </div>
                            </div>
                          </PortalTooltip>
                        )}
                      </div>
                   </div>
                )}

                {selectedElement && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div><div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono uppercase">Pos X</div><input type="range" min="-400" max="400" step="5" value={currentPos.x} onChange={(e) => handlePositionUpdate(currentSlide.id, selectedElement, 'x', parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /></div>
                      <div><div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono uppercase">Pos Y</div><input type="range" min="-400" max="400" step="5" value={currentPos.y} onChange={(e) => handlePositionUpdate(currentSlide.id, selectedElement, 'y', parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /></div>
                    </div>
                  </>
                )}
                
                {selectedElement === 'image' && (<div className="mt-2 pt-2 border-t border-gray-100"><div className="flex justify-between text-xs text-gray-500 mb-1 font-mono"><span>Scale</span><span>{Math.round((currentSlide.imageScale || 1) * 100)}%</span></div><input type="range" min="0.5" max="1.5" step="0.05" value={currentSlide.imageScale || 1} onChange={(e) => handleImageScaleUpdate(currentSlide.id, parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /></div>)}

                {(selectedElement === 'title' || selectedElement === 'content') && (
                   <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-gray-100">
                      <button onClick={() => handleTextAlignUpdate(currentSlide.id, 'left')} className={`p-1.5 rounded ${currentSlide.textAlign === 'left' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}><AlignLeft className="w-4 h-4" /></button>
                      <button onClick={() => handleTextAlignUpdate(currentSlide.id, 'center')} className={`p-1.5 rounded ${currentSlide.textAlign === 'center' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}><AlignCenter className="w-4 h-4" /></button>
                      <button onClick={() => handleTextAlignUpdate(currentSlide.id, 'right')} className={`p-1.5 rounded ${currentSlide.textAlign === 'right' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}><AlignRight className="w-4 h-4" /></button>
                   </div>
                )}
              </div>
            )}

            {/* Chat Input Area */}
            <div ref={step7Ref} className="p-4 bg-white border-b border-gray-200 min-w-[24rem] relative z-0">
                {/* ... (Chat Content) ... */}
                <div className="flex items-center gap-1.5 mb-2 px-1 opacity-80 hover:opacity-100 transition-opacity cursor-help">
                   <HelpCircle className="w-3 h-3 text-blue-500" />
                   <p className="text-[10px] text-gray-500 font-medium">
                      {t('tourStep6Content')}
                   </p>
                </div>
                {showTour && currentTourStep === 7 && (<TourPopover step={7} totalSteps={9} title={t('tourStep8Title')} content={t('tourStep8Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="top" anchorRef={step7Ref} />)}
                {pendingImage && (<div className="mb-3 flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100 animate-in slide-in-from-bottom-2"><div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-white"><img src={pendingImage} alt="Preview" className="w-full h-full object-cover" /></div><span className="text-xs text-blue-700 flex-1 truncate font-medium">Image attached</span><button onClick={() => setPendingImage(null)} className="p-1 hover:bg-blue-100 rounded-full text-blue-700"><X className="w-4 h-4" /></button></div>)}
                
                {/* CHAT EMOJI PICKER WITH PORTAL */}
                {showChatEmojiPicker && (
                  <PortalTooltip 
                    anchorRef={chatEmojiBtnRef} 
                    position="top" 
                    offset={10} 
                    className="pointer-events-auto z-[9999]"
                  >
                    <div className="shadow-2xl rounded-xl border border-gray-200 overflow-hidden bg-white">
                        <div className="fixed inset-0 z-0" onClick={() => setShowChatEmojiPicker(false)}></div>
                        <div className="relative z-10">
                            <EmojiPicker onEmojiClick={onChatEmojiClick} theme={Theme.LIGHT} width={300} height={400} previewConfig={{ showPreview: false }} />
                        </div>
                    </div>
                  </PortalTooltip>
                )}

                <form onSubmit={handleChatSubmit} className="relative flex items-center gap-2">
                  <div className="flex gap-1">
                    <button 
                      type="button" 
                      ref={chatEmojiBtnRef}
                      onClick={() => setShowChatEmojiPicker(!showChatEmojiPicker)} 
                      className={`p-3 rounded-xl transition-colors ${showChatEmojiPicker ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} 
                      title="Add Emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    {selectedElement !== 'title' && selectedElement !== 'content' && (<button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Attach Image"><Paperclip className="w-5 h-5" /></button>)}</div>
                  <div className="relative flex-1"><input ref={chatInputRef} type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)} onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)} onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart)} onPaste={handlePaste} onFocus={() => { if (!selectedElement) setShowChatEmojiPicker(false) }} placeholder={getChatPlaceholder()} className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all" /></div>
                  <button type="submit" disabled={(!chatInput.trim() && !pendingImage) || isGenerating} className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors shadow-sm"><Send className="w-5 h-5" /></button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </form>
            </div>

            {/* Chat History Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-w-[24rem]">
                <div className="flex items-center gap-2 mb-2 px-2"><History className="w-3.5 h-3.5 text-gray-400" /><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('activityLog')}</span></div>
                {chatHistory.length === 0 && (<div className="text-center p-4 text-gray-400 text-xs italic">{t('tourStep6Content')}</div>)}
                {chatHistory.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs space-y-1 shadow-sm ${msg.role === 'user' ? 'bg-blue-100 text-blue-900 rounded-br-sm' : 'bg-white border border-gray-200 text-gray-600 rounded-bl-sm'}`}>{msg.image && (<img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg border border-white/20 mb-1" />)}{msg.text && <p className="leading-relaxed">{msg.text}</p>}</div></div>))}
                <div ref={chatEndRef} />
            </div>

            {/* Footer Buttons */}
            <div ref={step8Ref} className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-3 min-w-[24rem] relative">
              {showTour && currentTourStep === 8 && (<TourPopover step={8} totalSteps={9} title={t('tourStep9Title')} content={t('tourStep9Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="top" anchorRef={step8Ref} />)}
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0">{t('exportTitle')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExportPDF} disabled={isGenerating} className="py-2.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-800 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm" title="Best for LinkedIn Documents">{isGenerating && loadingMessage.includes('PDF') ? <Loader2 className="animate-spin w-4 h-4" /> : <LinkedInIcon className="w-5 h-5" />}{t('linkedinBtn')}</button>
                 <button onClick={handleExportZIP} disabled={isGenerating} className="py-2.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm" title="Best for Instagram/TikTok">{isGenerating && loadingMessage.includes('ZIP') ? <Loader2 className="animate-spin w-4 h-4" /> : <InstagramIcon className="w-5 h-5" />}{t('instagramBtn')}</button>
              </div>
               <button onClick={handleCreateNew} disabled={isGenerating} className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"><PlusCircle className="w-4 h-4" />{t('createNew')}</button>
            </div>
          </>
        )}
      </div>

      {/* MAIN PREVIEW AREA */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col h-full">
        {/* NEW TOP BAR */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 h-16 flex items-center justify-between shadow-sm z-20 shrink-0">
          <div className="flex-1 flex items-center"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">{isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}</button></div>
          <div className="flex items-center gap-4">{slides.length > 0 && (<><button onClick={handlePrevSlide} disabled={!selectedSlideId || slides.findIndex(s => s.id === selectedSlideId) === 0} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors text-gray-700"><ChevronLeft className="w-5 h-5" /></button><span className="text-sm font-bold text-gray-700 min-w-[3rem] text-center select-none font-mono">{selectedSlideId ? `${slides.findIndex(s => s.id === selectedSlideId) + 1} / ${slides.length}` : '-'}</span><button onClick={handleNextSlide} disabled={!selectedSlideId || slides.findIndex(s => s.id === selectedSlideId) === slides.length - 1} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors text-gray-700"><ChevronRight className="w-5 h-5" /></button></>)}</div>
          <div className="flex-1 flex justify-end items-center gap-3">{isGenerating && (<span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full flex items-center gap-2 font-medium animate-pulse"><Loader2 className="animate-spin w-3 h-3" />{loadingMessage || 'Working...'}</span>)}<div className="relative"><button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 transition-colors ${isLangMenuOpen ? 'ring-2 ring-blue-100 bg-white' : ''}`}><Globe className="w-3.5 h-3.5" /><span className="uppercase">{language}</span><ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} /></button>{isLangMenuOpen && (<><div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsLangMenuOpen(false)} /><div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100"><button onClick={() => { setLanguage('es'); setIsLangMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-xs hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 ${language === 'es' ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-700'}`}><span className="text-base">🇪🇸</span> Español</button><button onClick={() => { setLanguage('en'); setIsLangMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-xs hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 ${language === 'en' ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-700'}`}><span className="text-base">🇺🇸</span> English</button><button onClick={() => { setLanguage('pt'); setIsLangMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-xs hover:bg-gray-50 flex items-center gap-3 ${language === 'pt' ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-700'}`}><span className="text-base">🇧🇷</span> Português</button></div></>)}</div></div>
        </div>

        <div className={`flex-1 overflow-x-auto overflow-y-hidden p-8 flex items-center gap-12 snap-x snap-mandatory relative ${isGenerating ? 'pointer-events-none opacity-50' : ''}`} ref={slidesContainerRef} onClick={() => setSelectedElement(null)}>
           {showTour && currentTourStep === 5 && slides.length > 0 && (<div ref={step5Ref} className="absolute top-1/2 left-1/2 w-1 h-1"><TourPopover step={5} totalSteps={9} title={t('tourStep6Title')} content={t('tourStep6Content')} onNext={handleNextStep} onPrev={handlePrevStep} onSkip={handleSkipTour} position="bottom" anchorRef={step5Ref} /></div>)}
           {slides.length === 0 ? (<div className="w-full flex flex-col items-center justify-center text-gray-400 gap-6 animate-in zoom-in-95 duration-500"><div className="w-32 h-32 rounded-3xl bg-white shadow-sm border border-gray-200 flex items-center justify-center"><Sparkles className="w-12 h-12 text-blue-100" /></div><div className="text-center"><h3 className="text-lg font-semibold text-gray-600">{t('startCreating')}</h3><p className="text-sm text-gray-400 mt-1">{t('startCreatingSub')}</p></div></div>) : (slides.map((slide) => (<div key={slide.id} className="flex-shrink-0 snap-center"><SlideView id={slide.id} slide={slide} palette={palette} isSelected={selectedSlideId === slide.id} selectedElement={selectedSlideId === slide.id ? selectedElement : null} onSelect={() => setSelectedSlideId(slide.id)} onElementSelect={(el) => { setSelectedSlideId(slide.id); setSelectedElement(el); if (!isSidebarOpen) setIsSidebarOpen(true); }} onRegenerateImage={(e) => handleRegenerateImage(e, slide.id)} onTitleChange={(newTitle) => handleSlideTitleUpdate(slide.id, newTitle)} onContentChange={(newContent) => handleSlideContentUpdate(slide.id, newContent)} isEditable={true} scale={0.36} onCursorChange={setLastFocusedCursorIndex} /><div className="absolute top-0 -left-[9999px] -z-50 pointer-events-none"><div id={`slide-render-${slide.id}`}><SlideView slide={slide} palette={palette} isSelected={false} onSelect={() => {}} onRegenerateImage={() => {}} isEditable={false} isExport={true} scale={1} /></div></div></div>)))}
        </div>
      </div>
    </div>
  );
};

export default App;