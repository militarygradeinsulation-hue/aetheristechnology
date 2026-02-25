import React from 'react';
import { X, Mail, Phone, MapPin } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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

        <h2 className="text-3xl font-bold mb-2 text-foreground">Book a Consultation</h2>
        <p className="text-muted-foreground mb-8">
          Reach out to schedule a consultation and discuss your AI strategy.
        </p>

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
            href="mailto:aetheris.technology@outlook.com" 
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
