import { FileText, Lightbulb, MessagesSquare, type LucideIcon } from 'lucide-react';
import type { ArticleCategory } from '@/types';

export const ARTICLE_CATEGORY_META: Record<ArticleCategory, { label: string; icon: LucideIcon; badge: string }> = {
  report: { label: 'Public report', icon: FileText, badge: 'bg-primary/10 text-primary' },
  advice: { label: 'Advice', icon: Lightbulb, badge: 'bg-accent/10 text-accent' },
  discussion: { label: 'Discussion', icon: MessagesSquare, badge: 'bg-secondary text-secondary-foreground' },
};

export const ARTICLE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'advice', label: 'Advice' },
  { value: 'report', label: 'Reports' },
  { value: 'discussion', label: 'Discussion' },
] as const;

// Real photo used when an article has no cover of its own (per category).
export const ARTICLE_DEFAULT_COVER: Record<ArticleCategory, string> = {
  report: '/articles/default-report.jpg',
  advice: '/articles/default-advice.jpg',
  discussion: '/articles/default-discussion.jpg',
};

export const articleCover = (a: { cover_image: string | null; category: ArticleCategory }) =>
  a.cover_image || ARTICLE_DEFAULT_COVER[a.category];

export const formatArticleDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
