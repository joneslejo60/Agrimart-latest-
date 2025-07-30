export const translateLibre = async (
  text: string,
  targetLang: 'kn' | 'en' = 'kn'
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // Abort after 5s

  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang,
        format: 'text',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    return data?.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error instanceof Error ? error.message : error);
    return text; // Fallback to English if any error occurs
  }
};
