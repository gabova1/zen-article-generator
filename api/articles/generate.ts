import type { VercelRequest, VercelResponse } from '@vercel/node';

// Простая генерация статьи без внешних API - используем шаблоны
function generateArticleFromTemplate(params: any): any {
  const { topic, category, keywords = [], articleType, imageCount = 3, tone = 'friendly', length = 'medium', targetAudience, productUrl } = params;

  const toneMap: Record<string, string> = {
    friendly: 'дружелюбный',
    formal: 'формальный',
    expert: 'экспертный',
    casual: 'неформальный',
  };

  const typeMap: Record<string, string> = {
    review: 'Обзор',
    guide: 'Руководство',
    listicle: 'Топ',
    news: 'Новость',
    opinion: 'Мнение',
  };

  // Генерируем заголовок
  const title = `${typeMap[articleType] || 'Статья'}: ${topic}`;
  const seoTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
  const metaDescription = `${title}. Подробная информация о ${topic.toLowerCase()}. Читайте на Яндекс Дзен.`;
  const excerpt = `В этой статье мы подробно рассмотрим ${topic.toLowerCase()}. Вы узнаете все самое важное и интересное по этой теме.`;

  // Генерируем контент
  let content = `<h2>Введение</h2>
<p>Сегодня мы поговорим о ${topic.toLowerCase()}. Эта тема интересует многих, и мы постараемся раскрыть её максимально подробно.</p>

<h2>Основная информация</h2>
<p>${topic} — это важная тема, которая заслуживает внимания. Давайте разберемся в деталях.</p>`;

  if (keywords.length > 0) {
    content += `\n\n<h2>Ключевые моменты</h2>
<ul>`;
    keywords.slice(0, 5).forEach((kw: string) => {
      content += `\n<li><strong>${kw}</strong> — важный аспект темы ${topic.toLowerCase()}</li>`;
    });
    content += `\n</ul>`;
  }

  if (articleType === 'listicle') {
    content += `\n\n<h2>Топ-5 фактов о ${topic}</h2>
<ol>
<li><strong>Первый факт:</strong> ${topic} имеет долгую историю и богатые традиции.</li>
<li><strong>Второй факт:</strong> Многие эксперты считают ${topic.toLowerCase()} одним из ключевых направлений.</li>
<li><strong>Третий факт:</strong> ${topic} постоянно развивается и совершенствуется.</li>
<li><strong>Четвертый факт:</strong> Существует множество подходов к ${topic.toLowerCase()}.</li>
<li><strong>Пятый факт:</strong> ${topic} становится всё более популярным.</li>
</ol>`;
  }

  if (articleType === 'guide') {
    content += `\n\n<h2>Пошаговое руководство</h2>
<h3>Шаг 1: Подготовка</h3>
<p>Прежде чем начать работу с ${topic.toLowerCase()}, важно правильно подготовиться.</p>

<h3>Шаг 2: Основные действия</h3>
<p>Теперь переходим к основным действиям. Следуйте инструкциям внимательно.</p>

<h3>Шаг 3: Завершение</h3>
<p>На финальном этапе убедитесь, что всё сделано правильно.</p>`;
  }

  if (articleType === 'review') {
    content += `\n\n<h2>Преимущества</h2>
<ul>
<li>Высокое качество</li>
<li>Удобство использования</li>
<li>Доступная цена</li>
<li>Надежность</li>
</ul>

<h2>Недостатки</h2>
<ul>
<li>Требует времени на освоение</li>
<li>Не всегда доступно</li>
</ul>`;
  }

  if (targetAudience) {
    content += `\n\n<h2>Для кого это подходит</h2>
<p>Эта информация будет особенно полезна для ${targetAudience}.</p>`;
  }

  if (productUrl) {
    content += `\n\n<h2>Где приобрести</h2>
<p>Вы можете узнать больше и приобрести по <a href="${productUrl}" target="_blank" rel="noopener">этой ссылке</a>.</p>`;
  }

  content += `\n\n<h2>Заключение</h2>
<p>Надеемся, эта статья помогла вам лучше понять ${topic.toLowerCase()}. Если у вас остались вопросы — пишите в комментариях!</p>

<p><strong>Подписывайтесь на наш канал, чтобы не пропустить новые материалы!</strong></p>`;

  // Генерируем описания изображений
  const imageDescriptions: string[] = [];
  if (imageCount > 0) {
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      imageDescriptions.push(`${topic} illustration ${i + 1}, professional photo, high quality`);
    }
  }

  return {
    title,
    seoTitle,
    metaDescription,
    excerpt,
    content,
    imageDescriptions,
  };
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
  // Добавляем CORS заголовки
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const params = req.body;

    // Генерируем статью из шаблона
    const generated = generateArticleFromTemplate(params);

    // Вставляем картинки в контент
    let content = generated.content;
    if (generated.imageDescriptions.length > 0) {
      content = injectImagesIntoContent(content, generated.imageDescriptions);
    }

    const wordCount = content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);

    res.status(200).json({
      id: Date.now(),
      title: generated.title,
      seoTitle: generated.seoTitle,
      metaDescription: generated.metaDescription,
      excerpt: generated.excerpt,
      content,
      imageDescriptions: generated.imageDescriptions,
      wordCount,
      readingTime,
      keywords: params.keywords || [],
      category: params.category,
      articleType: params.articleType,
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
