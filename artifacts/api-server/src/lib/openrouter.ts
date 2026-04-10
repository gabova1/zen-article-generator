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

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

async function tryModel(messages: OpenRouterMessage[], model: string): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dzen-generator.replit.app",
      "X-Title": "Yandex Dzen Generator",
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
    logger.warn({ status: response.status, model, error: errorText }, "Model failed, trying next");
    throw new Error(`Model ${model} failed: ${response.status}`);
  }

  const data = await response.json() as OpenRouterResponse;
  if (!data.choices?.[0]?.message?.content) {
    throw new Error(`No content from model ${model}`);
  }

  logger.info({ model }, "Article generated successfully");
  return data.choices[0].message.content;
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  model?: string
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const modelsToTry = model ? [model] : FREE_MODELS;

  for (const m of modelsToTry) {
    try {
      return await tryModel(messages, m);
    } catch (err) {
      logger.warn({ model: m, err }, "Falling back to next model");
    }
  }

  throw new Error("All models failed to generate content");
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

function buildImageUrl(description: string, width = 1200, height = 630): string {
  const prompt = encodeURIComponent(
    `${description}, high quality, professional photography, photorealistic, vibrant colors`
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
}

function injectImagesIntoContent(html: string, imageDescriptions: string[]): string {
  if (!imageDescriptions || imageDescriptions.length === 0) return html;

  const images = imageDescriptions.slice(0, 3);
  const h2Regex = /<h2[^>]*>/gi;
  const matches: number[] = [];

  let match;
  while ((match = h2Regex.exec(html)) !== null) {
    matches.push(match.index);
  }

  if (matches.length === 0) {
    const heroImg = `<figure class="article-image article-image--hero">
  <img src="${buildImageUrl(images[0])}" alt="${images[0]}" loading="lazy" style="width:100%;border-radius:12px;margin:16px 0;" />
  <figcaption style="text-align:center;color:#888;font-size:0.85em;margin-top:8px;">${images[0]}</figcaption>
</figure>`;
    return heroImg + "\n" + html;
  }

  let result = html;
  let offset = 0;

  for (let i = 0; i < Math.min(images.length, matches.length); i++) {
    const insertPos = (i === 0) ? 0 : matches[Math.floor(matches.length / images.length * i)] + offset;
    const imgHtml = `\n<figure class="article-image">
  <img src="${buildImageUrl(images[i])}" alt="${images[i]}" loading="lazy" style="width:100%;border-radius:12px;margin:24px 0;" />
  <figcaption style="text-align:center;color:#888;font-size:0.85em;margin-top:8px;">${images[i]}</figcaption>
</figure>\n`;

    if (i === 0) {
      result = imgHtml + result;
      offset += imgHtml.length;
    } else {
      const pos = matches[Math.floor(matches.length / images.length * i)] + offset;
      result = result.slice(0, pos) + imgHtml + result.slice(pos);
      offset += imgHtml.length;
    }
  }

  return result;
}

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
  "imageDescriptions": ["Описание для изображения 1 на английском языке", "Описание для изображения 2 на английском языке", "Описание для изображения 3 на английском языке"]
}

HTML контент должен использовать: h2, h3, p, ul, ol, li, strong, em, blockquote, a (для ссылок).
НЕ включай html, head, body теги — только содержимое статьи.
ВАЖНО: imageDescriptions должны быть на английском языке — они используются для генерации изображений через AI.`;

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
8. 2-3 описания изображений на английском языке для AI-генерации

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

  const imageDescriptions = parsed.imageDescriptions || [];
  const contentWithImages = injectImagesIntoContent(parsed.content, imageDescriptions);

  const wordCount = contentWithImages.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);

  return {
    title: parsed.title,
    seoTitle: parsed.seoTitle,
    metaDescription: parsed.metaDescription,
    excerpt: parsed.excerpt,
    content: contentWithImages,
    imageDescriptions,
    wordCount,
    readingTime,
    keywords,
    category,
    articleType,
  };
}
