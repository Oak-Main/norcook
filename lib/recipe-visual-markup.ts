import visuals from './recipe-visuals.json'

const escape = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

/** Supplementary packet figures preserve its direct-child markup contract. */
export function packetVisualMarkup(): string {
  return visuals.filter(asset => asset.recipe === 'kanelsnurrer' && asset.shot !== 'hero').map(asset =>
    `<figure data-block="recipe-illustration" data-shot="${escape(asset.shot)}"><img src="${escape(asset.url)}" width="${asset.width}" height="${asset.height}" data-recipe-visual="${escape(asset.file)}" alt="${escape(asset.alt)}" loading="lazy" decoding="async" style="width:100%;height:auto"><figcaption>${escape(asset.caption)}</figcaption></figure>`
  ).join('')
}
