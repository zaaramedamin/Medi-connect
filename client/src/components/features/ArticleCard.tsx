import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { ARTICLE_CATEGORY_META, articleCover, articleText, formatArticleDate } from '@/data/articleMeta';
import { useI18n } from '@/i18n';
import type { Article } from '@/types';
import { cn, initialsOf } from '@/lib/utils';

export function ArticleCard({ article }: { article: Article }) {
  const { t, lang } = useI18n();
  const meta = ARTICLE_CATEGORY_META[article.category];
  const Icon = meta.icon;
  const title = articleText(lang, article.title, article.title_fr);
  const excerpt = articleText(lang, article.excerpt, article.excerpt_fr);

  return (
    <Link
      to={`/community/${article.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={articleCover(article)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className={cn('absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm', meta.badge)}>
          <Icon className="h-3 w-3" /> {t(meta.label)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-primary">{title}</h3>
        {excerpt && <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{excerpt}</p>}

        <div className="mt-4 flex items-center gap-2.5 border-t pt-3">
          <AuthorAvatar name={article.author.name} photo={article.author.photos_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{article.author.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {article.author.specialty ?? t('Doctor')} · {formatArticleDate(article.created_at)}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            {article.comment_count}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AuthorAvatar({ name, photo, size = 32 }: { name: string; photo?: string | null; size?: number }) {
  const initials = initialsOf(name);
  if (photo) {
    return <img src={photo} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
    >
      {initials}
    </span>
  );
}
