import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Check, ChevronDown, Globe } from 'lucide-react';
import languageService from '../services/language.service';
import type { ILanguage } from '../types';

interface LanguageSwitcherProps {
  variant?: 'default' | 'outline' | 'subtle';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export default function LanguageSwitcher({
  variant = 'outline',
  size = 'default',
  className = '',
  showLabel = true
}: LanguageSwitcherProps) {
  const [languages, setLanguages] = useState<ILanguage[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<ILanguage | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadLanguages = async () => {
      setLoading(true);
      try {
        // Tüm aktif dilleri yükle
        const langs = await languageService.getLanguages(true);
        setLanguages(langs);

        // Mevcut dil kodunu al
        const currentLangCode = languageService.getCurrentLanguageCode();
        const currentLang = langs.find(l => l.code === currentLangCode) || null;

        if (currentLang) {
          setCurrentLanguage(currentLang);
        } else if (langs.length > 0) {
          // Eğer mevcut dil yoksa, varsayılan dili veya ilk dili al
          const defaultLang = langs.find(l => l.is_default) || langs[0];
          setCurrentLanguage(defaultLang);
          await languageService.setLanguage(defaultLang.code);
        }
      } catch (error) {
        console.error('Error loading languages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLanguages();
  }, []);

  const handleLanguageChange = async (language: ILanguage) => {
    setLoading(true);
    try {
      const success = await languageService.setLanguage(language.code);
      if (success) {
        setCurrentLanguage(language);
        // Sayfayı yeniden yükle (geniş değişiklikler için)
        window.location.reload();
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  // If no languages or only one language, don't show the switcher
  if (languages.length <= 1) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-1 ${className}`}
          disabled={loading || languages.length <= 1}
        >
          {currentLanguage ? (
            <>
              <span className="mr-1">{currentLanguage.flag_code.toUpperCase()}</span>
              {showLabel && (
                <span className="hidden md:inline">{currentLanguage.native_name}</span>
              )}
            </>
          ) : (
            <Globe className="h-4 w-4" />
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="end">
        <div className="max-h-80 overflow-auto rounded-md">
          {languages.map((language) => (
            <div
              key={language.code}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted ${
                currentLanguage?.code === language.code ? 'bg-muted' : ''
              }`}
              onClick={() => handleLanguageChange(language)}
            >
              <div className="flex items-center gap-2">
                <span>{language.flag_code.toUpperCase()}</span>
                <span>{language.native_name}</span>
              </div>
              {currentLanguage?.code === language.code && (
                <Check className="h-4 w-4" />
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
