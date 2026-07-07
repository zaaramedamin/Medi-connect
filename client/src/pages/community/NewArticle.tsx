import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, PenSquare, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { createArticle } from '@/services/api';
import type { ArticleCategory } from '@/types';

const CATEGORY_OPTIONS: { value: ArticleCategory; label: string; hint: string }[] = [
  { value: 'advice', label: 'Advice', hint: 'Practical guidance for patients' },
  { value: 'report', label: 'Public report', hint: 'An update on what you are seeing' },
  { value: 'discussion', label: 'Discussion', hint: 'Open a topic for other doctors' },
];

const LABEL = 'block text-sm font-semibold mb-1.5';
const FIELD = 'w-full rounded-xl border bg-card px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function NewArticle() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ArticleCategory>('advice');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [body, setBody] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createArticle({
        title: title.trim(),
        category,
        excerpt: excerpt.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
        body: body.trim(),
      }),
    onSuccess: data => navigate(`/community/${data.id}`),
  });

  const canSubmit = title.trim().length > 3 && body.trim().length > 20;

  return (
    <div className="animate-fade-in">
      <div className="container max-w-2xl py-8 md:py-12">
        <Link to="/community" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Community
        </Link>

        <BlurFade>
          <div className="mt-6 mb-8">
            <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
              <PenSquare className="h-6 w-6 text-primary" /> Write an article
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Share a report, advice, or open a discussion. This is published publicly under your name.
            </p>
          </div>
        </BlurFade>

        <form
          className="space-y-5"
          onSubmit={e => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div>
            <label htmlFor="title" className={LABEL}>Title</label>
            <Input
              id="title"
              className="h-11 rounded-xl"
              placeholder="e.g. Understanding your blood pressure numbers"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={160}
            />
          </div>

          <div>
            <span className={LABEL}>Category</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    category === opt.value ? 'border-primary bg-primary/5' : 'hover:border-primary/40'
                  }`}
                >
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="excerpt" className={LABEL}>
              Short summary <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="excerpt"
              className="h-11 rounded-xl"
              placeholder="One or two sentences shown on the article card."
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              maxLength={300}
            />
          </div>

          <div>
            <label htmlFor="cover" className={LABEL}>
              Cover image URL <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="cover"
              className="h-11 rounded-xl"
              placeholder="https://…"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              maxLength={500}
            />
          </div>

          <div>
            <label htmlFor="body" className={LABEL}>Article</label>
            <textarea
              id="body"
              rows={12}
              className={`${FIELD} resize-y leading-relaxed`}
              placeholder="Write your article here. Leave a blank line between paragraphs."
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={8000}
            />
            <p className="mt-1 text-xs text-muted-foreground">{body.length}/8000 characters</p>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">Could not publish. Please check your input and try again.</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="lg" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PenSquare className="mr-1.5 h-4 w-4" />}
              Publish
            </Button>
            <Button type="button" variant="ghost" size="lg" asChild>
              <Link to="/community">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
