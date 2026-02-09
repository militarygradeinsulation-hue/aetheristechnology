import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Download, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type GenerationType = 'rendering' | 'signage' | 'marketing';

const typeOptions: { value: GenerationType; label: string; description: string }[] = [
  { value: 'rendering', label: 'Playground Rendering', description: 'Photorealistic playground designs' },
  { value: 'signage', label: 'Safety Signage', description: 'Professional safety signs' },
  { value: 'marketing', label: 'Marketing Visual', description: 'Social media & promotional graphics' },
];

export const PlaygroundImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<GenerationType>('rendering');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-playground-image', {
        body: { prompt, type },
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Too many requests. Please wait a moment and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please contact support.');
        } else {
          throw error;
        }
        return;
      }

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success('Image generated successfully!');
      } else {
        throw new Error('No image returned');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `playground-${type}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass p-8 rounded-2xl border border-border/50">
      {/* Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {typeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setType(option.value)}
            className={`p-4 rounded-xl border text-left transition-all ${
              type === option.value
                ? 'border-cyan bg-cyan/10'
                : 'border-border/50 hover:border-cyan/50'
            }`}
          >
            <p className={`font-semibold ${type === option.value ? 'text-cyan' : 'text-foreground'}`}>
              {option.label}
            </p>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </button>
        ))}
      </div>

      {/* Prompt Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          Describe what you want to create
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            type === 'rendering'
              ? 'A modern accessible playground with rubber surfacing, inclusive swings, and natural shade structures...'
              : type === 'signage'
              ? 'A safety rules sign for ages 5-12 with icons showing no running, adult supervision required...'
              : 'A promotional graphic showcasing our playground safety services with before/after imagery...'
          }
          className="w-full h-32 px-4 py-3 rounded-xl bg-background/50 border border-border/50 focus:border-cyan focus:outline-none resize-none text-foreground placeholder:text-muted-foreground"
          disabled={isGenerating}
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white py-6 text-lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 w-5 h-5 animate-spin" />
            Generating with AI...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 w-5 h-5" />
            Generate Image
          </>
        )}
      </Button>

      {/* Generated Image Display */}
      {generatedImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="relative rounded-xl overflow-hidden border border-cyan/30">
            <img
              src={generatedImage}
              alt="Generated playground"
              className="w-full h-auto"
            />
            <div className="absolute top-4 right-4">
              <Button
                onClick={handleDownload}
                variant="secondary"
                className="glass"
              >
                <Download className="mr-2 w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Sparkles className="inline w-4 h-4 mr-1" />
            Generated by PlaySafe AI Creative Engine
          </p>
        </motion.div>
      )}

      {/* Placeholder when no image */}
      {!generatedImage && !isGenerating && (
        <div className="mt-8 p-12 border-2 border-dashed border-border/50 rounded-xl text-center">
          <ImageIcon className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Your AI-generated image will appear here</p>
        </div>
      )}
    </div>
  );
};
