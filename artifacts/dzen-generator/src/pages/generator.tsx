import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useGenerateArticle, getListArticlesQueryKey, getGetArticleStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Sparkles, Tag, X, Clock, BookOpen } from "lucide-react";

const formSchema = z.object({
  topic: z.string().min(3, "Введите тему статьи (минимум 3 символа)"),
  category: z.string().min(1, "Выберите категорию"),
  articleType: z.string().min(1, "Выберите тип статьи"),
  keywords: z.array(z.string()).default([]),
  productUrls: z.array(z.string()).default([]),
  targetAudience: z.string().optional(),
  tone: z.string().optional(),
  length: z.string().optional(),
  imageCount: z.number().min(0).max(5).default(3),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORIES = [
  "Технологии", "Лайфстайл", "Путешествия", "Здоровье",
  "Кулинария", "Финансы", "Авто", "Бизнес", "Другое",
];

const ARTICLE_TYPES = [
  { value: "review", label: "Обзор" },
  { value: "guide", label: "Руководство" },
  { value: "listicle", label: "Список" },
  { value: "news", label: "Новость" },
  { value: "opinion", label: "Мнение" },
];

const TONES = [
  { value: "friendly", label: "Дружелюбный" },
  { value: "formal", label: "Формальный" },
  { value: "expert", label: "Экспертный" },
  { value: "casual", label: "Неформальный" },
];

const LENGTHS = [
  { value: "short", label: "Короткая (800–1200 слов)" },
  { value: "medium", label: "Средняя (1500–2500 слов)" },
  { value: "long", label: "Длинная (3000–5000 слов)" },
];

interface GeneratedArticle {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  category: string;
  articleType: string;
  imageDescriptions: string[];
  wordCount: number;
  readingTime: number;
  createdAt: string;
}

export default function GeneratorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [productUrlInput, setProductUrlInput] = useState("");
  const [copiedContent, setCopiedContent] = useState<string | null>(null);

  const mutation = useGenerateArticle({
    mutation: {
      onSuccess: (data) => {
        setArticle(data as GeneratedArticle);
        queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetArticleStatsQueryKey() });
        toast({ title: "Статья сгенерирована!", description: "Ваша статья для Яндекс Дзен готова." });
      },
      onError: (error: unknown) => {
        const errMsg = (error as { data?: { message?: string } })?.data?.message || "Попробуйте ещё раз";
        toast({ title: "Ошибка генерации", description: errMsg, variant: "destructive" });
      },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      category: "",
      articleType: "",
      keywords: [],
      productUrls: [],
      targetAudience: "",
      tone: "friendly",
      length: "medium",
      imageCount: 3,
    },
  });

  const keywords = form.watch("keywords");
  const productUrls = form.watch("productUrls");

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      form.setValue("keywords", [...keywords, kw]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    form.setValue("keywords", keywords.filter((k) => k !== kw));
  };

  const addProductUrl = () => {
    const url = productUrlInput.trim();
    if (url && !productUrls.includes(url)) {
      try {
        new URL(url);
        form.setValue("productUrls", [...productUrls, url]);
        setProductUrlInput("");
      } catch {
        toast({ title: "Ошибка", description: "Введите корректный URL", variant: "destructive" });
      }
    }
  };

  const removeProductUrl = (url: string) => {
    form.setValue("productUrls", productUrls.filter((u) => u !== url));
  };

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      data: {
        topic: values.topic,
        category: values.category,
        articleType: values.articleType as "review" | "guide" | "listicle" | "news" | "opinion",
        keywords: values.keywords,
        productUrl: values.productUrls.length > 0 ? values.productUrls[0] : undefined,
        targetAudience: values.targetAudience || undefined,
        tone: (values.tone as "formal" | "casual" | "expert" | "friendly") || undefined,
        length: (values.length as "short" | "medium" | "long") || undefined,
        imageCount: values.imageCount,
      },
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    if (type === "html") {
      // Копируем HTML как rich text для вставки в Дзен с форматированием
      const blob = new Blob([text], { type: "text/html" });
      const clipboardItem = new ClipboardItem({
        "text/html": blob,
        "text/plain": new Blob([text], { type: "text/plain" })
      });
      await navigator.clipboard.write([clipboardItem]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    setCopiedContent(type);
    toast({ title: "Скопировано!" });
    setTimeout(() => setCopiedContent(null), 2000);
  };

  const htmlToMarkdown = (html: string) => {
    return html
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, "\n## $1\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, "\n### $1\n")
      .replace(/<strong[^>]*>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em[^>]*>(.*?)<\/em>/g, "_$1_")
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
      .replace(/<li[^>]*>(.*?)<\/li>/g, "- $1\n")
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, "> $1\n")
      .replace(/<p[^>]*>(.*?)<\/p>/g, "\n$1\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  return (
    <div className="flex gap-6 p-6 min-h-screen">
      <div className="w-[380px] shrink-0 flex flex-col gap-4">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-foreground">Генератор статей</h1>
          <p className="text-sm text-muted-foreground mt-1">Создайте SEO-оптимизированную статью для Яндекс Дзен</p>
        </div>

        <Card className="border-border">
          <CardContent className="pt-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тема статьи *</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-topic"
                          placeholder="Например: Лучшие смартфоны 2024 года до 30 000 рублей"
                          className="resize-none h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Категория *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Выберите..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="articleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип статьи *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Выберите..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ARTICLE_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="keywords"
                  render={() => (
                    <FormItem>
                      <FormLabel>Ключевые слова</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-keyword"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          placeholder="Добавить ключевое слово..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addKeyword(); }
                          }}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addKeyword} data-testid="button-add-keyword">
                          <Tag className="w-4 h-4" />
                        </Button>
                      </div>
                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {keywords.map((kw) => (
                            <Badge key={kw} variant="secondary" className="text-xs gap-1" data-testid={`tag-keyword-${kw}`}>
                              {kw}
                              <button type="button" onClick={() => removeKeyword(kw)}>
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productUrls"
                  render={() => (
                    <FormItem>
                      <FormLabel>Ссылки на товары</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-product-url"
                          value={productUrlInput}
                          onChange={(e) => setProductUrlInput(e.target.value)}
                          placeholder="https://..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addProductUrl(); }
                          }}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addProductUrl} data-testid="button-add-url">
                          <Tag className="w-4 h-4" />
                        </Button>
                      </div>
                      {productUrls.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-2">
                          {productUrls.map((url) => (
                            <Badge key={url} variant="secondary" className="text-xs gap-1 justify-between" data-testid={`tag-url-${url}`}>
                              <span className="truncate max-w-[250px]">{url}</span>
                              <button type="button" onClick={() => removeProductUrl(url)}>
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Целевая аудитория</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-audience"
                          placeholder="Например: молодые мамы 25–35 лет"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тон</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tone">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TONES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Объём</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-length">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LENGTHS.map((l) => (
                              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="imageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Количество картинок</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-image-count">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Без картинок</SelectItem>
                          <SelectItem value="1">1 картинка</SelectItem>
                          <SelectItem value="2">2 картинки</SelectItem>
                          <SelectItem value="3">3 картинки</SelectItem>
                          <SelectItem value="4">4 картинки</SelectItem>
                          <SelectItem value="5">5 картинок</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                  data-testid="button-generate"
                >
                  {mutation.isPending ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Генерируется...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Сгенерировать статью
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-w-0">
        {mutation.isPending && (
          <div className="space-y-4" data-testid="loading-skeleton">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <div className="space-y-3 mt-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-8 w-1/3 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-2/5 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        )}

        {!mutation.isPending && !article && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center" data-testid="empty-state">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Готов к работе</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              Заполните форму слева и нажмите "Сгенерировать статью". ИИ создаст качественный контент для Яндекс Дзен с правильным SEO, структурой и форматированием.
            </p>
          </div>
        )}

        {article && !mutation.isPending && (
          <div className="space-y-4" data-testid="article-result">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground leading-tight" data-testid="text-article-title">{article.title}</h1>
                <p className="text-muted-foreground mt-1 text-sm" data-testid="text-article-excerpt">{article.excerpt}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(article.content, "html")}
                  data-testid="button-copy-html"
                >
                  {copiedContent === "html" ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  HTML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(htmlToMarkdown(article.content), "markdown")}
                  data-testid="button-copy-markdown"
                >
                  {copiedContent === "markdown" ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  Markdown
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center text-sm">
              <Badge variant="secondary" data-testid="badge-category">{article.category}</Badge>
              <Badge variant="outline" data-testid="badge-type">
                {ARTICLE_TYPES.find((t) => t.value === article.articleType)?.label || article.articleType}
              </Badge>
              <span className="flex items-center gap-1 text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" />
                <span data-testid="text-word-count">{article.wordCount.toLocaleString()} слов</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span data-testid="text-reading-time">{article.readingTime} мин</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SEO заголовок</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-foreground" data-testid="text-seo-title">{article.seoTitle}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Мета-описание</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-foreground" data-testid="text-meta-description">{article.metaDescription}</p>
                </CardContent>
              </Card>
            </div>

            {article.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {article.keywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs" data-testid={`badge-keyword-${kw}`}>{kw}</Badge>
                ))}
              </div>
            )}

            <Card className="border-border">
              <CardContent className="pt-5 pb-5">
                <div
                  data-testid="div-article-content"
                  className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              </CardContent>
            </Card>

            {article.imageDescriptions.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Сгенерированные изображения</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {article.imageDescriptions.map((desc, i) => {
                      const prompt = encodeURIComponent(`${desc}, high quality, professional photography, photorealistic, vibrant colors`);
                      const url = `https://image.pollinations.ai/prompt/${prompt}?width=600&height=380&nologo=true&seed=${i + 1}`;
                      return (
                        <div key={i} className="rounded-lg overflow-hidden border border-border bg-muted" data-testid={`image-preview-${i}`}>
                          <div className="relative aspect-video bg-muted flex items-center justify-center">
                            <img
                              src={url}
                              alt={desc}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground p-2 leading-snug">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
