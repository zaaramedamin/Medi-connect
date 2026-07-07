import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { AuthorAvatar } from '@/components/features/ArticleCard';
import { ARTICLE_CATEGORY_META, articleCover, formatArticleDate } from '@/data/articleMeta';
import { getArticle, addArticleComment, deleteArticle } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function Article() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, role } = useAuthStore();
  const [comment, setComment] = useState('');

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticle(id!),
    enabled: !!id,
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => addArticleComment(Number(id), body),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['article', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteArticle(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      navigate('/community');
    },
  });

  if (isLoading) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="container py-24 text-center">
        <p className="text-lg font-semibold">Article not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/community">Back to community</Link>
        </Button>
      </div>
    );
  }

  const meta = ARTICLE_CATEGORY_META[article.category];
  const Icon = meta.icon;
  const canDelete = !!user && (user.id === article.author_id || role === 'admin');
  const paragraphs = article.body.replace(/\\n/g, '\n').split(/\n{2,}/).filter(Boolean);

  return (
    <article className="animate-fade-in">
      <div className="container max-w-3xl py-8 md:py-12">
        <Link to="/community" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Community
        </Link>

        <BlurFade>
          <div className="mt-6">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', meta.badge)}>
              <Icon className="h-3.5 w-3.5" /> {meta.label}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">{article.title}</h1>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AuthorAvatar name={article.author.name} photo={article.author.photos_url} size={40} />
                <div>
                  <p className="text-sm font-semibold">{article.author.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {article.author.specialty ?? 'Doctor'} · {formatArticleDate(article.created_at)}
                  </p>
                </div>
              </div>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              )}
            </div>
          </div>
        </BlurFade>

        <img src={articleCover(article)} alt="" className="mt-6 aspect-video w-full rounded-2xl border object-cover" />


        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-foreground/90">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {/* Discussion */}
        <section className="mt-12 border-t pt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <MessageCircle className="h-5 w-5 text-primary" />
            Discussion ({article.comments.length})
          </h2>

          {user ? (
            <form
              className="mt-5"
              onSubmit={e => {
                e.preventDefault();
                if (comment.trim()) commentMutation.mutate(comment.trim());
              }}
            >
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                maxLength={1500}
                placeholder="Share your point of view…"
                className="w-full resize-none rounded-xl border bg-card px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="mt-2 flex items-center justify-between">
                {commentMutation.isError ? (
                  <p className="text-xs text-destructive">Could not post your comment. Please try again.</p>
                ) : <span />}
                <Button type="submit" size="sm" disabled={!comment.trim() || commentMutation.isPending}>
                  {commentMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                  Post
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-5 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to join the discussion.
            </p>
          )}

          <div className="mt-6 space-y-5">
            {article.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet — be the first to reply.</p>
            ) : (
              article.comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <AuthorAvatar name={c.author_name} size={36} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{c.author_name}</p>
                      {c.author_role === 'doctor' && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Doctor</span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatArticleDate(c.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/90">{c.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </article>
  );
}
