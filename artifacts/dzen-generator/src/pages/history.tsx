import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListArticles, useDeleteArticle, getListArticlesQueryKey, getGetArticleStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Eye, Clock, BookOpen, Calendar, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";

const ARTICLE_TYPE_LABELS: Record<string, string> = {
  review: "Обзор",
  guide: "Руководство",
  listicle: "Список",
  news: "Новость",
  opinion: "Мнение",
};

interface Article {
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
  topic: string;
  productUrl?: string;
  createdAt: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [copiedContent, setCopiedContent] = useState<string | null>(null);

  const { data, isLoading } = useListArticles({ page, limit: 10 }, {
    query: { queryKey: getListArticlesQueryKey({ page, limit: 10 }) },
  });

  const deleteMutation = useDeleteArticle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetArticleStatsQueryKey() });
        toast({ title: "Статья удалена" });
        if (selectedArticle) setSelectedArticle(null);
      },
      onError: () => {
        toast({ title: "Ошибка удаления", variant: "destructive" });
      },
    },
  });

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">История статей</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data ? `${data.total} ${data.total === 1 ? "статья" : data.total < 5 ? "статьи" : "статей"}` : ""}
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3" data-testid="loading-articles">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2 mt-3">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 ml-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (!data || data.articles.length === 0) && (
        <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-history">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Нет статей</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Сгенерируйте свою первую статью для Яндекс Дзен на странице генератора.
          </p>
        </div>
      )}

      {!isLoading && data && data.articles.length > 0 && (
        <div className="space-y-3" data-testid="article-list">
          {data.articles.map((article) => (
            <Card key={article.id} className="border-border hover:border-primary/30 transition-colors" data-testid={`card-article-${article.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm leading-snug mb-1 truncate" data-testid={`text-title-${article.id}`}>
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground text-xs line-clamp-2 mb-3" data-testid={`text-excerpt-${article.id}`}>
                      {article.excerpt}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-cat-${article.id}`}>{article.category}</Badge>
                      <Badge variant="outline" className="text-xs" data-testid={`badge-type-${article.id}`}>
                        {ARTICLE_TYPE_LABELS[article.articleType] || article.articleType}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-words-${article.id}`}>
                        <BookOpen className="w-3 h-3" />
                        {article.wordCount.toLocaleString()} слов
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-time-${article.id}`}>
                        <Clock className="w-3 h-3" />
                        {article.readingTime} мин
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-date-${article.id}`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(article.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedArticle(article as unknown as Article)}
                      data-testid={`button-view-${article.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          data-testid={`button-delete-${article.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Статья будет удалена безвозвратно.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate({ id: article.id })}
                            data-testid={`button-confirm-delete-${article.id}`}
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6" data-testid="pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </Button>
          <span className="text-sm text-muted-foreground" data-testid="text-page">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            data-testid="button-next-page"
          >
            Вперёд
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-article-view">
          {selectedArticle && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg leading-snug pr-8" data-testid="dialog-article-title">
                  {selectedArticle.title}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap gap-2 items-center py-2">
                <Badge variant="secondary">{selectedArticle.category}</Badge>
                <Badge variant="outline">
                  {ARTICLE_TYPE_LABELS[selectedArticle.articleType] || selectedArticle.articleType}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  {selectedArticle.wordCount.toLocaleString()} слов
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {selectedArticle.readingTime} мин
                </span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(selectedArticle.content, "html")}
                  data-testid="button-dialog-copy-html"
                >
                  {copiedContent === "html" ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  Копировать HTML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(htmlToMarkdown(selectedArticle.content), "markdown")}
                  data-testid="button-dialog-copy-markdown"
                >
                  {copiedContent === "markdown" ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  Копировать Markdown
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Удалить
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
                      <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMutation.mutate({ id: selectedArticle.id })}
                      >
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="border-t border-border pt-4">
                <div
                  className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-sm"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              </div>

              {selectedArticle.imageDescriptions.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Рекомендуемые изображения</p>
                  <ul className="space-y-1.5">
                    {selectedArticle.imageDescriptions.map((desc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                        {desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
