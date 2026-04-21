import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

interface Props {
  prompt: string;
  libraryItemId?: string;
  postIndex?: number;
  existingImageUrl?: string;
  onImageGenerated: (url: string) => void;
  compact?: boolean;
}

export const PostImageGenerator: React.FC<Props> = ({
  prompt,
  libraryItemId,
  postIndex,
  existingImageUrl,
  onImageGenerated,
  compact = false,
}) => {
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(existingImageUrl || '');

  const generate = async () => {
    setGenerating(true);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('generate-content-image', {
        body: { prompt, library_item_id: libraryItemId, post_index: postIndex },
        headers: token ? { 'x-admin-token': token } : {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data.image_url;
      setImageUrl(url);
      onImageGenerated(url);
      toast({ title: 'Image generated' });
    } catch (e: any) {
      toast({ title: 'Image generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {imageUrl && (
          <img src={imageUrl} alt="Generated editorial cartoon" className="w-full rounded-md border border-border" />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={generating}
          className="w-full"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Generating...</>
          ) : imageUrl ? (
            <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Redo Image</>
          ) : (
            <><ImageIcon className="w-3.5 h-3.5 mr-1" /> Generate Image</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-4 border border-border space-y-3">
      {imageUrl && (
        <img src={imageUrl} alt="Generated editorial cartoon" className="w-full rounded-md border border-border" />
      )}
      <Button
        variant="outline"
        onClick={generate}
        disabled={generating}
        className="w-full"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating editorial cartoon...</>
        ) : imageUrl ? (
          <><RefreshCw className="w-4 h-4 mr-2" /> Redo Image</>
        ) : (
          <><ImageIcon className="w-4 h-4 mr-2" /> Generate Editorial Cartoon</>
        )}
      </Button>
    </div>
  );
};
