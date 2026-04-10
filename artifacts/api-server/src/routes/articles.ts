import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";
import {
  GenerateArticleBody,
  GetArticleParams,
  DeleteArticleParams,
  SaveArticleParams,
  ListArticlesQueryParams,
  GenerateArticleResponse,
  ListArticlesResponse,
  GetArticleResponse,
  DeleteArticleResponse,
  SaveArticleResponse,
  GetArticleStatsResponse,
} from "@workspace/api-zod";
import { generateDzenArticle } from "../lib/openrouter";

const router: IRouter = Router();

router.post("/articles/generate", async (req, res): Promise<void> => {
  const parsed = GenerateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid generate article request");
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  try {
    const generated = await generateDzenArticle(parsed.data);

    const [saved] = await db
      .insert(articlesTable)
      .values({
        topic: parsed.data.topic,
        title: generated.title,
        content: generated.content,
        excerpt: generated.excerpt,
        seoTitle: generated.seoTitle,
        metaDescription: generated.metaDescription,
        keywords: generated.keywords,
        category: generated.category,
        articleType: generated.articleType,
        imageDescriptions: generated.imageDescriptions,
        wordCount: generated.wordCount,
        readingTime: generated.readingTime,
        productUrl: parsed.data.productUrl ?? null,
      })
      .returning();

    res.json(GenerateArticleResponse.parse(saved));
  } catch (err) {
    req.log.error({ err }, "Failed to generate article");
    res.status(500).json({ error: "generation_error", message: "Не удалось сгенерировать статью. Попробуйте ещё раз." });
  }
});

router.get("/articles/stats", async (req, res): Promise<void> => {
  try {
    const articles = await db.select().from(articlesTable);
    const totalArticles = articles.length;

    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalWords = 0;
    let totalReadingTime = 0;

    for (const article of articles) {
      byCategory[article.category] = (byCategory[article.category] || 0) + 1;
      byType[article.articleType] = (byType[article.articleType] || 0) + 1;
      totalWords += article.wordCount;
      totalReadingTime += article.readingTime;
    }

    const avgWordCount = totalArticles > 0 ? totalWords / totalArticles : 0;
    const avgReadingTime = totalArticles > 0 ? totalReadingTime / totalArticles : 0;

    res.json(GetArticleStatsResponse.parse({
      totalArticles,
      byCategory,
      byType,
      avgWordCount,
      avgReadingTime,
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to get article stats");
    res.status(500).json({ error: "server_error", message: "Ошибка получения статистики" });
  }
});

router.get("/articles", async (req, res): Promise<void> => {
  const query = ListArticlesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "validation_error", message: query.error.message });
    return;
  }

  const page = query.data.page ?? 1;
  const limit = query.data.limit ?? 10;
  const offset = (page - 1) * limit;

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(articlesTable);
  const total = Number(countResult?.count ?? 0);

  const articles = await db
    .select()
    .from(articlesTable)
    .orderBy(sql`${articlesTable.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(total / limit);

  res.json(ListArticlesResponse.parse({
    articles,
    total,
    page,
    limit,
    totalPages,
  }));
});

router.get("/articles/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetArticleParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid ID" });
    return;
  }

  const [article] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));

  if (!article) {
    res.status(404).json({ error: "not_found", message: "Статья не найдена" });
    return;
  }

  res.json(GetArticleResponse.parse(article));
});

router.delete("/articles/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteArticleParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid ID" });
    return;
  }

  const [deleted] = await db
    .delete(articlesTable)
    .where(eq(articlesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Статья не найдена" });
    return;
  }

  res.json(DeleteArticleResponse.parse({ success: true, message: "Статья удалена" }));
});

router.post("/articles/:id/save", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = SaveArticleParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid ID" });
    return;
  }

  const [article] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));

  if (!article) {
    res.status(404).json({ error: "not_found", message: "Статья не найдена" });
    return;
  }

  res.json(SaveArticleResponse.parse({ success: true, message: "Статья сохранена" }));
});

export default router;
