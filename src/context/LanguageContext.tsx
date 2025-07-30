import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';
import en from '../translations/en';
import kn from '../translations/kn';

export type Language = 'E' | 'K';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'app_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLang] = useState<Language>('E');
  const [dynamicKn, setDynamicKn] = useState<{ [key: string]: string }>({});

  const detectDeviceLanguage = (): Language => {
    const locales = RNLocalize.getLocales();
    if (Array.isArray(locales) && locales.length > 0) {
      const langCode = locales[0]?.languageCode?.toLowerCase();
      if (langCode === 'kn') return 'K';
    }
    return 'E';
  };

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLang === 'E' || storedLang === 'K') {
          setLang(storedLang);
        } else {
          const autoLang = detectDeviceLanguage();
          setLang(autoLang);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, autoLang);
        }
      } catch (error) {
        console.error('Failed to load language:', error);
        setLang('E');
      }
    };

    loadStoredLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLang(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const autoTranslateAndStore = async (key: string) => {
    try {
      const text = en[key as keyof typeof en];
      if (!text) return;

      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: 'kn',
          format: 'text',
        }),
      });

      const data = await response.json();
      const translatedText = data.translatedText;
      if (translatedText) {
        setDynamicKn((prev) => ({ ...prev, [key]: translatedText }));
        console.log(`Translated "${text}" → "${translatedText}"`);
      }
    } catch (error) {
      console.error('Auto-translate failed:', error);
    }
  };

  const translate = (key: string): string => {
    if (language === 'E') {
      return en[key as keyof typeof en] || key;
    } else {
      const staticTranslation = kn[key as keyof typeof kn];
      const cachedDynamic = dynamicKn[key];

      if (staticTranslation) return staticTranslation;
      if (cachedDynamic) return cachedDynamic;

      // Auto-translate in background
      autoTranslateAndStore(key);

      return en[key as keyof typeof en] || key; // fallback for now
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

