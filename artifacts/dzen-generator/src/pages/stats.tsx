import { useGetArticleStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, BookOpen, Clock, Layers, Tag } from "lucide-react";

const ARTICLE_TYPE_LABELS: Record<string, string> = {
  review: "Обзор",
  guide: "Руководство",
  listicle: "Список",
  news: "Новость",
  opinion: "Мнение",
};

function StatCard({ title, value, icon: Icon, sub }: { title: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <Card className="border-border" data-testid={`stat-card-${title}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground" data-testid={`stat-value-${title}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1" data-testid={`bar-row-${label}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
          data-testid={`bar-fill-${label}`}
        />
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { data, isLoading } = useGetArticleStats();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="loading-stats">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data || data.totalArticles === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Статистика</h1>
          <p className="text-sm text-muted-foreground mt-1">Аналитика сгенерированных статей</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-stats">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <BarChart3 className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Нет данных</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Сгенерируйте первую статью, чтобы увидеть статистику.
          </p>
        </div>
      </div>
    );
  }

  const categories = Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]);
  const types = Object.entries(data.byType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6 space-y-6" data-testid="stats-page">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Статистика</h1>
        <p className="text-sm text-muted-foreground mt-1">Аналитика сгенерированных статей</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Всего статей"
          value={data.totalArticles}
          icon={BookOpen}
        />
        <StatCard
          title="Ср. слов"
          value={Math.round(data.avgWordCount).toLocaleString()}
          icon={Layers}
          sub="на статью"
        />
        <StatCard
          title="Ср. время чтения"
          value={`${Math.round(data.avgReadingTime)} мин`}
          icon={Clock}
          sub="на статью"
        />
        <StatCard
          title="Категорий"
          value={categories.length}
          icon={Tag}
          sub="использовано"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border" data-testid="card-categories">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">По категориям</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map(([cat, count]) => (
              <BarRow key={cat} label={cat} count={count} total={data.totalArticles} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-border" data-testid="card-types">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">По типам</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {types.map(([type, count]) => (
              <BarRow
                key={type}
                label={ARTICLE_TYPE_LABELS[type] || type}
                count={count}
                total={data.totalArticles}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
