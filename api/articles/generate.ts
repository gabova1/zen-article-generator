import type { VercelRequest, VercelResponse } from '@vercel/node';

// Используем бесплатный API Hugging Face
const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";
const HF_API_KEY = "hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Публичный inference API не требует ключ

async function generateWithHuggingFace(prompt: string): Promise<string> {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HuggingFace API failed: ${response.status}`);
  }

  const data = await response.json();
  return data[0]?.generated_text || "";
}

function buildImageUrl(description: string, seed: number): string {
  const prompt = encodeURIComponent(`${description}, high quality, professional photography, photorealistic, vibrant colors`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=630&nologo=true&seed=${seed}`;
}

function injectImagesIntoContent(html: string, imageDescriptions: string[]): string {
  if (!imageDescriptions || imageDescriptions.length === 0) return html;

  const images = imageDescriptions.slice(0, 5);
  const h2Regex = /<h2[^>]*>/gi;
  const matches: number[] = [];

  let match;
  while ((match = h2Regex.exec(html)) !== null) {
    matches.push(match.index);
  }

  if (matches.length === 0) {
    const heroImg = `<figure class="article-image article-image--hero">
  <img src="${buildImageUrl(images[0], 1)}" alt="${images[0]}" loading="lazy" style="width:100%;border-radius:12px;margin:16px 0;" />
  <figcaption style="text-align:center;color:#888;font-size:0.85em;margin-top:8px;">${images[0]}</figcaption>
</figure>`;
    return heroImg + "\n" + html;
  }

  let result = html;
  let offset = 0;

  for (let i = 0; i < Math.min(images.length, matches.length); i++) {
    const insertPos = (i === 0) ? 0 : matches[Math.floor(matches.length / images.length * i)] + offset;
    const imgHtml = `\n<figure class="article-image">
  <img src="${buildImageUrl(images[i], i + 1)}" alt="${images[i]}" loading="lazy" style="width:100%;border-radius:12px;margin:24px 0;" />
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, category, keywords = [], articleType, imageCount = 3, tone = 'friendly', length = 'medium', targetAudience, productUrl } = req.body;

    const toneMap: Record<string, string> = {
      friendly: 'дружелюбный',
      formal: 'формальный',
      expert: 'экспертный',
      casual: 'неформальный',
    };

    const typeMap: Record<string, string> = {
      review: 'обзор',
      guide: 'руководство',
      listicle: 'список',
      news: 'новость',
      opinion: 'мнение',
    };

    const lengthMap: Record<string, string> = {
      short: '800-1200 слов',
      medium: '1500-2500 слов',
      long: '3000-5000 слов',
    };

    const prompt = `Напиши ${typeMap[articleType] || articleType} для Яндекс Дзен на тему: "${topic}"

Категория: ${category}
Тон: ${toneMap[tone] || tone}
Объём: ${lengthMap[length] || 'средний'}
${keywords.length > 0 ? `Ключевые слова: ${keywords.join(', ')}` : ''}
${targetAudience ? `Целевая аудитория: ${targetAudience}` : ''}
${productUrl ? `Включи ссылку на продукт: ${productUrl}` : ''}

Создай статью в следующем формате:

ЗАГОЛОВОК: [Цепляющий заголовок]

SEO_ЗАГОЛОВОК: [SEO заголовок до 60 символов]

МЕТА_ОПИСАНИЕ: [Мета-описание 120-160 символов]

ВСТУПЛЕНИЕ: [Краткое вступление 2-3 предложения]

КОНТЕНТ:
<h2>Первый раздел</h2>
<p>Текст первого раздела...</p>

<h2>Второй раздел</h2>
<p>Текст второго раздела...</p>

<h2>Третий раздел</h2>
<p>Текст третьего раздела...</p>

<h2>Заключение</h2>
<p>Призыв к действию...</p>

${imageCount > 0 ? `ИЗОБРАЖЕНИЯ: [${imageCount} описаний на английском через запятую]` : ''}

Используй HTML теги: h2, h3, p, ul, ol, li, strong, em, blockquote, a.`;

    const generated = await generateWithHuggingFace(prompt);

    // Парсим ответ
    const titleMatch = generated.match(/ЗАГОЛОВОК:\s*(.+?)(?:\n|$)/i);
    const seoTitleMatch = generated.match(/SEO_ЗАГОЛОВОК:\s*(.+?)(?:\n|$)/i);
    const metaMatch = generated.match(/МЕТА_ОПИСАНИЕ:\s*(.+?)(?:\n|$)/i);
    const excerptMatch = generated.match(/ВСТУПЛЕНИЕ:\s*(.+?)(?:\n\n|КОНТЕНТ:)/is);
    const contentMatch = generated.match(/КОНТЕНТ:\s*(.+?)(?:\n\nИЗОБРАЖЕНИЯ:|$)/is);
    const imagesMatch = generated.match(/ИЗОБРАЖЕНИЯ:\s*\[(.+?)\]/i);

    const title = titleMatch?.[1]?.trim() || topic;
    const seoTitle = seoTitleMatch?.[1]?.trim() || title.slice(0, 60);
    const metaDescription = metaMatch?.[1]?.trim() || `${title}. Читайте на Яндекс Дзен.`;
    const excerpt = excerptMatch?.[1]?.trim() || `Статья на тему: ${topic}`;
    let content = contentMatch?.[1]?.trim() || `<h2>Введение</h2><p>${topic}</p>`;

    const imageDescriptions = imagesMatch?.[1]
      ? imagesMatch[1].split(',').map(s => s.trim()).filter(Boolean).slice(0, imageCount)
      : imageCount > 0
      ? Array.from({ length: Math.min(imageCount, 3) }, (_, i) => `${topic} illustration ${i + 1}`)
      : [];

    // Вставляем картинки в контент
    if (imageDescriptions.length > 0) {
      content = injectImagesIntoContent(content, imageDescriptions);
    }

    const wordCount = content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);

    res.status(200).json({
      id: Date.now(),
      title,
      seoTitle,
      metaDescription,
      excerpt,
      content,
      imageDescriptions,
      wordCount,
      readingTime,
      keywords,
      category,
      articleType,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: 'generation_error',
      message: 'Не удалось сгенерировать статью. Попробуйте ещё раз.'
    });
  }
}
