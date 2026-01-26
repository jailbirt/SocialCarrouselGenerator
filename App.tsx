import React, { useState, useRef, useEffect } from 'react';
import { Slide, Palette, ChatMessage, SlideElement, Position, FontPair } from './types';
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
  CircleHelp
} from 'lucide-react';

const STORAGE_KEY = 'carrousel_generator_state_v1';

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
  { name: 'Space Grotesk', value: "'Space Grotesk', sans-serif" }
];

const FONT_PAIRS: FontPair[] = [
  { name: 'Modern', title: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" },
  { name: 'Clean', title: "'Inter', sans-serif", body: "'Inter', sans-serif" },
  { name: 'Elegant', title: "'Playfair Display', serif", body: "'Lato', sans-serif" },
  { name: 'Bold', title: "'Oswald', sans-serif", body: "'Roboto', sans-serif" },
  { name: 'Classic', title: "'Merriweather', serif", body: "'Source Sans 3', sans-serif" },
];

const PALETTE_PRESETS = [
  // --- Modern Standards ---
  { name: 'Dark Modern (Default)', palette: { background: '#1a1a1a', text: '#ffffff', accent: '#3b82f6' } },
  { name: 'Clean Light', palette: { background: '#ffffff', text: '#1a1a1a', accent: '#2563eb' } },
  
  // --- Inspired by Reference (Tech/LinkedIn) ---
  { name: 'LinkedIn Blue & Orange', palette: { background: '#004182', text: '#ffffff', accent: '#ea580c' } },
  { name: 'Tech Royal & Amber', palette: { background: '#1e40af', text: '#f8fafc', accent: '#fbbf24' } },
  { name: 'Deep Navy & Coral', palette: { background: '#0f172a', text: '#ffffff', accent: '#f87171' } },

  // --- High Impact / Bold ---
  { name: 'Swiss Red & Black', palette: { background: '#dc2626', text: '#ffffff', accent: '#000000' } },
  { name: 'Cyber Black & Neon', palette: { background: '#09090b', text: '#e4e4e7', accent: '#22c55e' } },
  { name: 'Electric Purple', palette: { background: '#581c87', text: '#faf5ff', accent: '#22d3ee' } },
  { name: 'Midnight & Magenta', palette: { background: '#020617', text: '#ffffff', accent: '#d946ef' } },

  // --- Professional / Elegant ---
  { name: 'Slate & Gold', palette: { background: '#334155', text: '#f8fafc', accent: '#fcd34d' } },
  { name: 'Corporate Grey', palette: { background: '#f3f4f6', text: '#111827', accent: '#059669' } },
  { name: 'Luxury Black', palette: { background: '#000000', text: '#e2e8f0', accent: '#fbbf24' } },

  // --- Earth & Nature ---
  { name: 'Deep Forest', palette: { background: '#022c22', text: '#ecfccb', accent: '#84cc16' } },
  { name: 'Warm Sand', palette: { background: '#fff7ed', text: '#451a03', accent: '#d97706' } },
  { name: 'Sage & Charcoal', palette: { background: '#e2e8f0', text: '#0f172a', accent: '#4d7c0f' } },

  // --- Aesthetic / Trendy ---
  { name: 'Vaporwave Pink', palette: { background: '#fce7f3', text: '#831843', accent: '#db2777' } },
  { name: 'Soft Pastel', palette: { background: '#fdf4ff', text: '#4a044e', accent: '#c026d3' } },

  // --- Custom ---
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

// --- Tour Component ---
interface TourPopoverProps {
  step: number;
  totalSteps: number;
  title: string;
  content: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  position?: 'right' | 'bottom' | 'top' | 'left';
}

const TourPopover: React.FC<TourPopoverProps> = ({ step, totalSteps, title, content, onNext, onPrev, onSkip, position = 'right' }) => {
  const positionClasses = {
    right: 'left-full top-0 ml-4',
    left: 'right-full top-0 mr-4',
    bottom: 'top-full left-0 mt-4',
    top: 'bottom-full left-0 mb-4'
  };

  return (
    <div className={`absolute z-[100] w-64 bg-white rounded-xl shadow-2xl border border-blue-100 p-4 animate-in zoom-in-95 duration-200 ${positionClasses[position]}`}>
      {/* Arrow */}
      <div className={`absolute w-3 h-3 bg-white border-l border-b border-blue-100 transform rotate-45 
        ${position === 'right' ? '-left-1.5 top-6' : 
          position === 'left' ? '-right-1.5 top-6 rotate-[225deg]' :
          position === 'bottom' ? '-top-1.5 left-6 rotate-[135deg]' :
          '-bottom-1.5 left-6 rotate-[-45deg]'
        }`} 
      />
      
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
          Step {step + 1}/{totalSteps}
        </span>
        <button onClick={onSkip} className="text-gray-400 hover:text-gray-600">
          <X className="w-3 h-3" />
        </button>
      </div>
      
      <h4 className="font-bold text-gray-800 text-sm mb-1">{title}</h4>
      <p className="text-xs text-gray-600 leading-relaxed mb-3">{content}</p>
      
      <div className="flex justify-between items-center mt-2">
        <button 
          onClick={onPrev} 
          disabled={step === 0}
          className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 font-medium px-2 py-1"
        >
          Back
        </button>
        <button 
          onClick={onNext} 
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200"
        >
          {step === totalSteps - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // --- State (Initialized with LocalStorage) ---
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
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Selection State
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<SlideElement>(null);
  
  // Generation & Chat State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number | null>(null); 
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 

  // UI Modals State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Refs
  const slidesContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence Effect ---
  useEffect(() => {
    const saveState = () => {
      setSaveStatus('saving');
      try {
        const stateToSave = {
          topic,
          contentMode,
          imageStyle,
          selectedFontPairName,
          customTitleFont,
          customBodyFont,
          palettePresetName,
          palette,
          customStylePrompt,
          slides, // Note: Saving large base64 images might hit storage limits
          showTour,
          currentTourStep
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        setSaveStatus('saved');
      } catch (e: any) {
        console.error("Storage limit reached or error", e);
        if (e.name === 'QuotaExceededError') {
           setErrorMessage("Storage full. Some images might not be saved locally. Try clearing browser data.");
        }
        setSaveStatus('error');
      }
    };

    const timeoutId = setTimeout(saveState, 1000); // Debounce save by 1s
    return () => clearTimeout(timeoutId);

  }, [topic, contentMode, imageStyle, selectedFontPairName, customTitleFont, customBodyFont, palettePresetName, palette, customStylePrompt, slides, showTour, currentTourStep]);

  // --- Tour Logic ---
  const handleNextStep = () => {
    setCurrentTourStep(prev => prev + 1);
  };
  
  const handlePrevStep = () => {
    setCurrentTourStep(prev => Math.max(0, prev - 1));
  };

  const handleSkipTour = () => {
    setShowTour(false);
  };

  const resetTour = () => {
    setCurrentTourStep(0);
    setShowTour(true);
    setIsSidebarOpen(true); // Open sidebar for step 1
  };

  // Ensure sidebar is open if we are in early steps
  useEffect(() => {
    if (showTour && currentTourStep < 5 && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  }, [showTour, currentTourStep]);

  // --- Helpers ---

  const getEffectiveStyle = () => {
    return imageStyle === 'Custom Style' ? customStylePrompt : imageStyle;
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToSlide = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  useEffect(() => {
    if (selectedSlideId) {
      scrollToSlide(selectedSlideId);
    }
  }, [selectedSlideId]);

  // --- Navigation ---

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
      if (
        document.activeElement instanceof HTMLInputElement || 
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') handlePrevSlide();
      if (e.key === 'ArrowRight') handleNextSlide();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlideId, slides]);

  // --- Core Actions ---

  const handleCreateNew = () => {
    setShowResetConfirm(true);
  };

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
    
    // Explicitly clear storage for a fresh start, but KEEP tour state if user wants it
    // We only reset the content parts
    const tempShowTour = showTour;
    localStorage.removeItem(STORAGE_KEY);
    // Restore tour setting preference
    if (!tempShowTour) setShowTour(false); 
  };

  const handlePalettePresetChange = (presetName: string) => {
    setPalettePresetName(presetName);
    const preset = PALETTE_PRESETS.find(p => p.name === presetName);
    if (preset && preset.palette) {
      setPalette(preset.palette);
    }
    setIsPaletteDropdownOpen(false);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (imageStyle === 'Custom Style' && !customStylePrompt.trim()) {
      setErrorMessage("Please describe your custom image style.");
      return;
    }
    
    // Auto-advance tour if active
    if (showTour && currentTourStep === 4) {
      handleNextStep();
    }

    setIsGenerating(true);
    setLoadingMessage('Designing your carousel structure...');
    setSlides([]);
    setSelectedSlideId(null);
    setSelectedElement(null);
    setChatHistory([]);

    const effectiveStyle = getEffectiveStyle();
    
    let selectedFontPair: FontPair;
    if (selectedFontPairName === 'Custom Typography') {
      selectedFontPair = {
        name: 'Custom',
        title: customTitleFont,
        body: customBodyFont
      };
    } else {
      selectedFontPair = FONT_PAIRS.find(f => f.name === selectedFontPairName) || FONT_PAIRS[0];
    }

    try {
      const rawSlides = await generateCarouselStructure(topic, effectiveStyle, contentMode);
      
      const newSlides: Slide[] = rawSlides.map((s, index) => ({
        ...s,
        id: `slide-${Date.now()}-${index}`,
        imageBase64: null,
        isGeneratingImage: true,
        layout: s.layout || 'image-bottom',
        imageScale: 1.0, 
        titlePos: { x: 0, y: 0 },
        contentPos: { x: 0, y: 0 },
        imagePos: { x: 0, y: 0 },
        textAlign: 'center',
        fontPair: selectedFontPair 
      }));

      setSlides(newSlides);
      if (newSlides.length > 0) setSelectedSlideId(newSlides[0].id);

      setLoadingMessage('Rendering illustrations...');
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
        setSlides(prev => prev.map(s => s.id === updatedSlides[i].id ? { ...s, imageBase64: base64, isGeneratingImage: false } : s));
      } catch (e) {
        console.error(`Failed to generate image for slide ${i}`, e);
        setSlides(prev => prev.map(s => s.id === updatedSlides[i].id ? { ...s, isGeneratingImage: false } : s));
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

    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isGeneratingImage: true } : s));
    const effectiveStyle = getEffectiveStyle();

    try {
      const base64 = await generateSlideImage(slide.imagePrompt, effectiveStyle);
      setSlides(prev => prev.map(s => s.id === slideId ? { ...s, imageBase64: base64, isGeneratingImage: false } : s));
    } catch (error) {
       console.error(error);
       setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isGeneratingImage: false } : s));
    }
  };

  const handleSlideContentUpdate = (id: string, newContent: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, content: newContent } : s));
  };

  const handleSlideTitleUpdate = (id: string, newTitle: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  // --- Typography & Updates ---

  const handleFontChange = (id: string, fontPairName: string) => {
    let fontPair: FontPair;
    if (fontPairName === 'Custom Typography') {
      fontPair = {
        name: 'Custom',
        title: customTitleFont,
        body: customBodyFont
      };
    } else {
      fontPair = FONT_PAIRS.find(f => f.name === fontPairName) || FONT_PAIRS[0];
    }
    setSlides(prev => prev.map(s => s.id === id ? { ...s, fontPair } : s));
  };

  // Update Font Pairs when Custom Selections Change
  useEffect(() => {
    if (selectedFontPairName === 'Custom Typography') {
       // Update all slides that are set to Custom
       setSlides(prev => prev.map(s => {
         if (s.fontPair.name === 'Custom') {
           return {
             ...s,
             fontPair: {
               name: 'Custom',
               title: customTitleFont,
               body: customBodyFont
             }
           }
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

     setLoadingMessage('Rewriting text...');
     setIsGenerating(true);

     try {
       const newText = await paraphraseText(originalText);
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

  const handleImageScaleUpdate = (id: string, scale: number) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, imageScale: scale } : s));
  };

  const handlePositionUpdate = (id: string, element: SlideElement, axis: 'x' | 'y', value: number) => {
    if (!element) return;
    setSlides(prev => prev.map(s => {
      if (s.id !== id) return s;
      const propName = element === 'title' ? 'titlePos' : element === 'content' ? 'contentPos' : 'imagePos';
      return {
        ...s,
        [propName]: { ...s[propName], [axis]: value }
      };
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

  const handleTextAlignUpdate = (id: string, align: 'left' | 'center' | 'right') => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, textAlign: align } : s));
  };

  // --- Image Upload & Chat Handlers ---

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setPendingImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault(); 
        }
      }
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
     // Insert into chat at cursor position
     const currentPos = cursorPosition ?? chatInput.length;
     const newText = chatInput.slice(0, currentPos) + emojiData.emoji + chatInput.slice(currentPos);
     setChatInput(newText);
     setCursorPosition(currentPos + emojiData.emoji.length);
     setShowEmojiPicker(false);
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
    setShowEmojiPicker(false);
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg, image: uploadedImage || undefined }]);

    if (!selectedSlideId) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Please select a slide to edit content or modify images." }]);
      return;
    }

    const currentSlide = slides.find(s => s.id === selectedSlideId);
    if (!currentSlide) return;

    // Logic: Image Selection
    if (selectedElement === 'image' || uploadedImage) {
      if (uploadedImage) {
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { 
          ...s, imageBase64: uploadedImage, isGeneratingImage: false 
        } : s));
        if (!userMsg.trim()) {
          setChatHistory(prev => [...prev, { role: 'model', text: "I've replaced the image." }]);
          return;
        }
      }
      if (userMsg.trim()) {
        if (!currentSlide.imageBase64 && !uploadedImage) {
          setLoadingMessage('Generating image...');
          setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: true } : s));
          try {
            const newImage = await generateSlideImage(userMsg, effectiveStyle);
            setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, imageBase64: newImage, isGeneratingImage: false } : s));
            setChatHistory(prev => [...prev, { role: 'model', text: "I've generated a new image." }]);
          } catch (err) {
            setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: false } : s));
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

    // Logic: Text Selection
    if (selectedElement === 'title' || selectedElement === 'content') {
      if (!userMsg.trim()) return;
      const currentText = selectedElement === 'title' ? currentSlide.title : currentSlide.content;
      setChatHistory(prev => [...prev, { role: 'model', text: `Updating the ${selectedElement}...` }]);
      try {
        const newText = await updateSpecificSlideField(currentText, selectedElement, userMsg);
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, [selectedElement]: newText } : s));
        setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: `I've updated the ${selectedElement}.` }]);
      } catch (err) {
         setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Error updating text." }]);
      }
      return;
    }

    // Logic: General Update
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
        const updatedContent = await updateSlideContent(currentSlide, userMsg);
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
    setLoadingMessage('Exporting Optimized PDF...');
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
    setLoadingMessage('Zipping Images...');
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
    if (selectedElement === 'title') return "Rewrite title...";
    if (selectedElement === 'content') return "Rewrite body...";
    if (selectedElement === 'image') return "Describe changes...";
    return "Type instructions...";
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
      
      {/* --- MODALS --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-3 text-gray-900">
                 <div className="p-2 bg-red-100 rounded-full text-red-600">
                   <AlertCircle className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-bold">Start New Carousel?</h3>
               </div>
               <p className="text-gray-600 text-sm leading-relaxed">
                 This action will <span className="font-bold text-gray-800">delete your current work</span> and reset all slides. This cannot be undone.
               </p>
               <div className="flex justify-end gap-3 mt-2">
                 <button 
                   onClick={() => setShowResetConfirm(false)}
                   className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={performReset}
                   className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-200 transition-colors"
                 >
                   Yes, Create New
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border-l-4 border-red-500">
             <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                   <AlertCircle className="w-5 h-5 text-red-500" />
                   Error
                 </h3>
                 <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-gray-600">
                   <X className="w-5 h-5" />
                 </button>
               </div>
               <p className="text-gray-600 text-sm leading-relaxed">
                 {errorMessage}
               </p>
               <div className="flex justify-end mt-2">
                 <button 
                   onClick={() => setErrorMessage(null)}
                   className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                 >
                   Dismiss
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}


      {/* UNIFIED LEFT SIDEBAR */}
      <div 
        className={`bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-300 relative shadow-xl overflow-hidden
          ${isSidebarOpen ? 'w-96 opacity-100' : 'w-0 opacity-0'}`}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 min-w-[24rem]">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="text-blue-600 w-5 h-5" />
            CarrouselGenerator
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={resetTour} 
              className={`p-1.5 rounded-full transition-colors ${showTour ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
              title={showTour ? "Guided Tour Active" : "Start Guided Tour"}
            >
              <CircleHelp className="w-4 h-4" />
            </button>
            {/* Save Status Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-[10px] font-medium text-gray-500" title="Your settings are saved automatically">
               {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
               {saveStatus === 'saved' && <Check className="w-3 h-3 text-green-500" />}
               {saveStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
               {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}
            </div>
          </div>
        </div>

        {slides.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-in fade-in duration-300 min-w-[24rem]">
            <div className="space-y-4 relative">
              
              {/* CONTENT MODE TOGGLE WITH TOOLTIPS */}
              <div className="flex items-center p-1 bg-gray-100 rounded-lg relative">
                <div className="relative group/mode flex-1">
                   <button 
                    onClick={() => setContentMode('generate')}
                    className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${contentMode === 'generate' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    AI Generation
                  </button>
                </div>

                <div className="relative group/mode flex-1">
                  <button 
                    onClick={() => setContentMode('literal')}
                    className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${contentMode === 'literal' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Literal Input
                  </button>
                </div>
              </div>

              {/* Step 1: Topic */}
              <div className="relative">
                <label className="text-sm font-bold text-gray-800 block">
                  {contentMode === 'generate' ? 'Topic or Description' : 'Slide Content (Literal)'}
                </label>
                <textarea
                  className={`w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:outline-none resize-none h-32 transition-all text-sm leading-relaxed ${contentMode === 'generate' ? 'focus:ring-blue-500' : 'focus:ring-purple-500'}`}
                  placeholder={contentMode === 'generate' ? "e.g. 5 Tips for Remote Work Leadership..." : "Slide 1: [Title] - [Content]\nSlide 2: [Title] - [Content]"}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isGenerating}
                />
                {showTour && currentTourStep === 0 && (
                  <TourPopover 
                    step={0} 
                    totalSteps={7}
                    title="Step 1: Define Topic" 
                    content="Start here! Describe your carousel topic or paste your content."
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    onSkip={handleSkipTour}
                    position="right"
                  />
                )}
              </div>
              
              {contentMode === 'literal' && (
                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> 
                  AI will use your text exactly as typed.
                </p>
              )}

              {/* Step 2: Visual Style */}
              <div className="space-y-2 relative">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-blue-600" />
                  Visual Style
                </label>
                
                <div className="relative">
                  <select 
                    value={imageStyle} 
                    onChange={(e) => setImageStyle(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm appearance-none cursor-pointer"
                    disabled={isGenerating}
                  >
                    {STYLE_PRESETS.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                
                {imageStyle === 'Custom Style' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mt-2 mb-1">
                      <PenTool className="w-3 h-3 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-700">Custom Style Prompt</span>
                    </div>
                    <textarea
                      value={customStylePrompt}
                      onChange={(e) => setCustomStylePrompt(e.target.value)}
                      className="w-full p-3 bg-purple-50 border border-purple-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm resize-none h-20"
                      placeholder="e.g. Pixel art characters in a neon city, synthwave colors..."
                      disabled={isGenerating}
                    />
                  </div>
                )}
                
                {showTour && currentTourStep === 1 && (
                  <TourPopover 
                    step={1} 
                    totalSteps={7}
                    title="Step 2: Visual Style" 
                    content="Choose the artistic vibe. Corporate, Neon, Minimalist, etc."
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    onSkip={handleSkipTour}
                    position="right"
                  />
                )}
              </div>

              {/* Step 3: Typography */}
              <div className="space-y-2 relative">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <TypeIcon className="w-4 h-4 text-blue-600" />
                  Typography Style
                </label>
                <div className="relative">
                  <select 
                    value={selectedFontPairName} 
                    onChange={(e) => setSelectedFontPairName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm appearance-none cursor-pointer"
                    disabled={isGenerating}
                  >
                    {FONT_PAIRS.map(font => (
                      <option key={font.name} value={font.name}>
                        {font.name} ({font.title.split(',')[0].replace(/'/g, '')} + {font.body.split(',')[0].replace(/'/g, '')})
                      </option>
                    ))}
                    <option value="Custom Typography">Custom Typography</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {selectedFontPairName === 'Custom Typography' && (
                   <div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Title Font</label>
                        <select 
                          value={customTitleFont} 
                          onChange={(e) => setCustomTitleFont(e.target.value)}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                        >
                          {AVAILABLE_FONTS.map(f => (
                            <option key={f.name} value={f.value}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Body Font</label>
                        <select 
                          value={customBodyFont} 
                          onChange={(e) => setCustomBodyFont(e.target.value)}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                        >
                          {AVAILABLE_FONTS.map(f => (
                            <option key={f.name} value={f.value}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                   </div>
                )}

                {showTour && currentTourStep === 2 && (
                  <TourPopover 
                    step={2} 
                    totalSteps={7}
                    title="Step 3: Typography" 
                    content="Select font pairings that match your brand voice."
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    onSkip={handleSkipTour}
                    position="right"
                  />
                )}
              </div>

              {/* Step 4: Palette */}
              <div className="space-y-2 relative">
                 <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <PaletteIcon className="w-4 h-4 text-blue-600" />
                      Color Palette
                    </label>
                 </div>
                 
                 <div className="relative">
                    <button
                      onClick={() => setIsPaletteDropdownOpen(!isPaletteDropdownOpen)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-left"
                      disabled={isGenerating}
                    >
                       <div className="flex items-center gap-3">
                         {/* Visual Preview of Currently Selected Colors */}
                         <div className="flex -space-x-1 shrink-0">
                             <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.background }} />
                             <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.text }} />
                             <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.accent }} />
                         </div>
                         <span className="text-sm text-gray-700 font-medium truncate">{palettePresetName}</span>
                       </div>
                       <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isPaletteDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isPaletteDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-200">
                         {PALETTE_PRESETS.map((preset) => (
                           <button
                             key={preset.name}
                             onClick={() => handlePalettePresetChange(preset.name)}
                             className="w-full p-2 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left group/item"
                           >
                              <div className="flex -space-x-1 shrink-0">
                                {preset.palette ? (
                                   <>
                                     <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.palette.background }} />
                                     <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.palette.text }} />
                                     <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.palette.accent }} />
                                   </>
                                ) : (
                                   <div className="w-4 h-4 rounded-full border border-gray-200 bg-gradient-to-br from-red-400 to-blue-500" />
                                )}
                              </div>
                              <span className={`text-sm flex-1 ${palettePresetName === preset.name ? 'font-bold text-blue-600' : 'text-gray-700 group-hover/item:text-gray-900'}`}>
                                {preset.name}
                              </span>
                              {palettePresetName === preset.name && <Check className="w-3 h-3 text-blue-600" />}
                           </button>
                         ))}
                      </div>
                    )}
                    
                    {/* Transparent backdrop to close dropdown on click outside */}
                    {isPaletteDropdownOpen && (
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsPaletteDropdownOpen(false)} />
                    )}
                 </div>

                 {/* Custom Colors - Only show if Custom is selected */}
                 {palettePresetName === 'Custom Palette' && (
                   <div className="grid grid-cols-2 gap-4 mt-3 animate-in fade-in slide-in-from-top-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                     {(Object.keys(palette) as Array<keyof Palette>).map((key) => (
                        <div key={key} className="flex flex-col gap-1 group/palette relative">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400">{key}</span>
                            <div className="relative group/tooltip">
                              <Info className="w-3 h-3 text-gray-300 hover:text-blue-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 text-center shadow-lg">
                                {getPaletteTooltip(key)}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <input 
                              type="color" 
                              value={palette[key]} 
                              onChange={(e) => setPalette(prev => ({...prev, [key]: e.target.value}))}
                              className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                            />
                            <span className="text-xs text-gray-600 font-mono">{palette[key]}</span>
                          </div>
                        </div>
                     ))}
                   </div>
                 )}
                 
                {showTour && currentTourStep === 3 && (
                  <TourPopover 
                    step={3} 
                    totalSteps={7}
                    title="Step 4: Color Palette" 
                    content="Pick brand colors. Use presets or define your own."
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    onSkip={handleSkipTour}
                    position="right"
                  />
                )}
              </div>

              {/* Step 5: Generate */}
              <div className="relative">
                <button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || isGenerating || (imageStyle === 'Custom Style' && !customStylePrompt.trim())}
                  className={`w-full py-3.5 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 mt-4 ${
                    contentMode === 'generate' 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  {contentMode === 'generate' ? 'Generate Carousel' : 'Format Slides'}
                </button>

                {showTour && currentTourStep === 4 && (
                  <TourPopover 
                    step={4} 
                    totalSteps={7}
                    title="Step 5: Generate" 
                    content="Click to build! Don't worry, you can edit content and images after generation."
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    onSkip={handleSkipTour}
                    position="top"
                  />
                )}
              </div>
            </div>

            {/* Bottom Section - Empty since Palette Moved */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
               {/* Could add other footer items here if needed */}
            </div>
          </div>
        ) : (
          <>
            {/* Chat History Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 min-w-[24rem]">
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Editor Assistant Active</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {selectedElement 
                        ? `Editing: ${selectedElement.toUpperCase()}. Use sidebar to rewrite or adjust.`
                        : "Select any text or image on the slide to edit it."}
                    </p>
                  </div>
                </div>

                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm space-y-2 shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                      }`}>
                        {msg.image && (
                            <img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg border border-white/20" />
                        )}
                        {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                      </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* NEW: FINE TUNING CONTROLS */}
            {currentSlide && (
              <div className="p-4 bg-white border-t border-gray-200 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
                    {selectedElement ? <Move className="w-3 h-3 text-blue-600" /> : <TypeIcon className="w-3 h-3 text-blue-600" />}
                    {selectedElement ? "Element Tuning" : "Slide Typography"}
                  </h3>
                  {selectedElement && (
                    <button 
                      onClick={() => handleResetPosition(currentSlide.id, selectedElement)}
                      className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                      title="Reset Position"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Pos
                    </button>
                  )}
                </div>

                {/* Typography Selector (Show if no element selected OR text selected) */}
                {(!selectedElement) && (
                  <div className="mb-4">
                     <label className="text-xs font-semibold text-gray-600 mb-1 block">Font Pairing</label>
                     <div className="grid grid-cols-2 gap-2">
                       {FONT_PAIRS.map(font => (
                         <button
                           key={font.name}
                           onClick={() => handleFontChange(currentSlide.id, font.name)}
                           className={`text-xs p-2 border rounded-lg text-left transition-all ${
                             currentSlide.fontPair?.name === font.name 
                             ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium shadow-sm' 
                             : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                           }`}
                         >
                           {font.name}
                         </button>
                       ))}
                     </div>
                  </div>
                )}

                {/* Text Editing Tools (Paraphrase & Emoji for Text) */}
                {(selectedElement === 'title' || selectedElement === 'content') && (
                   <div className="grid grid-cols-1 gap-2 mb-3">
                      <button
                        onClick={() => handleParaphrase(currentSlide.id, selectedElement)}
                        disabled={isGenerating}
                        className="flex items-center justify-center gap-2 p-2.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 border border-purple-100 transition-colors"
                      >
                         <Wand2 className="w-3.5 h-3.5" /> 
                         AI Rewrite Text
                      </button>
                      {/* Removed Duplicate Emoji Button */}
                   </div>
                )}

                {/* Position Controls */}
                {selectedElement && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono uppercase">Pos X</div>
                        <input 
                          type="range" min="-400" max="400" step="5" 
                          value={currentPos.x}
                          onChange={(e) => handlePositionUpdate(currentSlide.id, selectedElement, 'x', parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono uppercase">Pos Y</div>
                        <input 
                          type="range" min="-400" max="400" step="5" 
                          value={currentPos.y}
                          onChange={(e) => handlePositionUpdate(currentSlide.id, selectedElement, 'y', parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                {/* Image Specific */}
                {selectedElement === 'image' && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500 mb-1 font-mono">
                      <span>Scale</span>
                      <span>{Math.round((currentSlide.imageScale || 1) * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="1.5" step="0.05" 
                      value={currentSlide.imageScale || 1}
                      onChange={(e) => handleImageScaleUpdate(currentSlide.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}

                {/* Text Alignment */}
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
            <div className="p-4 bg-white border-t border-gray-200 min-w-[24rem] relative">
                {/* Tooltip for Chat */}
                <div className="flex items-center gap-1.5 mb-2 px-1 opacity-80 hover:opacity-100 transition-opacity cursor-help">
                   <HelpCircle className="w-3 h-3 text-blue-500" />
                   <p className="text-[10px] text-gray-500 font-medium">
                      Select any element (Text or Image) on the slide and type here to change it.
                   </p>
                </div>

                {/* Step 7: Chat AI */}
                {showTour && currentTourStep === 6 && (
                  <TourPopover 
                    step={6} 
                    totalSteps={7}
                    title="AI Assistant" 
                    content="Type here to rewrite selected text or regenerate images instantly."
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    onSkip={handleSkipTour}
                    position="top"
                  />
                )}

                {pendingImage && (
                  <div className="mb-3 flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100 animate-in slide-in-from-bottom-2">
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-white">
                        <img src={pendingImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs text-blue-700 flex-1 truncate font-medium">Image attached</span>
                      <button onClick={() => setPendingImage(null)} className="p-1 hover:bg-blue-100 rounded-full text-blue-700">
                        <X className="w-4 h-4" />
                      </button>
                  </div>
                )}
                
                {showEmojiPicker && (
                  <div className="absolute bottom-20 left-4 z-50 animate-in slide-in-from-bottom-5">
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick}
                      theme={Theme.LIGHT}
                      width={300}
                      height={400}
                    />
                  </div>
                )}

                <form onSubmit={handleChatSubmit} className="relative flex items-center gap-2">
                  <div className="flex gap-1">
                    <button 
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-3 rounded-xl transition-colors ${showEmojiPicker ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                        title="Add Emoji"
                    >
                        <Smile className="w-5 h-5" />
                    </button>
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Attach Image"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="relative flex-1">
                    <input
                        ref={chatInputRef}
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
                        onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)}
                        onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart)}
                        onPaste={handlePaste}
                        onFocus={() => {
                          if (!selectedElement) setShowEmojiPicker(false)
                        }} 
                        placeholder={getChatPlaceholder()}
                        className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={(!chatInput.trim() && !pendingImage) || isGenerating}
                    className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors shadow-sm"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </form>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-3 min-w-[24rem]">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExportPDF} disabled={isGenerating} className="py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                   {isGenerating && loadingMessage.includes('PDF') ? <Loader2 className="animate-spin w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                   Export PDF
                 </button>
                 <button onClick={handleExportZIP} disabled={isGenerating} className="py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                   {isGenerating && loadingMessage.includes('ZIP') ? <Loader2 className="animate-spin w-4 h-4" /> : <Images className="w-4 h-4" />}
                   Export Images
                 </button>
              </div>

               <button onClick={handleCreateNew} disabled={isGenerating} className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                 <PlusCircle className="w-4 h-4" />
                 Create New
               </button>
            </div>
          </>
        )}
      </div>

      {/* MAIN PREVIEW AREA */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col h-full">
        {/* NEW TOP BAR */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 h-16 flex items-center justify-between shadow-sm z-20 shrink-0">
          <div className="flex-1 flex items-center">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
              </button>
          </div>

          <div className="flex items-center gap-4">
             {slides.length > 0 && (
                <>
                  <button onClick={handlePrevSlide} disabled={!selectedSlideId || slides.findIndex(s => s.id === selectedSlideId) === 0} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors text-gray-700">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold text-gray-700 min-w-[3rem] text-center select-none font-mono">
                    {selectedSlideId ? `${slides.findIndex(s => s.id === selectedSlideId) + 1} / ${slides.length}` : '-'}
                  </span>
                  <button onClick={handleNextSlide} disabled={!selectedSlideId || slides.findIndex(s => s.id === selectedSlideId) === slides.length - 1} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors text-gray-700">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
             )}
          </div>

          <div className="flex-1 flex justify-end items-center">
            {isGenerating && (
              <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full flex items-center gap-2 font-medium animate-pulse">
                <Loader2 className="animate-spin w-3 h-3" />
                {loadingMessage || 'Working...'}
              </span>
            )}
          </div>
        </div>

        {/* Slides Container */}
        <div 
          className={`flex-1 overflow-x-auto overflow-y-hidden p-8 flex items-center gap-12 snap-x snap-mandatory relative ${isGenerating ? 'pointer-events-none opacity-50' : ''}`}
          ref={slidesContainerRef}
          onClick={() => setSelectedElement(null)}
        >
           {/* Step 6: Preview Interaction */}
           {showTour && currentTourStep === 5 && slides.length > 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
                 <TourPopover 
                    step={5} 
                    totalSteps={7}
                    title="Interactive Preview" 
                    content="Click any text or image on the slide to select it for editing."
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    onSkip={handleSkipTour}
                    position="bottom"
                  />
              </div>
           )}

           {slides.length === 0 ? (
             <div className="w-full flex flex-col items-center justify-center text-gray-400 gap-6 animate-in zoom-in-95 duration-500">
               <div className="w-32 h-32 rounded-3xl bg-white shadow-sm border border-gray-200 flex items-center justify-center">
                 <Sparkles className="w-12 h-12 text-blue-100" />
               </div>
               <div className="text-center">
                 <h3 className="text-lg font-semibold text-gray-600">Start Creating</h3>
                 <p className="text-sm text-gray-400 mt-1">Use the sidebar to generate your first carousel</p>
               </div>
             </div>
           ) : (
             slides.map((slide) => (
               <div key={slide.id} className="flex-shrink-0 snap-center">
                  <SlideView 
                    id={slide.id}
                    slide={slide}
                    palette={palette}
                    isSelected={selectedSlideId === slide.id}
                    selectedElement={selectedSlideId === slide.id ? selectedElement : null}
                    onSelect={() => setSelectedSlideId(slide.id)}
                    onElementSelect={(el) => {
                      setSelectedSlideId(slide.id);
                      setSelectedElement(el);
                      if (!isSidebarOpen) setIsSidebarOpen(true); 
                    }}
                    onRegenerateImage={(e) => handleRegenerateImage(e, slide.id)}
                    onTitleChange={(newTitle) => handleSlideTitleUpdate(slide.id, newTitle)}
                    onContentChange={(newContent) => handleSlideContentUpdate(slide.id, newContent)}
                    isEditable={true}
                    scale={0.36} 
                  />
                  {/* Hidden Render for PDF */}
                  <div className="absolute top-0 -left-[9999px] -z-50 pointer-events-none">
                     <div id={`slide-render-${slide.id}`}>
                        <SlideView 
                           slide={slide}
                           palette={palette}
                           isSelected={false}
                           onSelect={() => {}}
                           onRegenerateImage={() => {}}
                           isEditable={false} 
                           isExport={true} 
                           scale={1} 
                        />
                     </div>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

export default App;