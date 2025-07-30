import React from 'react';
import { Text, TextProps } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

interface TranslatedTextProps extends TextProps {
  text: string;
}

/**
 * A component that automatically translates text based on the current language setting
 */
const TranslatedText: React.FC<TranslatedTextProps> = ({ text, ...props }) => {
  const { translate } = useLanguage();
  
  return (
    <Text {...props}>
      {translate(text)}
    </Text>
  );
};

export default TranslatedText;