import React from 'react';
import { Slide, Palette, SlideElement } from '../types';
import { RefreshCw, Image as ImageIcon } from 'lucide-react';

interface SlideViewProps {
  slide: Slide;
  palette: Palette;
  isSelected: boolean;
  selectedElement?: SlideElement;
  onSelect: () => void;
  onElementSelect?: (element: SlideElement) => void;
  onRegenerateImage: (e: React.MouseEvent) => void;
  onTitleChange?: (newTitle: string) => void;
  onContentChange?: (newContent: string) => void;
  isEditable?: boolean;
  isExport?: boolean; 
  scale?: number;
  id?: string;
}

export const SlideView: React.FC<SlideViewProps> = ({ 
  slide, 
  palette, 
  isSelected, 
  selectedElement = null,
  onSelect, 
  onElementSelect,
  onRegenerateImage,
  onTitleChange,
  onContentChange,
  isEditable = false,
  isExport = false,
  scale = 1,
  id
}) => {
  // 1080 x 1350 is the target.
  const width = 1080;
  const height = 1350;

  // Helper to handle element clicks
  const handleElementClick = (e: React.MouseEvent, element: SlideElement) => {
    e.stopPropagation(); 
    onSelect();
    if (onElementSelect) {
      onElementSelect(element);
    }
  };

  // Helper to render text with highlighting
  const renderRichText = (text: string, isTitle: boolean = false) => {
    if (!text) return null;
    
    const cleanText = text.replace(/\\n/g, '\n');
    // Regex splits text by **highlight** OR [[box]]
    const parts = cleanText.split(/(\*\*[\s\S]*?\*\*|\[\[[\s\S]*?\]\])/g);
    
    return parts.map((part, i) => {
      // HIGHLIGHTED TEXT (**text**) -> Solid Color Block (No strikethrough look)
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={i} style={{ 
            backgroundColor: palette.title, // Solid Orange background
            color: palette.body, // Dark text for contrast (matches "Quiebre" screenshot)
            padding: '0 0.15em', // Tight padding to frame the text
            borderRadius: '0.1em', // Slight aesthetic rounding
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
            display: 'inline', // Keeps flow natural but allows background
          }}>
            {part.slice(2, -2)}
          </span>
        );
      }
      
      // BOXED TEXT ([[text]]) -> Blue Pill Button Style
      // "NO DEBE ESTAR ADEMAS SUBRAYADO" -> Explicit styling ensures no overlap
      if (part.startsWith('[[') && part.endsWith(']]')) {
        return (
          <span key={i} className="inline-block" style={{ 
            backgroundColor: palette.accent, // Blue Background
            color: '#ffffff', // White Text
            padding: '0.25em 0.8em',
            borderRadius: '999px', // Full pill shape
            fontWeight: '600',
            fontSize: '0.80em', // Slightly smaller
            verticalAlign: 'middle',
            margin: '0 0.2em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            textDecoration: 'none', // Force removal of any inherited decorations
            border: 'none'
          }}>
            {part.slice(2, -2)}
          </span>
        );
      }

      return <span key={i}>{part}</span>;
    });
  };

  // Common Image Component - Floating Style (No border, clean)
  const SlideImage = () => (
    <div 
      className={`w-full h-full relative group/image flex items-center justify-center transition-all duration-200 
        ${selectedElement === 'image' && !isExport ? 'ring-4 ring-blue-500 ring-offset-4' : ''}`}
      onClick={(e) => handleElementClick(e, 'image')}
    >
      {slide.isGeneratingImage ? (
        <div className="w-full h-full flex items-center justify-center animate-pulse bg-gray-50 rounded-3xl">
          <ImageIcon className="w-24 h-24 text-gray-300" />
        </div>
      ) : slide.imageBase64 ? (
          <div className="relative w-full h-full flex items-center justify-center">
             {/* Image container with no overflow hidden to allow "floating" feel if transparent PNG */}
            <img 
              src={slide.imageBase64.startsWith('data:') ? slide.imageBase64 : `data:image/png;base64,${slide.imageBase64}`} 
              alt="Slide visual" 
              className="max-w-full max-h-full object-contain drop-shadow-xl" // Contain + Drop Shadow for vector feel
            />
            {!isExport && (
              <div 
                className={`absolute inset-0 flex items-center justify-center transition-opacity cursor-pointer z-10
                  ${selectedElement === 'image' ? 'opacity-100' : 'opacity-0 group-hover/image:opacity-100'}`}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onRegenerateImage(e); }}
                  className="bg-white/90 backdrop-blur text-gray-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg border border-gray-200 hover:bg-white transform scale-90 hover:scale-100 transition-transform"
                >
                    <RefreshCw className="w-5 h-5" /> Regenerate
                </button>
              </div>
            )}
          </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-2 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <ImageIcon className="w-16 h-16 opacity-50" />
            <span>Select to Add Image</span>
        </div>
      )}
    </div>
  );

  const getElementStyle = (element: SlideElement) => {
    if (!isEditable || isExport) return {};
    return selectedElement === element 
      ? { outline: '4px solid #3b82f6', outlineOffset: '8px', borderRadius: '4px', cursor: 'text' }
      : { cursor: 'pointer' };
  };

  const renderContent = () => {
    switch (slide.layout) {
      case 'text-only':
        return (
          <div className="flex-1 flex flex-col justify-center items-center p-20 gap-16 text-center">
             <div 
               className="w-full"
               style={getElementStyle('title')}
               onClick={(e) => handleElementClick(e, 'title')}
             >
                <h2 
                  className="text-9xl font-bold leading-[1.15] outline-none whitespace-pre-line tracking-tight"
                  style={{ color: palette.body, fontFamily: "'Space Grotesk', sans-serif" }} // Main text is dark blue
                  contentEditable={isEditable && selectedElement === 'title'}
                  suppressContentEditableWarning
                  onBlur={(e) => onTitleChange?.(e.currentTarget.innerText)}
                >
                  {renderRichText(slide.title, true)}
                </h2>
             </div>
             <div
               className="w-full max-w-4xl"
               style={getElementStyle('content')}
               onClick={(e) => handleElementClick(e, 'content')}
             >
                <div 
                  className="text-6xl leading-relaxed font-medium text-gray-600 outline-none whitespace-pre-line"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  contentEditable={isEditable && selectedElement === 'content'}
                  suppressContentEditableWarning
                  onBlur={(e) => onContentChange?.(e.currentTarget.innerText)}
                >
                  {renderRichText(slide.content)}
                </div>
             </div>
          </div>
        );
      
      case 'text-image-text':
          return (
            <div className="flex-1 flex flex-col h-full p-16 gap-10">
              {/* Top Text (Title) */}
              <div className="flex-none pt-8 flex justify-center items-center text-center" style={getElementStyle('title')} onClick={(e) => handleElementClick(e, 'title')}>
                <h2 
                  className="text-7xl font-bold leading-tight outline-none whitespace-pre-line max-w-4xl"
                  style={{ color: palette.body, fontFamily: "'Space Grotesk', sans-serif" }}
                  contentEditable={isEditable && selectedElement === 'title'}
                  suppressContentEditableWarning
                  onBlur={(e) => onTitleChange?.(e.currentTarget.innerText)}
                >
                  {renderRichText(slide.title, true)}
                </h2>
              </div>
              
              {/* Middle Image - Centered and Large */}
              <div className="flex-1 min-h-0 w-full px-4 flex justify-center">
                 <div className="w-full h-full">
                   <SlideImage />
                 </div>
              </div>

              {/* Bottom Text (Content) */}
              <div className="flex-none pb-8 flex justify-center text-center" style={getElementStyle('content')} onClick={(e) => handleElementClick(e, 'content')}>
                <div 
                  className="text-5xl leading-relaxed font-medium text-gray-600 outline-none whitespace-pre-line max-w-3xl"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  contentEditable={isEditable && selectedElement === 'content'}
                  suppressContentEditableWarning
                  onBlur={(e) => onContentChange?.(e.currentTarget.innerText)}
                >
                  {renderRichText(slide.content)}
                </div>
              </div>
            </div>
          );

      case 'image-top':
        return (
          <div className="flex-1 flex flex-col h-full">
            <div className="h-[50%] w-full p-12 pb-4 flex justify-center items-end">
               <div className="w-[90%] h-[90%]">
                 <SlideImage />
               </div>
            </div>
            <div className="h-[50%] w-full p-16 flex flex-col gap-10 justify-start items-center text-center">
              <div className="w-full" style={getElementStyle('title')} onClick={(e) => handleElementClick(e, 'title')}>
                <h2 
                  className="text-7xl font-bold leading-tight outline-none whitespace-pre-line"
                  style={{ color: palette.body, fontFamily: "'Space Grotesk', sans-serif" }}
                  contentEditable={isEditable && selectedElement === 'title'}
                  suppressContentEditableWarning
                  onBlur={(e) => onTitleChange?.(e.currentTarget.innerText)}
                >
                  {renderRichText(slide.title, true)}
                </h2>
              </div>
              <div className="w-full max-w-3xl" style={getElementStyle('content')} onClick={(e) => handleElementClick(e, 'content')}>
                <div 
                  className="text-5xl leading-relaxed font-medium text-gray-600 outline-none whitespace-pre-line"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  contentEditable={isEditable && selectedElement === 'content'}
                  suppressContentEditableWarning
                  onBlur={(e) => onContentChange?.(e.currentTarget.innerText)}
                >
                  {renderRichText(slide.content)}
                </div>
              </div>
            </div>
          </div>
        );

      case 'image-bottom':
      default:
        return (
          <div className="flex-1 flex flex-col h-full">
            <div className="h-[45%] w-full p-16 flex flex-col gap-10 justify-end items-center text-center">
              <div className="w-full" style={getElementStyle('title')} onClick={(e) => handleElementClick(e, 'title')}>
                <h2 
                  className="text-7xl font-bold leading-tight outline-none whitespace-pre-line"
                  style={{ color: palette.body, fontFamily: "'Space Grotesk', sans-serif" }}
                  contentEditable={isEditable && selectedElement === 'title'}
                  suppressContentEditableWarning
                  onBlur={(e) => onTitleChange?.(e.currentTarget.innerText)}
                >
                  {renderRichText(slide.title, true)}
                </h2>
              </div>
              <div className="w-full max-w-3xl" style={getElementStyle('content')} onClick={(e) => handleElementClick(e, 'content')}>
                <div 
                  className="text-5xl leading-relaxed font-medium text-gray-600 outline-none whitespace-pre-line"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  contentEditable={isEditable && selectedElement === 'content'}
                  suppressContentEditableWarning
                  onBlur={(e) => onContentChange?.(e.currentTarget.innerText)}
                >
                  {renderRichText(slide.content)}
                </div>
              </div>
            </div>
            <div className="h-[55%] w-full p-12 pt-4 flex justify-center items-start">
               <div className="w-[90%] h-[90%]">
                 <SlideImage />
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div 
      id={id}
      className={`relative group transition-all duration-300 ${isSelected && !isExport ? 'ring-4 ring-offset-2 ring-blue-500 shadow-xl' : isExport ? '' : 'shadow-md hover:shadow-lg'}`}
      style={{
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        cursor: isExport ? 'default' : 'pointer'
      }}
      onClick={(e) => {
        if (!isExport) {
          onSelect();
          if (onElementSelect) onElementSelect(null); 
        }
      }}
    >
      <div 
        className="w-full h-full flex flex-col overflow-hidden relative"
        style={{
          backgroundColor: '#FFFFFF', // Force white background for that clean corporate look
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${width}px`,
          height: `${height}px`
        }}
      >
        {/* Dynamic Content */}
        {renderContent()}
        
        {/* Removed Footer Dot as requested */}
      </div>
    </div>
  );
};