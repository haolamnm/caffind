const TRANSLATE_ENDPOINT =
  import.meta.env.VITE_TRANSLATE_ENDPOINT || "http://127.0.0.1:8000/translate";

interface TranslateOptions {
  target?: string;
  source?: string;
}

export async function translateText(
  text: string,
  { target, source }: TranslateOptions = {},
) {
  const targetLanguage =
    target || import.meta.env.VITE_DEFAULT_TRANSLATE_LANG || "en";

  const payload: Record<string, unknown> = {
    text,
    target: targetLanguage,
  };

  if (source) {
    payload.source = source;
  }

  const response = await fetch(TRANSLATE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(
      `Translation server error: ${response.status} ${response.statusText} - ${raw.slice(0, 120)}`,
    );
  }

  try {
    const data = JSON.parse(raw);
    if (!data.translated_text) {
      throw new Error("No translated text returned");
    }
    return data.translated_text as string;
  } catch (parseError) {
    console.error("Failed to parse translation response", parseError, raw.slice(0, 120));
    throw new Error("Unable to parse translation response");
  }
}
