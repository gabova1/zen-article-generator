import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  seoTitle: text("seo_title").notNull(),
  metaDescription: text("meta_description").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  category: text("category").notNull(),
  articleType: text("article_type").notNull(),
  imageDescriptions: jsonb("image_descriptions").$type<string[]>().notNull().default([]),
  wordCount: integer("word_count").notNull().default(0),
  readingTime: integer("reading_time").notNull().default(0),
  productUrl: text("product_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, createdAt: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
