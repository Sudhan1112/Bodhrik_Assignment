/** Frontend taxonomy — extensible; maps seed provider.category slugs to marketplace buckets */

export type TaxonomySlug = 'beauty' | 'healthcare' | 'professional';

export interface TaxonomyCategory {
  slug: TaxonomySlug;
  title: string;
  description: string;
  /** Provider.category values that map here */
  providerTypes: string[];
  /** Popular service suggestion labels for search (honest seeds) */
  popularServices: string[];
  image: string;
}

export const TAXONOMY: TaxonomyCategory[] = [
  {
    slug: 'beauty',
    title: 'Hair & Beauty',
    description: 'Cuts, colour, and care',
    providerTypes: ['salon'],
    /** Labels that match seed service/provider text (or expand via explore search) */
    popularServices: ['Cut', 'Blowout', 'Colour'],
    image:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
  },
  {
    slug: 'healthcare',
    title: 'Healthcare',
    description: 'Appointments with clear follow-ups',
    providerTypes: ['clinic'],
    popularServices: ['Follow-up', 'New Patient Visit'],
    image:
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
  },
  {
    slug: 'professional',
    title: 'Professional',
    description: 'Advice you can book',
    providerTypes: ['consulting'],
    popularServices: ['Strategy Session', 'Consulting'],
    image:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
  },
];

export function getTaxonomyBySlug(slug: string): TaxonomyCategory | undefined {
  return TAXONOMY.find((t) => t.slug === slug);
}

export function getTaxonomyForProviderCategory(
  category: string | null | undefined,
): TaxonomyCategory | undefined {
  if (!category) return undefined;
  const c = category.toLowerCase();
  return TAXONOMY.find((t) => t.providerTypes.includes(c));
}

/** Backend category query value for a taxonomy slug (first provider type) */
export function providerCategoryQuery(slug: string): string | undefined {
  const t = getTaxonomyBySlug(slug);
  return t?.providerTypes[0];
}

export function taxonomyTitleForProviderCategory(
  category: string | null | undefined,
): string {
  return getTaxonomyForProviderCategory(category)?.title || category || 'Service';
}

export function popularSearchChips(): Array<{ label: string; href: string }> {
  const chips: Array<{ label: string; href: string }> = [];
  for (const t of TAXONOMY) {
    chips.push({
      label: t.title,
      href: '/categories/' + t.slug,
    });
    if (t.popularServices[0]) {
      chips.push({
        label: t.popularServices[0],
        href:
          '/explore?q=' +
          encodeURIComponent(t.popularServices[0]) +
          '&category=' +
          (t.providerTypes[0] || ''),
      });
    }
  }
  return chips.slice(0, 6);
}

/** Needles for client-side provider+service matching (no backend change). */
export function searchNeedles(q: string): string[] {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  const out = new Set<string>([n]);
  if (n.includes('haircut') || n === 'hair cut') {
    out.add('cut');
    out.add('fade');
  }
  if (n.includes('coloring') || n.includes('colouring') || n === 'color' || n === 'colour') {
    out.add('colour');
    out.add('color');
  }
  if (n.includes('styling') || n === 'style') {
    out.add('blowout');
    out.add('style');
  }
  if (n.includes('check-up') || n === 'checkup' || n === 'consultation') {
    out.add('visit');
    out.add('follow-up');
    out.add('patient');
  }
  return Array.from(out);
}
