# Prompt for AI: Next.js/React Image Processor App

Add to this application an image processing functionality.

## Tech Stack
same as already used by this code

## Project Structure

```
/
├── app/
│   └── image-processor/
│       └── page.tsx             # Main entry point
├── components/
│   └── image-processor/        # Reusable feature components
│       ├── DropZone.tsx
│       ├── Controls.tsx
│       ├── CropTool.tsx
│       ├── ImagePreview.tsx
│       ├── Comparison.tsx
│       └── History.tsx
├── hooks/
│   └── use-image-processor.ts   # Core logic hook
├── lib/
│   └── image-utils.ts          # Canvas & Image utilities
└── types/
    └── image-processor.ts      # TypeScript interfaces
```

## Core Features Required

### 1. Drag & Drop Component (DropZone.tsx)
**Props Interface:**
```typescript
interface DropZoneProps {
  onImageLoad: (imageData: ImageData) => void;
  isLoading?: boolean;
}

interface ImageData {
  src: string;
  file: File;
  width: number;
  height: number;
  size: number;
}
```

**Requirements:**
- Large drop zone with visual states (default, hover, dragging)
- Support dragover, dragleave, drop events
- Click to browse alternative
- File type validation (images only)
- Show loading state while reading file
- Display thumbnail preview after load
- Use `useCallback` for event handlers

**Visual States:**
- Default: Dashed border, upload icon, instructions
- Dragging: Solid border, highlighted background, scale animation
- Loading: Spinner overlay
- Loaded: Show thumbnail, hide instructions

### 2. Image Processing Hook (useImageProcessor.ts)
**Return Interface:**
```typescript
interface UseImageProcessorReturn {
  originalImage: ImageData | null;
  currentImage: ImageData | null;
  processedImage: ProcessedImage | null;
  isProcessing: boolean;
  cropData: CropData | null;
  isCropping: boolean;
  history: HistoryItem[];

  // Actions
  loadImage: (file: File) => Promise<void>;
  resizeImage: (width: number, height: number, quality: number, format: ImageFormat) => Promise<void>;
  enableCrop: () => void;
  applyCrop: (cropData: CropData, quality: number, format: ImageFormat) => Promise<void>;
  cancelCrop: () => void;
  previewResult: () => Promise<void>;
  downloadImage: () => void;
  addToHistory: (action: string, details: string) => void;
  loadFromHistory: (index: number) => void;
}

interface ProcessedImage extends ImageData {
  compressionRatio: number;
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HistoryItem {
  id: string;
  action: string;
  details: string;
  thumbnail: string;
  timestamp: Date;
  imageData: ImageData;
}

type ImageFormat = 'jpeg' | 'png' | 'webp';
```

**Implementation Requirements:**
- Use `useState` for all state management
- Use `useRef` for canvas elements and image objects
- Use `useCallback` for all action functions
- Implement image loading with FileReader
- Canvas-based processing in separate utility functions
- LocalStorage for history persistence (optional)

### 3. Controls Component (Controls.tsx)
**Props Interface:**
```typescript
interface ControlsProps {
  originalDimensions: { width: number; height: number } | null;
  onResize: (width: number, height: number, quality: number, format: ImageFormat) => void;
  onCrop: () => void;
  onPreview: () => void;
  onDownload: () => void;
  isProcessing: boolean;
}
```

**Features:**
- Width/height inputs with number type
- "Maintain aspect ratio" checkbox (default: true)
- Quality slider (1-100) with visual percentage
- Format selection: JPEG, PNG, WebP (radio buttons or select)
- Real-time aspect ratio calculation
- Disable state during processing

**State Management:**
```typescript
const [width, setWidth] = useState<number>(840);
const [height, setHeight] = useState<number>(525);
const [quality, setQuality] = useState<number>(80);
const [format, setFormat] = useState<ImageFormat>('jpeg');
const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
```

### 4. Crop Tool Component (CropTool.tsx)
**Props Interface:**
```typescript
interface CropToolProps {
  imageSrc: string;
  onApply: (cropData: CropData) => void;
  onCancel: () => void;
  onReset: () => void;
}
```

**Requirements:**
- Display image with overlay
- Draggable crop selection rectangle
- Four corner handles for resizing (nw, ne, sw, se)
- Minimum size: 50×50 pixels
- Real-time position and size updates
- Visual indicators for crop area (white border, dark overlay)
- Scale coordinates relative to displayed vs actual image size
- Use `useRef` for DOM elements
- Use `useEffect` for event listeners (cleanup on unmount)

**Drag Logic:**
```typescript
const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize', handle?: string) => {
  // Start drag operation
}, []);

const handleMouseMove = useCallback((e: MouseEvent) => {
  // Update position during drag
}, []);

const handleMouseUp = useCallback(() => {
  // End drag operation
}, []);
```

### 5. Image Preview Component (ImagePreview.tsx)
**Props Interface:**
```typescript
interface ImagePreviewProps {
  imageSrc: string;
  title: string;
  size?: number;
  dimensions?: { width: number; height: number };
  compressionRatio?: number;
  isResult?: boolean;
}
```

**Features:**
- Display image with max constraints
- Show metadata badges (size, dimensions)
- Conditional compression ratio badge
- Loading state with skeleton
- Error handling for broken images

### 6. Comparison Component (Comparison.tsx)
**Props Interface:**
```typescript
interface ComparisonProps {
  originalSrc: string;
  processedSrc: string;
  originalDimensions: { width: number; height: number };
  processedDimensions: { width: number; height: number };
}
```

**Features:**
- Side-by-side layout (responsive: stack on mobile)
- Labels for "Original" and "Processed"
- Synchronized scrolling (optional)
- Image containers with borders

### 7. History Component (History.tsx)
**Props Interface:**
```typescript
interface HistoryProps {
  items: HistoryItem[];
  onSelect: (index: number) => void;
  onClear: () => void;
}
```

**Features:**
- Scrollable list (max 10 items)
- Thumbnail, action type, details, timestamp
- "Use This Version" button for each item
- Clear all button
- Empty state message
- Limit to last 10 operations

### 8. Main Page (page.tsx)
**Structure:**
```typescript
'use client'; // Must be client component for canvas access

import { useImageProcessor } from '@/hooks/useImageProcessor';
import { DropZone } from '@/components/DropZone';
import { Controls } from '@/components/Controls';
import { CropTool } from '@/components/CropTool';
import { ImagePreview } from '@/components/ImagePreview';
import { Comparison } from '@/components/Comparison';
import { History } from '@/components/History';

export default function ImageProcessorPage() {
  const {
    originalImage,
    currentImage,
    processedImage,
    isProcessing,
    isCropping,
    history,
    loadImage,
    resizeImage,
    enableCrop,
    applyCrop,
    cancelCrop,
    downloadImage,
    loadFromHistory,
  } = useImageProcessor();

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="text-blue-600">Image</span> Processor
          </h1>
          <p className="text-gray-600">Crop, Resize & Compress your images</p>
        </header>

        {/* Drop Zone */}
        <section className="mb-8">
          <DropZone onImageLoad={loadImage} isLoading={isProcessing} />
        </section>

        {/* Original Preview */}
        {originalImage && (
          <section className="mb-8">
            <ImagePreview
              imageSrc={originalImage.src}
              title="Original Image"
              size={originalImage.size}
              dimensions={{ width: originalImage.width, height: originalImage.height }}
            />
          </section>
        )}

        {/* Controls */}
        {originalImage && (
          <section className="mb-8">
            <Controls
              originalDimensions={{ width: originalImage.width, height: originalImage.height }}
              onResize={resizeImage}
              onCrop={enableCrop}
              onPreview={() => {}}
              onDownload={downloadImage}
              isProcessing={isProcessing}
            />
          </section>
        )}

        {/* Crop Tool */}
        {isCropping && currentImage && (
          <section className="mb-8">
            <CropTool
              imageSrc={currentImage.src}
              onApply={applyCrop}
              onCancel={cancelCrop}
              onReset={() => {}}
            />
          </section>
        )}

        {/* Result Preview */}
        {processedImage && (
          <section className="mb-8">
            <ImagePreview
              imageSrc={processedImage.src}
              title="Processed Image"
              size={processedImage.size}
              dimensions={{ width: processedImage.width, height: processedImage.height }}
              compressionRatio={processedImage.compressionRatio}
              isResult
            />
          </section>
        )}

        {/* Comparison */}
        {originalImage && processedImage && (
          <section className="mb-8">
            <Comparison
              originalSrc={originalImage.src}
              processedSrc={processedImage.src}
              originalDimensions={{ width: originalImage.width, height: originalImage.height }}
              processedDimensions={{ width: processedImage.width, height: processedImage.height }}
            />
          </section>
        )}

        {/* History */}
        {history.length > 0 && (
          <section className="mb-8">
            <History
              items={history}
              onSelect={loadFromHistory}
              onClear={() => {}}
            />
          </section>
        )}
      </div>
    </main>
  );
}
```

## Utility Functions (lib/image-utils.ts)

```typescript
export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const resizeImage = (
  sourceImage: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  quality: number,
  format: 'jpeg' | 'png' | 'webp'
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

  const mimeType = `image/${format}`;
  return canvas.toDataURL(mimeType, quality / 100);
};

export const cropImage = (
  sourceImage: HTMLImageElement,
  cropData: { x: number; y: number; width: number; height: number },
  quality: number,
  format: 'jpeg' | 'png' | 'webp'
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = cropData.width;
  canvas.height = cropData.height;

  ctx.drawImage(
    sourceImage,
    cropData.x, cropData.y, cropData.width, cropData.height,
    0, 0, cropData.width, cropData.height
  );

  const mimeType = `image/${format}`;
  return canvas.toDataURL(mimeType, quality / 100);
};

export const calculateAspectRatio = (
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): number => {
  const ratio = targetWidth / originalWidth;
  return Math.round(originalHeight * ratio);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const calculateCompressionRatio = (
  originalSize: number,
  processedSize: number
): number => {
  return Math.round(((originalSize - processedSize) / originalSize) * 100);
};
```

## Styling Requirements (Tailwind CSS)

### Color Scheme
- Primary: `blue-600` (#4a90e2)
- Success: `green-500` (#28a745)
- Background: `gray-50` (#f5f7fa)
- Cards: `white` with shadow
- Text: `gray-900` (headings), `gray-600` (body)

### Component Classes

**Drop Zone:**
```typescript
className={`
  border-3 border-dashed rounded-xl p-16 text-center cursor-pointer
  transition-all duration-300 ease-in-out
  ${isDragging ? 'border-blue-500 bg-blue-50 scale-102' : 'border-gray-300 bg-white hover:border-blue-400'}
`}
```

**Cards:**
```typescript
className="bg-white rounded-xl shadow-lg overflow-hidden"
```

**Buttons:**
```typescript
// Primary
className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"

// Secondary
className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-all duration-200"
```

**Form Inputs:**
```typescript
className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
```

**Range Slider:**
```typescript
className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
```

## Important Implementation Notes

### 1. Client-Side Only
```typescript
'use client'; // At top of page.tsx and all components using browser APIs

// For Canvas operations
const canvasRef = useRef<HTMLCanvasElement>(null);
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Canvas operations here
}, []);
```

### 2. Type Safety
- Define all interfaces in `types/index.ts`
- Use strict TypeScript configuration
- Avoid `any` types
- Properly type all event handlers

### 3. Performance
```typescript
// Memoize expensive calculations
const aspectRatio = useMemo(() => {
  return originalWidth / originalHeight;
}, [originalWidth, originalHeight]);

// Optimize re-renders
const handleResize = useCallback(() => {
  // Resize logic
}, [dependencies]);
```

### 4. Error Handling
```typescript
try {
  const image = await loadImageFromFile(file);
  setOriginalImage(image);
} catch (error) {
  console.error('Failed to load image:', error);
  toast.error('Failed to load image. Please try again.');
}
```

### 5. Accessibility
```typescript
// Proper labels
<label htmlFor="width-input">Width</label>
<input id="width-input" aria-label="Target width in pixels" />

// Keyboard navigation
<button onKeyDown={handleKeyDown} tabIndex={0}>

// ARIA attributes
<div role="region" aria-label="Image crop tool">
```

## Package Installation

Required dependencies:
```bash
npm install lucide-react
npm install clsx tailwind-merge
npm install @radix-ui/react-slider
npm install @radix-ui/react-radio-group
```

Dev dependencies (should be included):
- TypeScript
- Tailwind CSS
- ESLint
- Prettier

## Build Configuration

Ensure `next.config.js` allows static export if needed:
```javascript
const nextConfig = {
  output: 'export',
  distDir: 'dist',
}
module.exports = nextConfig
```

## Browser Compatibility
Must work with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Output Requirements

Provide the following files:
1. `app/page.tsx` - Main page
2. `app/layout.tsx` - Root layout
3. `app/globals.css` - Global styles with Tailwind
4. `app/components/DropZone.tsx`
5. `app/components/Controls.tsx`
6. `app/components/CropTool.tsx`
7. `app/components/ImagePreview.tsx`
8. `app/components/Comparison.tsx`
9. `app/components/History.tsx`
10. `app/hooks/useImageProcessor.ts`
11. `app/lib/image-utils.ts`
12. `app/lib/file-utils.ts`
13. `app/types/index.ts`
14. `package.json`
15. `tailwind.config.ts`
16. `tsconfig.json`
17. `README.md` with setup instructions

All components must be fully functional, typed, and styled with Tailwind CSS.

This new functionality will be accessed with a "Gestion Images" in the panel side.

The pieces of code are set to guide AI to enhance this md file
