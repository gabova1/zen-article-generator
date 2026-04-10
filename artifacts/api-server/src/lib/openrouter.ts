import { logger } from "./logger";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  model = "meta-llama/llama-4-maverick:free"
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dzen-generator.replit.app",
      "X-Title": "Яндекс Дзен Генератор",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, error: errorText }, "OpenRouter API error");
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as OpenRouterResponse;

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("No content in OpenRouter response");
  }

  return data.choices[0].message.content;
}

export interface GenerateArticleOptions {
  topic: string;
  category: string;
  keywords?: string[];
  articleType: string;
  productUrl?: string;
  targetAudience?: string;
  tone?: string;
  length?: string;
}

const ARTICLE_TYPE_LABELS: Record<string, string> = {
  review: "обзор",
  guide: "руководство",
  listicle: "список",
  news: "новость",
  opinion: "мнение",
};

const TONE_LABELS: Record<string, string> = {
  formal: "формальный",
  casual: "неформальный",
  expert: "экспертный",
  friendly: "дружелюбный",
};

const LENGTH_GUIDES: Record<string, string> = {
  short: "около 800-1200 слов",
  medium: "около 1500-2500 слов",
  long: "около 3000-5000 слов",
};

export async function generateDzenArticle(options: GenerateArticleOptions) {
  const {
    topic,
    category,
    keywords = [],
    articleType,
    productUrl,
    targetAudience,
    tone,
    length = "medium",
  } = options;

  const typeLabel = ARTICLE_TYPE_LABELS[articleType] || articleType;
  const toneLabel = tone ? TONE_LABELS[tone] || tone : "дружелюбный";
  const lengthGuide = LENGTH_GUIDES[length] || LENGTH_GUIDES.medium;

  const keywordsSection = keywords.length > 0
    ? `Ключевые слова для SEO: ${keywords.join(", ")}`
    : "";

  const audienceSection = targetAudience
    ? `Целевая аудитория: ${targetAudience}`
    : "";

  const productSection = productUrl
    ? `Продукт/товар: включи ссылку на продукт: ${productUrl} (оформи как якорные ссылки в тексте)`
    : "";

  const systemPrompt = `Ты — опытный автор контента для платформы Яндекс Дзен. Ты создаёшь высококачественные, SEO-оптимизированные статьи на русском языке, которые:
- Хорошо читаются и удерживают внимание читателей
- Оптимизированы для алгоритмов Яндекс Дзен
- Имеют чёткую структуру с заголовками и подзаголовками
- Включают практическую и полезную информацию
- При необходимости органично включают ссылки на товары

Формат ответа: СТРОГО JSON объект (без markdown блоков) со следующими полями:
{
  "title": "Заголовок статьи (привлекательный, SEO-оптимизированный)",
  "seoTitle": "SEO заголовок (до 60 символов)",
  "metaDescription": "Мета-описание (120-160 символов)",
  "excerpt": "Краткое вступление статьи (2-3 предложения)",
  "content": "Полный текст статьи в HTML формате",
  "imageDescriptions": ["Описание изображения 1", "Описание изображения 2", "Описание изображения 3"]
}

HTML контент должен использовать: h2, h3, p, ul, ol, li, strong, em, blockquote, a (для ссылок).
НЕ включай html, head, body теги — только содержимое статьи.`;

  const userPrompt = `Напиши ${typeLabel} для Яндекс Дзен на тему: "${topic}"

Категория: ${category}
Тон: ${toneLabel}
Объём: ${lengthGuide}
${keywordsSection}
${audienceSection}
${productSection}

Требования к статье:
1. Цепляющий заголовок, который хочется кликнуть
2. Интригующее введение с хуком
3. Структурированный контент с H2 и H3 заголовками (минимум 4-6 разделов)
4. Практические советы, факты и примеры
5. Если это обзор товара — детальное описание преимуществ и недостатков, с ссылкой на покупку
6. Если есть ключевые слова — органично вписать их в текст
7. Призыв к действию в конце
8. Рекомендации по 2-3 изображениям, которые усилят статью

Верни только JSON объект, без дополнительного текста.`;

  const content = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  let parsed: {
    title: string;
    seoTitle: string;
    metaDescription: string;
    excerpt: string;
    content: string;
    imageDescriptions: string[];
  };

  try {
    const cleanContent = content.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    parsed = JSON.parse(cleanContent);
  } catch {
    logger.error({ content }, "Failed to parse OpenRouter response as JSON");
    throw new Error("Failed to parse AI response as JSON");
  }

  const wordCount = parsed.content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);

  return {
    title: parsed.title,
    seoTitle: parsed.seoTitle,
    metaDescription: parsed.metaDescription,
    excerpt: parsed.excerpt,
    content: parsed.content,
    imageDescriptions: parsed.imageDescriptions || [],
    wordCount,
    readingTime,
    keywords,
    category,
    articleType,
  };
}
