import React from 'react';
import { X, Mail, Phone, MapPin, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimCode?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, claimCode }) => {
  if (!isOpen) return null;

  const emailSubject = claimCode 
    ? `Claim Code: ${claimCode} - I Want to Claim My Spot!`
    : 'Interested in AI Solutions for My Business';
  
  const emailBody = claimCode
    ? `Hi Aetheris Team,%0D%0A%0D%0AMy Claim Code is: ${claimCode}%0D%0A%0D%0AI'm interested in claiming my spot for AI automation services.%0D%0A%0D%0APlease contact me to discuss how we can get started.%0D%0A%0D%0AThank you!`
    : 'Hi Aetheris Team,%0D%0A%0D%0AI am interested in learning more about your AI solutions for my business.%0D%0A%0D%0AThank you!';

  const handleEmailClick = async () => {
    if (claimCode) {
      try {
        await supabase
          .from('claim_codes')
          .update({ 
            status: 'email_clicked',
            email_clicked_at: new Date().toISOString()
          })
          .eq('code', claimCode);
      } catch (error) {
        console.error('Error updating claim code status:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative glass p-8 rounded-2xl max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 glass-hover rounded-lg"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <h2 className="text-3xl font-bold mb-2 text-foreground">Get In Touch</h2>
        <p className="text-muted-foreground mb-6">
          Reach out to discuss how AI can transform your business.
        </p>

        {claimCode && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Your Claim Code</div>
                <div className="text-xl font-bold text-foreground font-mono">{claimCode}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This code is included in your email automatically!
            </p>
          </div>
        )}

        <div className="space-y-6">
          <a 
            href="tel:+13173762110" 
            className="flex items-center gap-4 p-4 glass-hover rounded-xl transition-all hover:scale-[1.02]"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-cyan" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Call Us</div>
              <div className="text-foreground font-medium">1 (317) 376-2110</div>
            </div>
          </a>

          <a 
            href={`mailto:aetheris.technology@outlook.com?subject=${emailSubject}&body=${emailBody}`}
            onClick={handleEmailClick}
            className="flex items-center gap-4 p-4 glass-hover rounded-xl transition-all hover:scale-[1.02]"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-cyan" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email Us</div>
              <div className="text-foreground font-medium">aetheris.technology@outlook.com</div>
            </div>
          </a>

          <div className="flex items-center gap-4 p-4 glass rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-cyan" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Location</div>
              <div className="text-foreground font-medium">Indianapolis, Indiana</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
