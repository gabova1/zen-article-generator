import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

async function tryModel(messages: any[], model: string): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://zen-article-generator.vercel.app",
      "X-Title": "Yandex Zen Generator",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Model ${model} failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOpenRouter(messages: any[]): Promise<string> {
  for (const model of FREE_MODELS) {
    try {
      return await tryModel(messages, model);
    } catch (err) {
      console.warn(`Model ${model} failed, trying next`);
    }
  }
  throw new Error("All models failed");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, category, keywords = [], articleType, imageCount = 3, tone = 'friendly', length = 'medium' } = req.body;

    const systemPrompt = `Ты — опытный автор контента для платформы Яндекс Дзен. Создай SEO-оптимизированную статью на русском языке.

Формат ответа: СТРОГО JSON объект (без markdown блоков) со следующими полями:
{
  "title": "Заголовок статьи",
  "seoTitle": "SEO заголовок (до 60 символов)",
  "metaDescription": "Мета-описание (120-160 символов)",
  "excerpt": "Краткое вступление (2-3 предложения)",
  "content": "Полный текст в HTML формате",
  "imageDescriptions": [${imageCount > 0 ? '"описание на английском"' : ''}]
}

HTML: используй h2, h3, p, ul, ol, li, strong, em, blockquote, a.
${imageCount > 0 ? `Создай ${imageCount} описаний изображений на английском для AI-генерации.` : 'imageDescriptions должен быть пустым массивом.'}`;

    const userPrompt = `Напиши статью для Яндекс Дзен на тему: "${topic}"
Категория: ${category}
Тип: ${articleType}
Тон: ${tone}
${keywords.length > 0 ? `Ключевые слова: ${keywords.join(', ')}` : ''}

Требования:
1. Цепляющий заголовок
2. Структурированный контент с H2 и H3 заголовками
3. Практические советы и примеры
4. Призыв к действию в конце
${imageCount > 0 ? `5. ${imageCount} описаний изображений на английском` : ''}

Верни только JSON объект.`;

    const content = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const cleanContent = content.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleanContent);

    const wordCount = parsed.content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);

    res.status(200).json({
      id: Date.now(),
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
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'generation_error', message: 'Не удалось сгенерировать статью' });
  }
}
