import Link from 'next/link';
import type { TaxonomyCategory } from '@/lib/taxonomy';

export function CategoryCard({
  category,
  count,
}: {
  category: TaxonomyCategory;
  count?: number;
}) {
  return (
    <Link
      href={'/categories/' + category.slug}
      className="group card overflow-hidden transition-shadow duration-med hover:shadow-lift"
    >
      <div
        className="aspect-[16/10] overflow-hidden bg-subtle bg-cover bg-center transition-transform duration-med group-hover:scale-[1.03]"
        style={{ backgroundImage: 'url(' + category.image + ')' }}
      />
      <div className="p-4">
        <h3 className="font-sans text-h3 font-semibold text-ink group-hover:text-teal">
          {category.title}
        </h3>
        <p className="mt-1 font-sans text-small text-muted">{category.description}</p>
        {count != null ? (
          <p className="mt-2 font-sans text-caption text-muted">
            {count} provider{count === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function CategoryGrid({
  items,
}: {
  items: Array<{ category: TaxonomyCategory; count?: number }>;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ category, count }) => (
        <CategoryCard key={category.slug} category={category} count={count} />
      ))}
    </div>
  );
}
