// useAsyncTranslate.ts
import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const LIBRE_TRANSLATE_API = 'https://libretranslate.de/translate';

export const useAsyncTranslate = (text: string) => {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    const translate = async () => {
      if (language === 'E') {
        setTranslated(text);
        return;
      }

      try {
        const res = await fetch(LIBRE_TRANSLATE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: 'en',
            target: language === 'K' ? 'kn' : 'en',
            format: 'text',
          }),
        });

        const data = await res.json();
        setTranslated(data.translatedText || text);
      } catch (error) {
        console.error('LibreTranslate error:', error);
        setTranslated(text);
      }
    };

    translate();
  }, [text, language]);

  return translated;
};
