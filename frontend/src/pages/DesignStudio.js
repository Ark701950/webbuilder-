import React, { useState } from 'react';
import { MainLayout } from '../components/MainLayout';
import { PageHeader, Button, Input, Badge } from '../components/ui-kit';
import { Palette, Upload, Type, Image, Layout, Sparkles, Save } from 'lucide-react';

const PRESET_THEMES = [
  { name: 'Indigo (Default)', primary: '#4F46E5', accent: '#6366F1' },
  { name: 'Emerald', primary: '#10B981', accent: '#059669' },
  { name: 'Rose', primary: '#F43F5E', accent: '#E11D48' },
  { name: 'Amber', primary: '#F59E0B', accent: '#D97706' },
  { name: 'Sky', primary: '#0EA5E9', accent: '#0284C7' },
  { name: 'Purple', primary: '#A855F7', accent: '#9333EA' },
];

const FONT_OPTIONS = [
  { name: 'Outfit + Manrope (Default)', heading: 'Outfit', body: 'Manrope' },
  { name: 'Inter', heading: 'Inter', body: 'Inter' },
  { name: 'Poppins', heading: 'Poppins', body: 'Poppins' },
];

export const DesignStudio = () => {
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);
  const [logoPreview, setLogoPreview] = useState(null);
  const [brandingName, setBrandingName] = useState('WebBuilder OS');
  const [tagline, setTagline] = useState('Enterprise Business OS');
  const [saved, setSaved] = useState(false);

  const applyTheme = (theme) => {
    const root = document.documentElement;
    const rgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r} ${g} ${b}`;
    };
    root.style.setProperty('--primary', rgb(theme.primary));
    root.style.setProperty('--accent', rgb(theme.primary));
    root.style.setProperty('--accent-hover', rgb(theme.accent));
    root.style.setProperty('--ring', rgb(theme.primary));
  };

  const handleThemeSelect = (idx) => {
    setSelectedTheme(idx);
    applyTheme(PRESET_THEMES[idx]);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // Save to localStorage as MVP - could be extended to backend settings
    localStorage.setItem('webbuilder_branding', JSON.stringify({
      brandingName, tagline,
      theme: PRESET_THEMES[selectedTheme],
      font: FONT_OPTIONS[selectedFont]
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Design Studio"
          description="Customize branding, themes, and platform appearance without coding"
          action={
            <Button onClick={handleSave} data-testid="save-branding-button">
              <Save className="mr-2 inline h-5 w-5" />
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          }
        />

        {saved && (
          <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-success">
            Branding saved successfully!
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Branding Section */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Brand Identity</h3>
            </div>
            <div className="mt-6 space-y-4">
              <Input label="Company Name" value={brandingName} onChange={(e) => setBrandingName(e.target.value)} data-testid="brand-name-input" />
              <Input label="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} data-testid="brand-tagline-input" />
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-background overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-2xl font-bold text-primary">W</span>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" data-testid="logo-upload-input" />
                    <span className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors">
                      <Upload className="mr-2 inline h-4 w-4" /> Upload Logo
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Color Themes */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Color Themes</h3>
            </div>
            <div className="mt-6 space-y-3" data-testid="theme-list">
              {PRESET_THEMES.map((theme, idx) => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeSelect(idx)}
                  className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selectedTheme === idx ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-elevated'
                  }`}
                  data-testid={`theme-option-${idx}`}
                >
                  <div className="flex gap-1">
                    <span className="h-8 w-8 rounded" style={{ backgroundColor: theme.primary }} />
                    <span className="h-8 w-8 rounded" style={{ backgroundColor: theme.accent }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{theme.name}</span>
                  {selectedTheme === idx && <Badge variant="info">Active</Badge>}
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Type className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Typography</h3>
            </div>
            <div className="mt-6 space-y-3">
              {FONT_OPTIONS.map((font, idx) => (
                <button
                  key={font.name}
                  onClick={() => setSelectedFont(idx)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedFont === idx ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-elevated'
                  }`}
                  data-testid={`font-option-${idx}`}
                >
                  <p className="font-semibold text-foreground" style={{ fontFamily: font.heading }}>Heading Text</p>
                  <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: font.body }}>Body text sample - {font.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Layout Options */}
          <div className="rounded-xl border border-border bg-surface p-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Layout className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Layout & Density</h3>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                { label: 'Sidebar Position', options: ['Left', 'Right'], default: 'Left' },
                { label: 'Content Density', options: ['Comfortable', 'Compact', 'Spacious'], default: 'Comfortable' },
                { label: 'Header Style', options: ['Sticky', 'Fixed', 'Static'], default: 'Sticky' },
                { label: 'Border Radius', options: ['Rounded', 'Sharp', 'Full'], default: 'Rounded' },
              ].map((opt) => (
                <div key={opt.label}>
                  <label className="block text-sm font-medium text-foreground mb-2">{opt.label}</label>
                  <div className="flex gap-2">
                    {opt.options.map((v) => (
                      <button
                        key={v}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          v === opt.default ? 'bg-primary text-white' : 'border border-input text-foreground hover:bg-surface-elevated'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Image className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Live Preview</h3>
            </div>
            <div className="mt-6 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  {logoPreview ? (
                    <img src={logoPreview} alt="" className="h-full w-full object-contain rounded-lg" />
                  ) : (
                    <span className="text-sm font-bold text-white">W</span>
                  )}
                </div>
                <span className="font-bold text-foreground">{brandingName}</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{tagline}</p>
              <Button className="mt-4" size="sm">Sample Button</Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
