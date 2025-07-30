import { useLanguage } from '../context/LanguageContext';

/**
 * A custom hook that provides translation functionality
 * @returns An object with the current language and translation function
 */
export const useTranslation = () => {
  const { language, setLanguage, translate } = useLanguage();
  
  return {
    language,
    setLanguage,
    t: translate, // Shorthand for translate
  };
};

export default useTranslation;