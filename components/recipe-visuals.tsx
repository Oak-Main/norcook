import Image from 'next/image'
import visuals from '@/lib/recipe-visuals.json'

export function RecipeVisuals({ slug, stage }: { slug: string; stage: 'ingredient' | 'method' }) {
  const selected = visuals.filter(asset => asset.recipe === slug && (
    stage === 'ingredient' ? asset.shot === 'ingredient' : !['ingredient', 'hero'].includes(asset.shot)
  ))
  if (!selected.length) return null
  return <div className="my-6 space-y-6">
    {selected.map(asset => <figure key={asset.file} className="overflow-hidden rounded-xl border border-border bg-card">
      <Image src={asset.url} alt={asset.alt} width={asset.width} height={asset.height}
        data-recipe-visual={asset.file} sizes="(max-width: 768px) 100vw, 448px"
        className="h-auto w-full object-contain" />
      <figcaption className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">{asset.caption}</figcaption>
    </figure>)}
  </div>
}
