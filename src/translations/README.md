# Translation System for Farming App

This document provides instructions on how to implement translations in all screens of the app.

## How to Use Translations in Your Screens

### Option 1: Using the `useTranslation` Hook

```jsx
import React from 'react';
import { View, Text } from 'react-native';
import useTranslation from '../hooks/useTranslation';

const MyScreen = () => {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text>{t('Hello World')}</Text>
      <Text>{t('Welcome to the app')}</Text>
    </View>
  );
};

export default MyScreen;
```

### Option 2: Using the `TranslatedText` Component

```jsx
import React from 'react';
import { View } from 'react-native';
import TranslatedText from '../components/TranslatedText';

const MyScreen = () => {
  return (
    <View>
      <TranslatedText text="Hello World" />
      <TranslatedText text="Welcome to the app" style={{ fontSize: 18 }} />
    </View>
  );
};

export default MyScreen;
```

### Option 3: Using the `useLanguage` Context Directly

```jsx
import React from 'react';
import { View, Text } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const MyScreen = () => {
  const { translate } = useLanguage();
  
  return (
    <View>
      <Text>{translate('Hello World')}</Text>
      <Text>{translate('Welcome to the app')}</Text>
    </View>
  );
};

export default MyScreen;
```

## Adding New Translations

To add new translations, edit the `kannadaTranslations` object in `src/context/LanguageContext.tsx`:

```typescript
const kannadaTranslations: Record<string, string> = {
  // Existing translations...
  
  // Add your new translations here
  'Your English Text': 'ಕನ್ನಡದಲ್ಲಿ ನಿಮ್ಮ ಪಠ್ಯ',
};
```

## Best Practices

1. Use simple, clear English text as keys
2. Keep translations consistent across the app
3. Group related translations together in the translations object
4. For dynamic content, use template literals:
   ```jsx
   <Text>{t('Hello')} {userName}!</Text>
   ```
5. For pluralization or complex translations, consider using a more advanced i18n library in the future

## Language Toggle

The language toggle is implemented in the HomeScreen. When the user selects "K", the app will display text in Kannada. When "E" is selected, it will display text in English.

The language preference is saved to AsyncStorage, so it will persist between app sessions.