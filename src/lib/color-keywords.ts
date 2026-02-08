import { db } from '@/db';
import { colorKeywords } from '@/db/schema';
import { desc } from 'drizzle-orm';

export interface ColorKeyword {
  id: number;
  keyword: string;
  color: string;
  priority: number;
}

export function getColorKeywords(): ColorKeyword[] {
  return db.select().from(colorKeywords).orderBy(desc(colorKeywords.priority)).all();
}

export function resolveKeywordColor(className: string, keywords: ColorKeyword[]): string | null {
  const nameLower = className.toLowerCase();
  for (const kw of keywords) {
    if (nameLower.includes(kw.keyword.toLowerCase())) {
      return kw.color;
    }
  }
  return null;
}
