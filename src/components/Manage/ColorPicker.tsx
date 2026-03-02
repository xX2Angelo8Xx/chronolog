import { useState, useRef, useCallback, useEffect } from 'react';
import { Input, tokens } from '@fluentui/react-components';
import { COLOR_PALETTE } from '@/utils/helpers';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, v];
}

function hsvToHex(h: number, s: number, v: number): string {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// COLOR_PALETTE rearranged in rainbow order
const RAINBOW_PALETTE = [
  '#e74856', '#da3b01', '#d83b01', '#ca5010',
  '#498205', '#107c10', '#038387',
  '#00b7c3', '#0078d4', '#4f6bed', '#8764b8',
  '#7719aa', '#b4009e', '#c239b3', '#e3008c',
  '#69797e',
];

// Validate that all COLOR_PALETTE colors are included
const _paletteSet = new Set(COLOR_PALETTE);
const _rainbowSet = new Set(RAINBOW_PALETTE);
if (![..._paletteSet].every((c) => _rainbowSet.has(c))) {
  console.warn('ColorPicker: RAINBOW_PALETTE is missing colors from COLOR_PALETTE');
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value || '#0078d4'));
  const [hexInput, setHexInput] = useState(value || '#0078d4');
  const satBrightRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [isDraggingSB, setIsDraggingSB] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  useEffect(() => {
    setHexInput(value);
    setHsv(hexToHsv(value || '#0078d4'));
  }, [value]);

  const updateFromHsv = useCallback((h: number, s: number, v: number) => {
    setHsv([h, s, v]);
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleSBMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDraggingSB(true);
    const rect = satBrightRef.current!.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    updateFromHsv(hsv[0], s, v);
  }, [hsv, updateFromHsv]);

  const handleHueMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDraggingHue(true);
    const rect = hueRef.current!.getBoundingClientRect();
    const h = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateFromHsv(h, hsv[1], hsv[2]);
  }, [hsv, updateFromHsv]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSB && satBrightRef.current) {
        const rect = satBrightRef.current.getBoundingClientRect();
        const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
        updateFromHsv(hsv[0], s, v);
      }
      if (isDraggingHue && hueRef.current) {
        const rect = hueRef.current.getBoundingClientRect();
        const h = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        updateFromHsv(h, hsv[1], hsv[2]);
      }
    };
    const handleMouseUp = () => {
      setIsDraggingSB(false);
      setIsDraggingHue(false);
    };
    if (isDraggingSB || isDraggingHue) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSB, isDraggingHue, hsv, updateFromHsv]);

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setHsv(hexToHsv(val));
      onChange(val);
    }
  };

  const hueColor = hsvToHex(hsv[0], 1, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Saturation/Brightness area */}
      <div
        ref={satBrightRef}
        onMouseDown={handleSBMouseDown}
        style={{
          width: '100%',
          height: 150,
          borderRadius: 8,
          position: 'relative',
          cursor: 'crosshair',
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${hsv[1] * 100}%`,
            top: `${(1 - hsv[2]) * 100}%`,
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hue bar */}
      <div
        ref={hueRef}
        onMouseDown={handleHueMouseDown}
        style={{
          width: '100%',
          height: 16,
          borderRadius: 8,
          position: 'relative',
          cursor: 'pointer',
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${hsv[0] * 100}%`,
            top: '50%',
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hex input + preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: value,
            border: `1px solid ${tokens.colorNeutralStroke1}`,
            flexShrink: 0,
          }}
        />
        <Input
          value={hexInput}
          onChange={(_, data) => handleHexChange(data.value)}
          placeholder="#000000"
          style={{ flex: 1, fontFamily: 'monospace' }}
          maxLength={7}
        />
      </div>

      {/* Preset swatches in rainbow order */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {RAINBOW_PALETTE.map((c) => (
          <div
            key={c}
            onClick={() => {
              onChange(c);
              setHsv(hexToHsv(c));
              setHexInput(c);
            }}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: c,
              cursor: 'pointer',
              border: value === c ? '2px solid white' : `1px solid ${tokens.colorNeutralStroke2}`,
              boxShadow: value === c ? `0 0 0 2px ${c}` : 'none',
              transition: 'transform 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ))}
      </div>
    </div>
  );
}
