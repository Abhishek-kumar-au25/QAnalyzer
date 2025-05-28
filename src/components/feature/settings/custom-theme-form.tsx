// src/components/feature/settings/custom-theme-form.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Palette, RotateCcw, Wand2, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes'; 

interface HSLColor {
  h: string;
  s: string;
  l: string;
}

interface CustomThemeColors {
  background: HSLColor;
  foreground: HSLColor;
  primary: HSLColor;
  accent: HSLColor;
  card: HSLColor;
  border: HSLColor;
  input: HSLColor;
  ring: HSLColor;
  destructive: HSLColor;
  muted: HSLColor;
  'muted-foreground': HSLColor;
  'popover': HSLColor;
  'popover-foreground': HSLColor;
  'primary-foreground': HSLColor;
  'secondary': HSLColor;
  'secondary-foreground': HSLColor;
  'accent-foreground': HSLColor;
  'destructive-foreground': HSLColor;
  'sidebar-background': HSLColor;
  'sidebar-foreground': HSLColor;
  'sidebar-primary': HSLColor;
  'sidebar-primary-foreground': HSLColor;
  'sidebar-accent': HSLColor;
  'sidebar-accent-foreground': HSLColor;
  'sidebar-border': HSLColor;
  'sidebar-ring': HSLColor;
  'chart-1': HSLColor;
  'chart-2': HSLColor;
  'chart-3': HSLColor;
  'chart-4': HSLColor;
  'chart-5': HSLColor;
  'header-background': HSLColor; // Added header background
}

// Default Radium-Inspired Light Theme HSL values (as strings for input)
const defaultLightHsl: CustomThemeColors = {
  background: { h: '210', s: '20', l: '98' },
  foreground: { h: '210', s: '10', l: '20' },
  card: { h: '0', s: '0', l: '100' },
  'card-foreground': { h: '210', s: '10', l: '20' },
  popover: { h: '0', s: '0', l: '100' },
  'popover-foreground': { h: '210', s: '10', l: '20' },
  primary: { h: '180', s: '70', l: '45' },
  'primary-foreground': { h: '0', s: '0', l: '100' },
  secondary: { h: '210', s: '10', l: '90' },
  'secondary-foreground': { h: '210', s: '10', l: '15' },
  muted: { h: '210', s: '15', l: '94' },
  'muted-foreground': { h: '210', s: '10', l: '45' },
  accent: { h: '140', s: '60', l: '55' },
  'accent-foreground': { h: '210', s: '10', l: '15' },
  destructive: { h: '0', s: '75', l: '55' },
  'destructive-foreground': { h: '0', s: '0', l: '100' },
  border: { h: '210', s: '15', l: '88' },
  input: { h: '210', s: '15', l: '88' },
  ring: { h: '180', s: '70', l: '45' },
  'sidebar-background': { h: '210', s: '10', l: '20' },
  'sidebar-foreground': { h: '210', s: '15', l: '85' },
  'sidebar-primary': { h: '180', s: '70', l: '55' },
  'sidebar-primary-foreground': { h: '0', s: '0', l: '100' },
  'sidebar-accent': { h: '210', s: '10', l: '28' },
  'sidebar-accent-foreground': { h: '210', s: '15', l: '95' },
  'sidebar-border': { h: '210', s: '10', l: '30' },
  'sidebar-ring': { h: '180', s: '70', l: '55' },
  'chart-1': { h: '180', s: '70', l: '45' },
  'chart-2': { h: '140', s: '60', l: '55' },
  'chart-3': { h: '210', s: '60', l: '50' },
  'chart-4': { h: '30', s: '90', l: '60' },
  'chart-5': { h: '0', s: '75', l: '60' },
  'header-background': { h: '210', s: '10', l: '20' }, // Default light header background
};

// Default Radium-Inspired Dark Theme HSL values (as strings for input)
const defaultDarkHsl: CustomThemeColors = {
  background: { h: '210', s: '10', l: '12' },
  foreground: { h: '210', s: '15', l: '88' },
  card: { h: '210', s: '10', l: '15' },
  'card-foreground': { h: '210', s: '15', l: '88' },
  popover: { h: '210', s: '10', l: '9' },
  'popover-foreground': { h: '210', s: '15', l: '88' },
  primary: { h: '180', s: '65', l: '55' },
  'primary-foreground': { h: '210', s: '10', l: '15' },
  secondary: { h: '210', s: '10', l: '22' },
  'secondary-foreground': { h: '210', s: '15', l: '88' },
  muted: { h: '210', s: '10', l: '18' },
  'muted-foreground': { h: '210', s: '10', l: '60' },
  accent: { h: '140', s: '55', l: '60' },
  'accent-foreground': { h: '210', s: '10', l: '15' },
  destructive: { h: '0', s: '65', l: '60' },
  'destructive-foreground': { h: '0', s: '0', l: '100' },
  border: { h: '210', s: '10', l: '25' },
  input: { h: '210', s: '10', l: '25' },
  ring: { h: '140', s: '55', l: '60' },
  'sidebar-background': { h: '210', s: '10', l: '10' },
  'sidebar-foreground': { h: '210', s: '15', l: '80' },
  'sidebar-primary': { h: '180', s: '65', l: '60' },
  'sidebar-primary-foreground': { h: '210', s: '10', l: '15' },
  'sidebar-accent': { h: '210', s: '10', l: '20' },
  'sidebar-accent-foreground': { h: '210', s: '15', l: '90' },
  'sidebar-border': { h: '210', s: '10', l: '18' },
  'sidebar-ring': { h: '180', s: '65', l: '60' },
  'chart-1': { h: '180', s: '65', l: '55' },
  'chart-2': { h: '140', s: '55', l: '60' },
  'chart-3': { h: '210', s: '70', l: '60' },
  'chart-4': { h: '30', s: '85', l: '65' },
  'chart-5': { h: '0', s: '70', l: '65' },
  'header-background': { h: '210', s: '10', l: '10' }, // Default dark header background
};

const colorProperties: Array<{ key: keyof CustomThemeColors; label: string }> = [
  { key: 'header-background', label: 'Header Background' }, // Added header background to form
  { key: 'background', label: 'Background' },
  { key: 'foreground', label: 'Foreground (Text)' },
  { key: 'primary', label: 'Primary (Main Action)' },
  { key: 'accent', label: 'Accent (Highlights)' },
  { key: 'card', label: 'Card Background' },
  { key: 'card-foreground', label: 'Card Foreground (Text)' },
  { key: 'popover', label: 'Popover Background' },
  { key: 'popover-foreground', label: 'Popover Foreground (Text)' },
  { key: 'primary-foreground', label: 'Primary Foreground (Text)' },
  { key: 'secondary', label: 'Secondary Background' },
  { key: 'secondary-foreground', label: 'Secondary Foreground (Text)' },
  { key: 'muted', label: 'Muted Background' },
  { key: 'muted-foreground', label: 'Muted Foreground (Text)' },
  { key: 'accent-foreground', label: 'Accent Foreground (Text)' },
  { key: 'destructive', label: 'Destructive Action' },
  { key: 'destructive-foreground', label: 'Destructive Foreground (Text)' },
  { key: 'border', label: 'Border Color' },
  { key: 'input', label: 'Input Border Color' },
  { key: 'ring', label: 'Focus Ring Color' },
  { key: 'sidebar-background', label: 'Sidebar Background' },
  { key: 'sidebar-foreground', label: 'Sidebar Foreground (Text)' },
  { key: 'sidebar-primary', label: 'Sidebar Primary (Active Item)' },
  { key: 'sidebar-primary-foreground', label: 'Sidebar Primary Foreground (Text)' },
  { key: 'sidebar-accent', label: 'Sidebar Accent (Hover)' },
  { key: 'sidebar-accent-foreground', label: 'Sidebar Accent Foreground (Text)' },
  { key: 'sidebar-border', label: 'Sidebar Border Color' },
  { key: 'sidebar-ring', label: 'Sidebar Focus Ring' },
  { key: 'chart-1', label: 'Chart Color 1' },
  { key: 'chart-2', label: 'Chart Color 2' },
  { key: 'chart-3', label: 'Chart Color 3' },
  { key: 'chart-4', label: 'Chart Color 4' },
  { key: 'chart-5', label: 'Chart Color 5' },
];

const parseHslString = (hslString: string | null | undefined): HSLColor | null => {
  if (!hslString) return null;
  const parts = hslString.trim().split(/\s+/);
  if (parts.length === 3) {
    return {
      h: parts[0].replace(/[^0-9.]/g, ''),
      s: parts[1].replace(/[^0-9.]/g, ''),
      l: parts[2].replace(/[^0-9.]/g, ''),
    };
  }
  return null;
};


export default function CustomThemeForm() {
  const { toast } = useToast();
  const { theme: nextThemeMode, systemTheme } = useTheme(); 
  const [isClient, setIsClient] = useState(false);

  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => {
    const currentMode = nextThemeMode === 'system' ? systemTheme : nextThemeMode;
    return currentMode === 'dark' ? defaultDarkHsl : defaultLightHsl;
  });

  const initializeFromComputedStyles = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const computedStyle = getComputedStyle(document.documentElement);
    const newColors: Partial<CustomThemeColors> = {};
    const currentMode = nextThemeMode === 'system' ? systemTheme : nextThemeMode;
    const defaultTheme = currentMode === 'dark' ? defaultDarkHsl : defaultLightHsl;

    colorProperties.forEach(prop => {
      const hslString = computedStyle.getPropertyValue(`--${prop.key}`).trim();
      const parsed = parseHslString(hslString);
      if (parsed) {
        (newColors[prop.key] as HSLColor) = parsed;
      } else {
        (newColors[prop.key] as HSLColor) = defaultTheme[prop.key];
      }
    });
    setCustomColors(newColors as CustomThemeColors);
  }, [nextThemeMode, systemTheme]);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('customThemeSettings');
      if (savedTheme) {
        try {
          const parsedTheme = JSON.parse(savedTheme);
          setCustomColors(parsedTheme);
        } catch (e) {
          console.error("Failed to parse saved theme from localStorage", e);
          localStorage.removeItem('customThemeSettings');
          initializeFromComputedStyles(); 
        }
      } else {
        initializeFromComputedStyles(); 
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

    useEffect(() => {
        if (isClient) {
             initializeFromComputedStyles();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isClient, nextThemeMode, systemTheme]);


  const applyThemeToDocument = (themeToApply: CustomThemeColors) => {
    if (typeof document !== 'undefined') {
      Object.entries(themeToApply).forEach(([key, hslColor]) => {
        document.documentElement.style.setProperty(
          `--${key}`,
          `${hslColor.h} ${hslColor.s}% ${hslColor.l}%`
        );
      });
    }
  };

  const handleInputChange = (
    colorKey: keyof CustomThemeColors,
    hslKey: keyof HSLColor,
    value: string
  ) => {
    setCustomColors(prev => ({
      ...prev,
      [colorKey]: {
        ...prev[colorKey],
        [hslKey]: value,
      },
    }));
  };

  const handleApplyCustomTheme = () => {
    applyThemeToDocument(customColors);
    localStorage.setItem('customThemeSettings', JSON.stringify(customColors));
    toast({ title: "Custom Theme Applied", description: "Your theme colors have been updated." });
  };

  const handleResetTheme = () => {
    if (typeof document !== 'undefined') {
      colorProperties.forEach(prop => {
        document.documentElement.style.removeProperty(`--${prop.key}`);
      });
      const currentMode = nextThemeMode === 'system' ? systemTheme : nextThemeMode;
      const defaultThemeToApply = currentMode === 'dark' ? defaultDarkHsl : defaultLightHsl;
      applyThemeToDocument(defaultThemeToApply);
      setCustomColors(defaultThemeToApply);
    }
    localStorage.removeItem('customThemeSettings');
    toast({ title: "Theme Reset", description: "Custom theme settings have been cleared to defaults." });
  };

  if (!isClient) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-primary flex items-center"><Palette className="mr-2 h-5 w-5 text-accent" />Customize Theme Colors</CardTitle>
                <CardDescription>Loading theme customizer...</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-24 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-primary flex items-center"><Palette className="mr-2 h-5 w-5 text-accent" />Customize Theme Colors</CardTitle>
        <CardDescription>
          Fine-tune the HSL values for key theme colors. Press Apply to see changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[calc(100vh-300px)] sm:max-h-[500px] overflow-y-auto pr-2">
        {colorProperties.map(({ key, label }) => (
          <div key={key} className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <h4 className="font-semibold text-foreground">{label}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              {(['h', 's', 'l'] as Array<keyof HSLColor>).map(hslKey => (
                <div key={hslKey} className="space-y-1">
                  <Label htmlFor={`${key}-${hslKey}`} className="text-xs uppercase">
                    {hslKey} ({hslKey === 'h' ? '0-360' : '0-100'})
                  </Label>
                  <Input
                    id={`${key}-${hslKey}`}
                    type="number"
                    value={customColors[key]?.[hslKey] || ''}
                    onChange={(e) => handleInputChange(key, hslKey, e.target.value)}
                    min={0}
                    max={hslKey === 'h' ? 360 : 100}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
            {customColors[key] && ( // Ensure customColors[key] exists before accessing its properties
                key.endsWith('-foreground') ? (
                <div
                    className="mt-2 h-8 w-full rounded border flex items-center justify-center text-center text-xs"
                    style={{
                    backgroundColor: `hsl(${customColors['background']?.h || defaultLightHsl.background.h} ${customColors['background']?.s || defaultLightHsl.background.s}% ${customColors['background']?.l || defaultLightHsl.background.l}%)`,
                    color: `hsl(${customColors[key]?.h || 0} ${customColors[key]?.s || 0}% ${customColors[key]?.l || 0}%)`,
                    padding: '0.25rem'
                    }}
                >
                    Sample Text
                </div>
                ) : (
                <div className="mt-2 h-8 w-full rounded border" style={{ backgroundColor: `hsl(${customColors[key]?.h || 0} ${customColors[key]?.s || 0}% ${customColors[key]?.l || 0}%)` }}></div>
                )
            )}
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t mt-auto">
        <Button onClick={handleApplyCustomTheme} className="w-full sm:w-auto order-1 sm:order-2 flex-1 min-w-0">
          <Wand2 className="mr-2 h-4 w-4" /> Apply Custom Theme
        </Button>
      </CardFooter>
    </Card>
  );
}
