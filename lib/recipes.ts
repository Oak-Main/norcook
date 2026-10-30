import { RECIPE_DETAILS } from './recipe-details'
import { nutritionForIngredientLine, type IngredientNutrition } from './nutrition'
import type { RegionSlug } from './recipe-taxonomy'

export { REGIONS, TOTAL_RECIPES, getRegion } from './recipe-taxonomy'
export type { Region, RegionSlug } from './recipe-taxonomy'

export type Recipe = {
  slug: string
  name: string
  region: RegionSlug
  description: string
  image: string
  cookingTime: string
  difficulty: 'Easy' | 'Moderate' | 'Advanced'
  mainIngredients: string[]
  // Detail-page fields (optional for cards that are data-plugged later)
  history?: string[]
  ingredients?: string[]
  steps?: string[]
  chefTips?: string[]
  tools?: { name: string; note: string; href?: string }[]
  /**
   * Per-100g nutrition for the ingredient lines verified against USDA
   * FoodData Central, keyed by the ingredient line as written. Joined at
   * build time from the committed TrueAPI ingredient dictionary — lines
   * without a verified match are simply absent (never invented numbers).
   */
  ingredientNutrition?: Record<string, IngredientNutrition>
}

/**
 * The 77-recipe index.
 * The first 6 entries carry their detail (history, ingredients, steps, tips,
 * tools) inline as the original reference implementations. The remaining 71
 * carry card data plus a cultural-history intro here, with their finalised
 * ingredients, method, tips and tools merged in by slug from
 * `recipe-details.ts`. The grid, cards and detail template all read from the
 * merged `RECIPES` export as a single source of truth.
 */
const BASE_RECIPES: Recipe[] = [
  {
    slug: 'skillingsboller',
    name: 'Skillingsboller',
    region: 'modern-viral',
    description:
      'The Bergen cinnamon bun that broke the internet — an airy cardamom dough coiled around a molten butter-sugar core.',
    image: '/assets/img/signature-dish-hero-series.webp',
    cookingTime: '2 hr 30 min',
    difficulty: 'Moderate',
    mainIngredients: ['Wheat flour', 'Cardamom', 'Butter', 'Cinnamon', 'Pearl sugar'],
    history: [
      'The skillingsbolle — literally the "shilling bun" — takes its name from the copper coin it once cost on the wharfs of Bergen. For generations it was the everyday indulgence of a rain-soaked harbour city, sold warm from bakeries lining the Bryggen waterfront.',
      'In the last decade it leapt from regional treat to global phenomenon. A single cross-section photograph — that impossibly soft, laminated spiral — turned the humble bun into one of the most photographed pastries on the internet, launching a wave of Nordic baking that continues today.',
      'What sets the Norwegian version apart from its Swedish cousin is restraint: less sugar, a heavier hand with cardamom, and a looser, almost custardy centre that stays molten far longer than you would expect.',
    ],
    ingredients: [
      '500 g strong wheat flour',
      '250 ml whole milk, lukewarm',
      '75 g butter, softened',
      '75 g caster sugar',
      '1 tbsp freshly ground cardamom',
      '25 g fresh yeast (or 9 g dried)',
      '1 tsp fine sea salt',
      'For the filling: 100 g butter, 100 g brown sugar, 2 tbsp cinnamon',
      'Pearl sugar and one beaten egg, to finish',
    ],
    steps: [
      'Warm the milk to blood temperature and dissolve the yeast into it. Let it stand for five minutes until it begins to foam.',
      'Combine flour, sugar, cardamom and salt. Add the milk mixture and softened butter, then knead for 8–10 minutes until the dough is smooth, glossy and pulls cleanly from the bowl.',
      'Cover and prove in a warm place for about one hour, until doubled in size.',
      'Roll the dough into a large rectangle. Spread the softened butter to the edges, then scatter over the brown sugar and cinnamon.',
      'Roll into a tight log, slice into 12 even pieces, and set on lined trays with room to spread. Prove for a further 30–40 minutes.',
      'Brush with beaten egg, shower with pearl sugar, and bake at 220°C for 10–12 minutes until deep gold. Cool just enough to handle — they are best barely warm.',
    ],
    chefTips: [
      'Grind your cardamom fresh from whole pods. Pre-ground powder loses its citrus-eucalyptus lift within weeks and it is the single most important flavour here.',
      'Follow the baking time and temperature above; do not deliberately underbake. The dough should be baked through before serving, and raw dough or egg glaze should not be tasted.',
    ],
    tools: [
      { name: 'Danish dough whisk', note: 'Blends wet, enriched doughs without overworking the gluten.' },
      { name: 'Cast-iron spice grinder', note: 'Cracks cardamom pods to a fragrant, even grind in seconds.' },
      { name: 'Half-sheet baking pans', note: 'Even heat distribution for that uniform golden crust.' },
    ],
  },
  {
    slug: 'fenalar',
    name: 'Fenalår',
    region: 'sapmi',
    description:
      'Professionally salt-cured, air-dried leg of lamb from the far north — sliced paper-thin and served with crisp flatbread and juniper.',
    image: '/images/dish-fenalar.png',
    cookingTime: '20 min',
    difficulty: 'Easy',
    mainIngredients: ['Lamb leg', 'Sea salt', 'Juniper', 'Brown sugar', 'Black pepper'],
    history: [
      'Fenalår is one of Norway\'s oldest preserved foods, with roots reaching back more than a thousand years to a time when curing meat through the endless Arctic winter meant survival.',
      'In Sápmi and the northern valleys, the cured leg became a centrepiece of celebration — reserved for weddings, Christmas and the return of the light. It carries Protected Geographical Indication status today, a mark of how tightly it is bound to place and craft.',
    ],
    ingredients: [
      '500 g professionally produced, ready-to-eat fenalår',
      'Crisp flatbread, to serve',
      'Sour cream, to serve',
      'Crushed juniper berries and black pepper, optional',
    ],
    steps: [
      'Keep the sealed fenalår refrigerated and follow the producer’s use-by and storage instructions.',
      'Remove only the amount you plan to serve, trim any exterior rind as directed by the producer, and slice paper-thin against the grain.',
      'Arrange with crisp flatbread and sour cream. Add a restrained pinch of crushed juniper or black pepper if desired.',
      'Return unused meat to refrigeration promptly; do not leave it on the serving table for more than two hours.',
    ],
    chefTips: [
      'This is intentionally a serving guide, not a home-curing recipe. Dry-curing meat safely requires a validated process and a qualified owner.',
    ],
    tools: [
      { name: 'Long slicing knife', note: 'A flexible blade for translucent, even slices.' },
      { name: 'Chilled serving platter', note: 'Helps keep ready-to-eat slices cold at the table.' },
    ],
  },
  {
    slug: 'gravlaks',
    name: 'Gravlaks',
    region: 'vestlandet',
    description:
      'Fjord salmon cured with dill, salt and sugar until silky and translucent, served with a sweet mustard sauce.',
    image: '/assets/img/norcook-gravlaks-hero-20261030.webp',
    cookingTime: '48 hr cure',
    difficulty: 'Easy',
    mainIngredients: ['Salmon fillet', 'Fresh dill', 'Sea salt', 'Sugar', 'White pepper'],
    history: [
      'The name gravlaks means "buried salmon" — medieval fishermen along the western fjords fermented salmon in the sand above the tide line. The modern version swaps burial for a gentle salt-and-sugar cure, but the principle of transforming raw fish through time and salt endures.',
      'It has become the quiet star of the Norwegian koldtbord, the cold table that anchors every festive gathering from Vestlandet to Oslo.',
    ],
    ingredients: [
      '1 kg salmon fillet, skin on, pin-boned',
      '80 g sea salt',
      '80 g caster sugar',
      '1 large bunch dill, roughly chopped',
      '1 tbsp crushed white peppercorns',
      'For the sauce: 3 tbsp Dijon, 1 tbsp sugar, 1 tbsp vinegar, 100 ml oil, dill',
    ],
    steps: [
      'Mix salt, sugar and pepper. Lay half the dill on a tray, place the salmon skin-side down, and pack the cure over the flesh with the remaining dill.',
      'Cover with cling film, weight with a board and tins, and refrigerate for 48 hours, turning once.',
      'Scrape off the cure, pat dry, and slice thinly on the diagonal.',
      'Whisk the mustard sauce ingredients until emulsified and serve alongside.',
    ],
    chefTips: [
      'Use salmon sold for raw consumption with documented parasite controls. Otherwise follow an authority-validated freezing schedule; 24 hours in a typical home freezer is not a safe general rule.',
    ],
    tools: [
      { name: 'Fish tweezers', note: 'Removes pin bones cleanly before curing.' },
      { name: 'Non-reactive curing tray', note: 'Glass or ceramic keeps the cure from tainting.' },
    ],
  },
  {
    slug: 'fiskesuppe',
    name: 'Bergensk Fiskesuppe',
    region: 'vestlandet',
    description:
      'A velvety Bergen fish soup — sweet root vegetables, white fish and shellfish in a lightly soured cream broth.',
    image: '/images/dish-fiskesuppe.png',
    cookingTime: '55 min',
    difficulty: 'Moderate',
    mainIngredients: ['White fish', 'Shrimp', 'Carrot', 'Cream', 'Leek'],
    history: [
      'Bergen\'s fish soup is a product of the city\'s Hanseatic trading past, where German merchants and Norwegian fishermen shaped a cuisine of thrift and richness. Its faintly sweet-sour edge — from a splash of vinegar and sugar — is the fingerprint of the western coast.',
    ],
    ingredients: [
      '400 g firm white fish (cod or halibut)',
      '150 g peeled shrimp',
      '1 litre good fish stock',
      '2 carrots, finely diced',
      '1 leek, sliced',
      '200 ml double cream',
      '1 egg yolk',
      '1 tbsp white wine vinegar, 1 tsp sugar, chives to finish',
    ],
    steps: [
      'Simmer the diced carrot and leek in the fish stock until just tender.',
      'Temper the cream with the egg yolk, then stir into the gently simmering stock — do not boil.',
      'Balance with vinegar and sugar until the broth tastes bright but rounded.',
      'Slip in the fish, poach for three minutes, add the shrimp to warm through, and finish with chives.',
    ],
    chefTips: [
      'Keep the soup below a simmer once the cream and yolk go in, or the broth will split and lose its silk.',
    ],
    tools: [
      { name: 'Heavy-based soup pot', note: 'Gentle, even heat protects the cream from curdling.' },
      { name: 'Fine mesh skimmer', note: 'Lifts poached fish out intact.' },
    ],
  },
  {
    slug: 'kjottkaker',
    name: 'Kjøttkaker',
    region: 'ostlandet',
    description:
      'Rustic Norwegian meat cakes in a glossy brown gravy, served with lingonberries, peas and buttery mash.',
    image: '/images/dish-kjottkaker.png',
    cookingTime: '1 hr 10 min',
    difficulty: 'Easy',
    mainIngredients: ['Ground beef', 'Onion', 'Nutmeg', 'Beef stock', 'Lingonberry'],
    history: [
      'If any dish is the taste of a weekday childhood in the eastern valleys, it is kjøttkaker — larger and coarser than a meatball, bound with milk-soaked breadcrumb and warmed with nutmeg and ginger. It is comfort food elevated to national institution.',
    ],
    ingredients: [
      '600 g ground beef',
      '1 onion, finely grated',
      '1 egg',
      '3 tbsp breadcrumbs soaked in 100 ml milk',
      '1/2 tsp nutmeg, 1/2 tsp ginger',
      'For the gravy: 40 g butter, 40 g flour, 700 ml beef stock',
      'Lingonberry jam and boiled peas, to serve',
    ],
    steps: [
      'Mix the beef with grated onion, egg, soaked breadcrumbs and spices until sticky. Season generously.',
      'Shape into large oval cakes and brown well in butter on both sides.',
      'Make a roux with butter and flour, whisk in the stock, and return the cakes to braise for 25 minutes.',
      'Serve with mashed potato, peas and a spoonful of lingonberry.',
    ],
    chefTips: [
      'Grate the onion rather than chopping it — the juice loosens the mix and keeps the cakes tender.',
    ],
    tools: [
      { name: 'Cast-iron skillet', note: 'Builds the deep fond that makes the gravy.' },
      { name: 'Balloon whisk', note: 'Keeps the roux-based sauce lump free.' },
    ],
  },
  {
    slug: 'kransekake',
    name: 'Kransekake',
    region: 'sorlandet',
    description:
      'The towering almond ring cake of celebration — chewy marzipan rings stacked and laced with royal icing.',
    image: '/images/dish-kransekake.png',
    cookingTime: '1 hr 40 min',
    difficulty: 'Advanced',
    mainIngredients: ['Ground almonds', 'Icing sugar', 'Egg whites', 'Marzipan', 'Royal icing'],
    history: [
      'No Norwegian wedding, christening or 17th of May is complete without the kransekake — a spiralling tower of eighteen concentric almond rings. Along the southern coast it is often filled with a small bottle of wine or wrapped sweets, a gift hidden inside the architecture of the cake.',
    ],
    ingredients: [
      '500 g ground almonds',
      '500 g icing sugar',
      '3 egg whites',
      'For the icing: 1 egg white, 250 g icing sugar, lemon juice',
    ],
    steps: [
      'Knead almonds, icing sugar and egg whites into a firm, smooth marzipan. Rest overnight.',
      'Roll into ropes and press into graduated kransekake ring moulds.',
      'Bake at 200°C for 10–12 minutes until lightly golden but still chewy.',
      'Cool completely, then stack the rings from largest to smallest, piping zig-zags of royal icing to bind each layer.',
    ],
    chefTips: [
      'The rings should be barely coloured — over-baking turns the chew to crunch. Pull them the moment the edges take on colour.',
    ],
    tools: [
      { name: 'Kransekake ring set', note: 'Graduated moulds for the signature stepped tower.' },
      { name: 'Piping bag with fine tip', note: 'Delivers the delicate white icing zig-zags.' },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* SÁPMI — The North                                                */
  /* ---------------------------------------------------------------- */
  {
    slug: 'bidos',
    name: 'Bidos',
    region: 'sapmi',
    description:
      'The Sami wedding stew — tender reindeer simmered with potatoes and carrots in a deeply savoury broth.',
    image: '/images/recipes/bidos.png',
    cookingTime: '2 hr 30 min',
    difficulty: 'Moderate',
    mainIngredients: ['Reindeer meat', 'Potato', 'Carrot', 'Onion', 'Bone stock'],
    history: [
      'Bidos is the ceremonial dish of Sápmi, ladled out at weddings, confirmations and midwinter gatherings. Built from a single reindeer and the roots that survive the Arctic cellar, it is a stew that carries the whole community around one pot.',
    ],
  },
  {
    slug: 'finnbiff',
    name: 'Finnbiff',
    region: 'sapmi',
    description:
      'Thinly shaved reindeer sautéed with mushrooms, finished with brown cheese and a splash of cream.',
    image: '/images/recipes/finnbiff.png',
    cookingTime: '45 min',
    difficulty: 'Easy',
    mainIngredients: ['Reindeer', 'Mushrooms', 'Brunost', 'Cream', 'Juniper'],
    history: [
      'Sautéed reindeer — finnbiff — is the everyday face of northern cooking, traditionally sliced from a frozen block and seared fast in a hot pan. A knob of brown cheese melted into the sauce gives it the caramel depth that defines the north.',
    ],
  },
  {
    slug: 'reinsdyrstek',
    name: 'Reinsdyrstek',
    region: 'sapmi',
    description:
      'Roast saddle of reindeer with a juniper-and-thyme crust, served pink with a glossy game sauce.',
    image: '/images/recipes/reinsdyrstek.png',
    cookingTime: '1 hr 50 min',
    difficulty: 'Advanced',
    mainIngredients: ['Reindeer saddle', 'Juniper', 'Thyme', 'Game stock', 'Butter'],
    history: [
      'The roast reindeer that crowns a northern Christmas table is a study in restraint: lean, dark meat cooked barely past rare, its wild-herb sweetness carried by a sauce reduced from bones and forest berries.',
    ],
  },
  {
    slug: 'multekrem',
    name: 'Multekrem',
    region: 'sapmi',
    description:
      'Amber cloudberries — the gold of the tundra — folded through softly whipped, lightly sweetened cream.',
    image: '/images/recipes/multekrem.png',
    cookingTime: '15 min',
    difficulty: 'Easy',
    mainIngredients: ['Cloudberries', 'Cream', 'Sugar', 'Vanilla'],
    history: [
      'Cloudberries ripen for only a few weeks across the northern bogs, and their harvest is guarded like treasure. Whipped into cream, they become multekrem — the dessert that closes almost every festive Arctic meal.',
    ],
  },
  {
    slug: 'rokt-roye',
    name: 'Røkt Røye',
    region: 'sapmi',
    description:
      'Arctic char cold-smoked over alderwood until silken and burnished, served with sour cream and dill.',
    image: '/images/recipes/rokt-roye.png',
    cookingTime: '4 hr smoke',
    difficulty: 'Moderate',
    mainIngredients: ['Arctic char', 'Alderwood', 'Sea salt', 'Dill', 'Sour cream'],
    history: [
      'Char thrives in the cold, clear lakes of the far north, and smoking over alder was the surest way to hold summer\'s catch through winter. The result is a fish of rose-gold flesh and gentle woodsmoke.',
    ],
  },
  {
    slug: 'gahkku',
    name: 'Gáhkku',
    region: 'sapmi',
    description:
      'Soft Sami hearth bread with a faint fennel warmth, torn hot and spread with thick butter.',
    image: '/images/recipes/gahkku.png',
    cookingTime: '1 hr 20 min',
    difficulty: 'Easy',
    mainIngredients: ['Wheat flour', 'Milk', 'Fennel', 'Yeast', 'Butter'],
    history: [
      'Gáhkku is the pillow-soft flatbread of Sápmi, once baked directly on hot hearthstones. Pricked all over and griddled until freckled, it is the daily bread that accompanies smoked fish and reindeer alike.',
    ],
  },
  {
    slug: 'reinsdyrpolse',
    name: 'Reinsdyrpølse',
    region: 'sapmi',
    description:
      'Cured, lightly smoked reindeer sausage — dense, wild and faintly sweet — sliced for the mountain table.',
    image: '/images/recipes/reinsdyrpolse.png',
    cookingTime: '2 week cure',
    difficulty: 'Advanced',
    mainIngredients: ['Reindeer', 'Pork fat', 'Juniper', 'Pepper', 'Salt'],
    history: [
      'Every part of the reindeer is honoured in the north, and the sausage is where trimmings meet spice. Cured and gently smoked, reinsdyrpølse is the pocketable provision of herders and skiers.',
    ],
  },
  {
    slug: 'blodklubb',
    name: 'Blodklubb',
    region: 'sapmi',
    description:
      'Dense barley-and-blood dumplings, sliced and pan-fried in butter, served with syrup or bacon.',
    image: '/images/recipes/blodklubb.png',
    cookingTime: '2 hr',
    difficulty: 'Moderate',
    mainIngredients: ['Barley flour', 'Blood', 'Suet', 'Syrup', 'Salt'],
    history: [
      'A frugal winter dish born of nothing wasted, blood dumplings turn the harvest into a compact, iron-rich staple. Sliced and fried the next day, they are humble northern comfort.',
    ],
  },
  {
    slug: 'fjellorret',
    name: 'Fjellørret',
    region: 'sapmi',
    description:
      'Whole mountain trout crisped in brown butter with almonds, its flesh sweet from ice-cold water.',
    image: '/images/recipes/fjellorret.png',
    cookingTime: '30 min',
    difficulty: 'Easy',
    mainIngredients: ['Mountain trout', 'Brown butter', 'Almonds', 'Lemon', 'Parsley'],
    history: [
      'Pulled from high, glacial lakes, mountain trout needs almost nothing — a hot pan, foaming butter and a squeeze of lemon. It is the taste of a fishing trip above the treeline.',
    ],
  },
  {
    slug: 'suovas',
    name: 'Suovas',
    region: 'sapmi',
    description:
      'Smoke-cured reindeer, thinly sliced and seared hot, wrapped in soft gáhkku bread with lingonberry.',
    image: '/images/recipes/suovas.png',
    cookingTime: '35 min',
    difficulty: 'Moderate',
    mainIngredients: ['Smoked reindeer', 'Gáhkku bread', 'Lingonberry', 'Butter', 'Onion'],
    history: [
      'Suovas — from the Sami word for smoke — is reindeer salted and smoked over birch, then fried and folded into warm flatbread. It is the great street food of Sápmi\'s winter markets.',
    ],
  },
  {
    slug: 'rypestek',
    name: 'Rypestek',
    region: 'sapmi',
    description:
      'Roasted ptarmigan in a cream-and-game sauce, the leanest of northern birds turned rich and tender.',
    image: '/images/recipes/rypestek.png',
    cookingTime: '1 hr 15 min',
    difficulty: 'Advanced',
    mainIngredients: ['Ptarmigan', 'Bacon', 'Cream', 'Game stock', 'Juniper'],
    history: [
      'Ptarmigan, the white grouse of the high tundra, is the aristocrat of Norwegian game birds. Barded with bacon and roasted, it appears on the most treasured Christmas tables of the north.',
    ],
  },
  {
    slug: 'kaffeost',
    name: 'Kaffeost',
    region: 'sapmi',
    description:
      'Squeaky cubes of baked cheese dropped into strong, hot coffee — the north\'s beloved warming ritual.',
    image: '/images/recipes/kaffeost.png',
    cookingTime: '20 min',
    difficulty: 'Easy',
    mainIngredients: ['Leipäjuusto cheese', 'Coffee', 'Cream'],
    history: [
      'A tradition shared across the northern Sami and Kven communities, kaffeost drops firm curd cheese into hot coffee, where it softens and squeaks. Equal parts drink and snack, it is hospitality in a cup.',
    ],
  },
  {
    slug: 'hjortestek',
    name: 'Hjortestek',
    region: 'sapmi',
    description:
      'Roast wild venison larded and glazed, served with root-vegetable purée and a dark berry jus.',
    image: '/images/recipes/hjortestek.png',
    cookingTime: '2 hr',
    difficulty: 'Advanced',
    mainIngredients: ['Venison', 'Root vegetables', 'Redcurrant', 'Game stock', 'Butter'],
    history: [
      'Where reindeer gives way to red deer in the northern forests, hjortestek takes the festive stage — dark, lean and mineral, finished with a jus sharpened by wild berries.',
    ],
  },

  /* ---------------------------------------------------------------- */
  /* VESTLANDET — Western Fjords                                       */
  /* ---------------------------------------------------------------- */
  {
    slug: 'kokt-torsk',
    name: 'Kokt Torsk',
    region: 'vestlandet',
    description:
      'Poached winter cod served the coastal way — with its roe, liver, boiled potatoes and melted butter.',
    image: '/images/recipes/kokt-torsk.png',
    cookingTime: '40 min',
    difficulty: 'Easy',
    mainIngredients: ['Fresh cod', 'Cod roe', 'Cod liver', 'Potatoes', 'Butter'],
    history: [
      'When the skrei cod run into the western fjords each winter, the classic reward is kokt torsk: fish poached whole in salted water and served with its own roe and liver — nothing wasted, everything celebrated.',
    ],
  },
  {
    slug: 'klippfisk',
    name: 'Klippfisk (Bacalao)',
    region: 'vestlandet',
    description:
      'Salt-cod stewed with tomatoes, potatoes, onions and olive oil — Norway\'s Iberian-inflected coastal classic.',
    image: '/images/recipes/klippfisk.png',
    cookingTime: '1 hr 30 min',
    difficulty: 'Moderate',
    mainIngredients: ['Salt cod', 'Tomato', 'Potato', 'Onion', 'Olive oil'],
    history: [
      'Kristiansund built its fortune on klippfisk — cod split, salted and dried on the coastal rocks. Trade with Spain and Portugal sent the ships home with tomatoes and olive oil, and bacalao became a Norwegian dish in a Mediterranean accent.',
    ],
  },
  {
    slug: 'lutefisk',
    name: 'Lutefisk',
    region: 'vestlandet',
    description:
      'Lye-cured stockfish poached to a translucent, quivering jelly, served with bacon, peas and mustard.',
    image: '/images/recipes/lutefisk.png',
    cookingTime: '3 day soak',
    difficulty: 'Advanced',
    mainIngredients: ['Stockfish', 'Lye', 'Bacon', 'Green peas', 'Mustard'],
    history: [
      'Few dishes divide a table like lutefisk — dried cod rehydrated in a lye bath until glassy and trembling. Loved and feared in equal measure, it is the great ritual food of the Norwegian Advent.',
    ],
  },
  {
    slug: 'fiskeboller',
    name: 'Fiskeboller',
    region: 'vestlandet',
    description:
      'Feather-light poached fish balls in a silky white sauce, the tinned-pantry staple made from scratch.',
    image: '/images/recipes/fiskeboller.png',
    cookingTime: '50 min',
    difficulty: 'Moderate',
    mainIngredients: ['White fish', 'Milk', 'Potato starch', 'Nutmeg', 'Butter'],
    history: [
      'Homemade fish balls are a world away from the tinned version — whipped from fresh haddock and milk until airy, then poached and cloaked in a nutmeg-scented béchamel. Coastal comfort at its gentlest.',
    ],
  },
  {
    slug: 'plukkfisk',
    name: 'Plukkfisk',
    region: 'vestlandet',
    description:
      'Leftover poached fish and potato, "plucked" into a creamy hash and browned, finished with crisp bacon.',
    image: '/images/recipes/plukkfisk.png',
    cookingTime: '35 min',
    difficulty: 'Easy',
    mainIngredients: ['Cooked cod', 'Potato', 'Cream', 'Onion', 'Bacon'],
    history: [
      'Thrift turned delicious: plukkfisk is what yesterday\'s boiled fish and potatoes become, folded together with cream and topped with bacon. Every fjord village guards its own version.',
    ],
  },
  {
    slug: 'smalahove',
    name: 'Smalahove',
    region: 'vestlandet',
    description:
      'A whole salt-cured, smoked sheep\'s head steamed until tender — the fearless heritage dish of Voss.',
    image: '/images/recipes/smalahove.png',
    cookingTime: '3 hr',
    difficulty: 'Advanced',
    mainIngredients: ['Sheep\'s head', 'Salt', 'Birch smoke', 'Rutabaga', 'Potato'],
    history: [
      'Smalahove is Voss\'s most notorious tradition — a smoked sheep\'s head served whole, eyes and all, eaten from the ear inward. Once peasant survival food, it is now a badge of regional pride.',
    ],
  },
  {
    slug: 'pinnekjott',
    name: 'Pinnekjøtt',
    region: 'vestlandet',
    description:
      'Salt-cured, dried lamb ribs steamed over birch sticks until falling from the bone — the western Christmas roast.',
    image: '/images/recipes/pinnekjott.png',
    cookingTime: '5 hr',
    difficulty: 'Moderate',
    mainIngredients: ['Lamb ribs', 'Salt', 'Birch sticks', 'Rutabaga', 'Potato'],
    history: [
      'Pinnekjøtt — "stick meat" — is the Christmas Eve centrepiece of western Norway. Salted, sometimes smoked ribs are steamed over a rack of peeled birch branches that perfume the meat as it softens.',
    ],
  },
  {
    slug: 'raspeballer',
    name: 'Raspeballer (Komle)',
    region: 'vestlandet',
    description:
      'Dense potato dumplings simmered with salted meat, served with rutabaga, butter and crisp bacon.',
    image: '/images/recipes/raspeballer.png',
    cookingTime: '1 hr 40 min',
    difficulty: 'Moderate',
    mainIngredients: ['Raw potato', 'Barley flour', 'Salted meat', 'Rutabaga', 'Bacon'],
    history: [
      'Known by a dozen names across the coast, the potato dumpling is so beloved that many workplaces still break for komle every Thursday. Grated raw potato binds with flour into a filling, frugal parcel.',
    ],
  },
  {
    slug: 'spekemat',
    name: 'Spekemat',
    region: 'vestlandet',
    description:
      'A platter of air-dried cured meats — lamb, ham and sausage — with scrambled egg, sour cream and flatbread.',
    image: '/images/recipes/spekemat.png',
    cookingTime: '20 min',
    difficulty: 'Easy',
    mainIngredients: ['Cured lamb', 'Cured ham', 'Flatbread', 'Sour cream', 'Scrambled egg'],
    history: [
      'The mountain farms of the west built a whole cuisine on air and salt. A spekemat board — cured lamb, ham and sausage with crisp flatbread — is the taste of high summer pasture and long, slow drying.',
    ],
  },
  {
    slug: 'kveite',
    name: 'Grillet Kveite',
    region: 'vestlandet',
    description:
      'Thick halibut steaks grilled and glazed with brown butter, capers and lemon — pristine fjord fish.',
    image: '/images/recipes/kveite.png',
    cookingTime: '30 min',
    difficulty: 'Moderate',
    mainIngredients: ['Halibut', 'Brown butter', 'Capers', 'Lemon', 'Parsley'],
    history: [
      'Halibut is the king of the fjord\'s white fish — firm, sweet and prized. Grilled simply and dressed in caper brown butter, it needs no embellishment beyond a squeeze of lemon.',
    ],
  },
  {
    slug: 'blaaskjell',
    name: 'Dampede Blåskjell',
    region: 'vestlandet',
    description:
      'Fjord-farmed blue mussels steamed open in white wine, leek and cream, served with grilled bread.',
    image: '/images/recipes/blaaskjell.png',
    cookingTime: '25 min',
    difficulty: 'Easy',
    mainIngredients: ['Blue mussels', 'White wine', 'Leek', 'Cream', 'Parsley'],
    history: [
      'The cold, clean fjords grow some of the world\'s finest blue mussels. Steamed open in minutes with wine and cream, they are the fjord\'s most generous fast food.',
    ],
  },
  {
    slug: 'torrfisk',
    name: 'Tørrfisk',
    region: 'vestlandet',
    description:
      'Wind-dried Lofoten stockfish — intensely savoury — soaked, gently poached and served with root purée.',
    image: '/images/recipes/torrfisk.png',
    cookingTime: '2 day soak',
    difficulty: 'Advanced',
    mainIngredients: ['Stockfish', 'Rutabaga', 'Potato', 'Butter', 'Pepper'],
    history: [
      'Stockfish — cod dried on wooden racks in the Arctic wind — is Norway\'s oldest export, unchanged since the Viking age. Rehydrated and cooked, it delivers a concentrated taste of the sea and the cold.',
    ],
  },
  {
    slug: 'vossakorv',
    name: 'Vossakorv',
    region: 'vestlandet',
    description:
      'A dark, smoky Voss sausage of lamb and beef, simmered and sliced with potatoes and rutabaga mash.',
    image: '/images/recipes/vossakorv.png',
    cookingTime: '1 hr',
    difficulty: 'Moderate',
    mainIngredients: ['Lamb', 'Beef', 'Syrup', 'Birch smoke', 'Potato'],
    history: [
      'The Voss valley\'s smoked sausage is faintly sweet with syrup and deeply perfumed by birch smoke. It anchors the everyday western dinner alongside boiled potatoes and mashed swede.',
    ],
  },
  {
    slug: 'persetorsk',
    name: 'Persetorsk',
    region: 'vestlandet',
    description:
      'Lightly salted, pressed cod with a firm, silky bite, poached and served with bacon-butter and peas.',
    image: '/images/recipes/persetorsk.png',
    cookingTime: '1 day cure',
    difficulty: 'Moderate',
    mainIngredients: ['Cod', 'Salt', 'Bacon', 'Butter', 'Green peas'],
    history: [
      'A gentler cousin of lutefisk, pressed cod is salted and weighted for a day to firm the flesh. The result is a clean, dense fillet that western families favour for a special Sunday.',
    ],
  },

  /* ---------------------------------------------------------------- */
  /* SØRLANDET — Southern Coast                                        */
  /* ---------------------------------------------------------------- */
  {
    slug: 'reker',
    name: 'Reker på Brød',
    region: 'sorlandet',
    description:
      'Sweet, freshly boiled fjord shrimp piled on buttered bread with mayonnaise, dill and lemon.',
    image: '/images/recipes/reker.png',
    cookingTime: '20 min',
    difficulty: 'Easy',
    mainIngredients: ['Fjord shrimp', 'White bread', 'Mayonnaise', 'Lemon', 'Dill'],
    history: [
      'On the white-painted quays of the south coast, summer means a bucket of just-boiled shrimp, a loaf of bread and hours of leisurely peeling. Reker på brød is less a recipe than a way of life.',
    ],
  },
  {
    slug: 'kokt-krabbe',
    name: 'Kokt Krabbe',
    region: 'sorlandet',
    description:
      'Whole boiled coastal crab, dressed simply and served with mayonnaise, lemon and crusty bread.',
    image: '/images/recipes/kokt-krabbe.png',
    cookingTime: '35 min',
    difficulty: 'Moderate',
    mainIngredients: ['Brown crab', 'Sea salt', 'Mayonnaise', 'Lemon', 'Bread'],
    history: [
      'As the water cools in early autumn, the crab pots come up heavy along the skerries. Boiled in seawater and cracked at a garden table, crab is the south coast\'s unhurried feast.',
    ],
  },
  {
    slug: 'sorlandshummer',
    name: 'Sørlandshummer',
    region: 'sorlandet',
    description:
      'Prized cold-water lobster, halved and grilled with herb butter — the jewel of the southern autumn.',
    image: '/images/recipes/sorlandshummer.png',
    cookingTime: '40 min',
    difficulty: 'Advanced',
    mainIngredients: ['Lobster', 'Herb butter', 'Lemon', 'Garlic', 'Parsley'],
    history: [
      'The opening of lobster season in October is a near-sacred date on the south coast. Sweet, firm and deeply flavoured, the cold-water lobster is the region\'s most coveted catch.',
    ],
  },
  {
    slug: 'fiskegrateng',
    name: 'Fiskegrateng',
    region: 'sorlandet',
    description:
      'A comforting baked gratin of flaked fish and macaroni in béchamel, with a golden breadcrumb crust.',
    image: '/images/recipes/fiskegrateng.png',
    cookingTime: '1 hr',
    difficulty: 'Easy',
    mainIngredients: ['White fish', 'Macaroni', 'Milk', 'Cheese', 'Breadcrumbs'],
    history: [
      'The weeknight hero of coastal kitchens, fish gratin stretches a modest fillet with pasta and a cheesy white sauce. It is the taste of a thousand school-day dinners.',
    ],
  },
  {
    slug: 'sursild',
    name: 'Sursild',
    region: 'sorlandet',
    description:
      'Pickled herring in a bright sweet-sour brine with onion, bay and peppercorns — the koldtbord anchor.',
    image: '/images/recipes/sursild.png',
    cookingTime: '2 day cure',
    difficulty: 'Easy',
    mainIngredients: ['Salt herring', 'Vinegar', 'Sugar', 'Onion', 'Bay leaf'],
    history: [
      'Herring built and fed the Norwegian coast for centuries. Cured then steeped in a spiced vinegar brine, sursild is the tangy cornerstone of every festive cold table.',
    ],
  },
  {
    slug: 'sildesalat',
    name: 'Sildesalat',
    region: 'sorlandet',
    description:
      'A jewel-toned salad of pickled herring, beetroot, apple and potato bound in a light soured cream.',
    image: '/images/recipes/sildesalat.png',
    cookingTime: '30 min',
    difficulty: 'Easy',
    mainIngredients: ['Pickled herring', 'Beetroot', 'Apple', 'Potato', 'Sour cream'],
    history: [
      'The pink herring salad is a fixture of Christmas and Easter tables alike, its colour from beetroot and its balance from tart apple. Cool, sweet and sharp, it cuts through a rich spread.',
    ],
  },
  {
    slug: 'stekt-makrell',
    name: 'Stekt Makrell',
    region: 'sorlandet',
    description:
      'Pan-fried summer mackerel with its skin crisped golden, served with stewed rhubarb and sour cream.',
    image: '/images/recipes/stekt-makrell.png',
    cookingTime: '25 min',
    difficulty: 'Easy',
    mainIngredients: ['Mackerel', 'Rhubarb', 'Sour cream', 'Chives', 'Butter'],
    history: [
      'Oily, glittering mackerel arrives with the warm south-coast summer. Fried crisp and served with tart rhubarb compote, it is the flavour of a July evening by the sea.',
    ],
  },
  {
    slug: 'eplekake',
    name: 'Eplekake',
    region: 'sorlandet',
    description:
      'A moist southern apple cake spiced with cinnamon, its top set with tender fruit and a sugar crust.',
    image: '/assets/img/seasonal-food.webp',
    cookingTime: '1 hr 5 min',
    difficulty: 'Easy',
    mainIngredients: ['Apples', 'Butter', 'Cinnamon', 'Flour', 'Sugar'],
    history: [
      'The orchards of the south fill autumn kitchens with apples, and the simplest reward is eplekake — a buttery sponge crowded with fruit, served warm with cold cream or vanilla sauce.',
    ],
  },
  {
    slug: 'kokosboller',
    name: 'Kokosboller',
    region: 'sorlandet',
    description:
      'Airy meringue domes on a biscuit base, cloaked in dark chocolate and a snow of desiccated coconut.',
    image: '/images/recipes/kokosboller.png',
    cookingTime: '1 hr',
    difficulty: 'Moderate',
    mainIngredients: ['Egg whites', 'Sugar', 'Dark chocolate', 'Coconut', 'Biscuit base'],
    history: [
      'The chocolate-coated marshmallow ball is a Norwegian kiosk classic and a fierce object of national loyalty. Homemade, with a whipped meringue centre, it is a genuine treat.',
    ],
  },
  {
    slug: 'kavring',
    name: 'Kavring',
    region: 'sorlandet',
    description:
      'Twice-baked cardamom rusks, crisp and lightly sweet — the coastal coffee companion that keeps for weeks.',
    image: '/images/recipes/kavring.png',
    cookingTime: '2 hr',
    difficulty: 'Moderate',
    mainIngredients: ['Wheat flour', 'Cardamom', 'Butter', 'Sugar', 'Milk'],
    history: [
      'Sailors needed bread that would not spoil, and the answer was kavring — sweet rolls dried slowly until crisp. Dunked in coffee, they carry the frugal ingenuity of the seafaring south.',
    ],
  },
  {
    slug: 'blotkake',
    name: 'Bløtkake',
    region: 'sorlandet',
    description:
      'The celebration cake of Norway — soft sponge soaked in juice, layered with cream, custard and berries.',
    image: '/images/recipes/blotkake.png',
    cookingTime: '1 hr 30 min',
    difficulty: 'Moderate',
    mainIngredients: ['Sponge', 'Cream', 'Vanilla custard', 'Strawberries', 'Fruit juice'],
    history: [
      'No birthday, graduation or 17th of May passes without bløtkake — a cloud-soft layer cake crowned with cream and summer berries, often flagged with tiny Norwegian banners.',
    ],
  },
  {
    slug: 'fyrstekake',
    name: 'Fyrstekake',
    region: 'sorlandet',
    description:
      'The "prince\'s cake" — a short pastry shell filled with almond frangipane under a lattice top.',
    image: '/images/recipes/fyrstekake.png',
    cookingTime: '1 hr 20 min',
    difficulty: 'Moderate',
    mainIngredients: ['Almonds', 'Butter pastry', 'Icing sugar', 'Egg', 'Cardamom'],
    history: [
      'Rich with almonds and latticed on top, fyrstekake is the elegant end to a coastal coffee table. Dense yet delicate, it keeps for days and only improves with them.',
    ],
  },
  {
    slug: 'verdens-beste',
    name: 'Verdens Beste',
    region: 'sorlandet',
    description:
      'Literally "the world\'s best" — meringue-topped sponge layered with vanilla cream and toasted almonds.',
    image: '/images/recipes/verdens-beste.png',
    cookingTime: '1 hr 40 min',
    difficulty: 'Advanced',
    mainIngredients: ['Sponge', 'Meringue', 'Almonds', 'Vanilla cream', 'Butter'],
    history: [
      'Voted the national cake of Norway, kvæfjordkake — better known as "the world\'s best" — layers airy sponge, crackling almond meringue and vanilla cream into pure celebration.',
    ],
  },

  /* ---------------------------------------------------------------- */
  /* ØSTLANDET — Eastern Valleys                                       */
  /* ---------------------------------------------------------------- */
  {
    slug: 'farikal',
    name: 'Fårikål',
    region: 'ostlandet',
    description:
      'Norway\'s national dish — mutton and cabbage layered with whole peppercorns and slowly braised to tenderness.',
    image: '/images/recipes/farikal.png',
    cookingTime: '2 hr 30 min',
    difficulty: 'Easy',
    mainIngredients: ['Mutton', 'Cabbage', 'Black peppercorns', 'Flour', 'Salt'],
    history: [
      'Crowned the national dish by popular vote, fårikål is autumn in a pot: bone-in mutton and cabbage stacked with peppercorns and left to braise until the meat slides from the bone. Its own dedicated Thursday marks the start of the season.',
    ],
  },
  {
    slug: 'lapskaus',
    name: 'Lapskaus',
    region: 'ostlandet',
    description:
      'A thick, homely stew of meat and root vegetables cooked down until spoon-tender and deeply savoury.',
    image: '/images/recipes/lapskaus.png',
    cookingTime: '2 hr',
    difficulty: 'Easy',
    mainIngredients: ['Beef', 'Potato', 'Carrot', 'Rutabaga', 'Leek'],
    history: [
      'Every valley kitchen has a pot of lapskaus in its memory — a catch-all stew that turns the week\'s meat and roots into something greater. Brown or pale, thick or brothy, it is pure everyday nourishment.',
    ],
  },
  {
    slug: 'rakfisk',
    name: 'Rakfisk',
    region: 'ostlandet',
    description:
      'Valdres trout fermented for months to a soft, pungent intensity, served raw with onion, flatbread and sour cream.',
    image: '/images/recipes/rakfisk.png',
    cookingTime: '3 month cure',
    difficulty: 'Advanced',
    mainIngredients: ['Trout', 'Salt', 'Red onion', 'Flatbread', 'Sour cream'],
    history: [
      'From the mountain lakes of Valdres comes rakfisk, trout brined and fermented cold for two to three months. Pungent and prized, it is the daring highlight of the pre-Christmas season.',
    ],
  },
  {
    slug: 'rommegrot',
    name: 'Rømmegrøt',
    region: 'ostlandet',
    description:
      'A rich sour-cream porridge with a butter well, dusted with cinnamon sugar — festival food of the valleys.',
    image: '/images/recipes/rommegrot.png',
    cookingTime: '40 min',
    difficulty: 'Moderate',
    mainIngredients: ['Sour cream', 'Flour', 'Milk', 'Butter', 'Cinnamon'],
    history: [
      'Served at summer farm festivals and to new mothers alike, rømmegrøt is sour cream cooked with flour until the butter separates into golden pools. Ancient, indulgent and unmistakably rural.',
    ],
  },
  {
    slug: 'sodd',
    name: 'Sodd',
    region: 'ostlandet',
    description:
      'A clear, elegant celebration soup of mutton and beef meatballs in a fragrant broth with root vegetables.',
    image: '/images/recipes/sodd.png',
    cookingTime: '2 hr',
    difficulty: 'Moderate',
    mainIngredients: ['Mutton', 'Beef meatballs', 'Carrot', 'Potato', 'Broth'],
    history: [
      'Sodd is the ceremonial soup of confirmations and weddings in the inland regions — a clear, carefully clarified broth carrying delicate meatballs and neat cubes of root vegetable.',
    ],
  },
  {
    slug: 'medisterkaker',
    name: 'Medisterkaker',
    region: 'ostlandet',
    description:
      'Seasoned pork patties fried golden and simmered in gravy — a mainstay of the Christmas table.',
    image: '/images/recipes/medisterkaker.png',
    cookingTime: '1 hr',
    difficulty: 'Easy',
    mainIngredients: ['Ground pork', 'Ginger', 'Nutmeg', 'Potato starch', 'Milk'],
    history: [
      'Alongside the Christmas ribbe you will always find medisterkaker — plump pork patties spiced with ginger and nutmeg. Fried and gravied, they are the season\'s reliable comfort.',
    ],
  },
  {
    slug: 'ribbe',
    name: 'Ribbe',
    region: 'ostlandet',
    description:
      'Slow-roast pork belly with shatteringly crisp crackling — the great Christmas Eve roast of the east.',
    image: '/images/recipes/ribbe.png',
    cookingTime: '3 hr',
    difficulty: 'Advanced',
    mainIngredients: ['Pork belly', 'Salt', 'Pepper', 'Caraway', 'Cloves'],
    history: [
      'For most eastern Norwegian families, Christmas simply is ribbe — a scored slab of pork belly roasted until the rind blisters into glassy crackling. The pursuit of perfect svor is a national obsession.',
    ],
  },
  {
    slug: 'svinestek',
    name: 'Svinestek',
    region: 'ostlandet',
    description:
      'A classic Sunday roast of pork loin with crackling, brown gravy, and lingonberry on the side.',
    image: '/images/recipes/svinestek.png',
    cookingTime: '2 hr',
    difficulty: 'Moderate',
    mainIngredients: ['Pork loin', 'Salt', 'Bay leaf', 'Gravy', 'Lingonberry'],
    history: [
      'The roast pork loin is the archetypal Norwegian søndagsmiddag — the Sunday dinner that gathers the family. Its crackling and dark gravy are the standard against which cooks are judged.',
    ],
  },
  {
    slug: 'blodpudding',
    name: 'Blodpudding',
    region: 'ostlandet',
    description:
      'Sliced blood pudding fried in butter until crisp-edged, served with lingonberry and bacon.',
    image: '/images/recipes/blodpudding.png',
    cookingTime: '45 min',
    difficulty: 'Moderate',
    mainIngredients: ['Blood', 'Rye flour', 'Suet', 'Syrup', 'Lingonberry'],
    history: [
      'A dish of nothing wasted from the autumn slaughter, blood pudding is baked, sliced and fried the next day. Sweet-savoury with lingonberry, it is frugal farm cooking with a long memory.',
    ],
  },
  {
    slug: 'betasuppe',
    name: 'Betasuppe',
    region: 'ostlandet',
    description:
      'A hearty barley soup thick with lamb, root vegetables and cabbage — a one-pot meal for cold days.',
    image: '/images/recipes/betasuppe.png',
    cookingTime: '2 hr',
    difficulty: 'Easy',
    mainIngredients: ['Lamb', 'Barley', 'Carrot', 'Cabbage', 'Leek'],
    history: [
      'Betasuppe is winter fuel from the eastern farms — lamb and barley simmered with whatever roots the cellar holds until the whole pot turns thick and restorative.',
    ],
  },
  {
    slug: 'surkal',
    name: 'Surkål',
    region: 'ostlandet',
    description:
      'Finely shredded cabbage braised with caraway, vinegar and a little sugar — the essential Christmas side.',
    image: '/images/recipes/surkal.png',
    cookingTime: '1 hr',
    difficulty: 'Easy',
    mainIngredients: ['White cabbage', 'Caraway', 'Vinegar', 'Sugar', 'Apple'],
    history: [
      'The bright, caraway-scented braised cabbage that partners ribbe and pinnekjøtt, surkål cuts the richness of the Christmas roast with its gentle sweet-sour edge.',
    ],
  },
  {
    slug: 'tilslorte-bondepiker',
    name: 'Tilslørte Bondepiker',
    region: 'ostlandet',
    description:
      '"Veiled farm girls" — layers of apple compote, buttery breadcrumbs and whipped cream in a glass.',
    image: '/images/recipes/tilslorte-bondepiker.png',
    cookingTime: '35 min',
    difficulty: 'Easy',
    mainIngredients: ['Apples', 'Breadcrumbs', 'Sugar', 'Cream', 'Butter'],
    history: [
      'This whimsically named dessert layers sweet-spiced apple with toasted, caramelised breadcrumbs and cream. Thrifty and beloved, it turns stale bread and windfall apples into something graceful.',
    ],
  },
  {
    slug: 'riskrem',
    name: 'Riskrem',
    region: 'ostlandet',
    description:
      'Cold rice pudding folded with whipped cream and vanilla, crowned with a glossy red berry sauce.',
    image: '/images/recipes/riskrem.png',
    cookingTime: '1 hr',
    difficulty: 'Easy',
    mainIngredients: ['Rice pudding', 'Cream', 'Vanilla', 'Almond', 'Red berries'],
    history: [
      'The Christmas Eve dessert, riskrem hides a single whole almond — whoever finds it wins the marzipan pig. Made from the day\'s leftover rice porridge, it is thrift turned into ritual.',
    ],
  },
  {
    slug: 'ertesuppe',
    name: 'Ertesuppe',
    region: 'ostlandet',
    description:
      'A thick yellow pea soup simmered with smoked pork hock, carrot and thyme — winter in a bowl.',
    image: '/images/recipes/ertesuppe.png',
    cookingTime: '2 hr 15 min',
    difficulty: 'Easy',
    mainIngredients: ['Yellow peas', 'Smoked pork', 'Carrot', 'Leek', 'Thyme'],
    history: [
      'Dried yellow peas and a smoked hock make ertesuppe, a soup so filling it once counted as a full day\'s meal for forestry and farm workers across the eastern interior.',
    ],
  },
  {
    slug: 'kjottsuppe',
    name: 'Kjøttsuppe',
    region: 'ostlandet',
    description:
      'A clear, wholesome meat soup with tender lamb or beef, barley and a garden of root vegetables.',
    image: '/images/recipes/kjottsuppe.png',
    cookingTime: '2 hr',
    difficulty: 'Easy',
    mainIngredients: ['Lamb', 'Barley', 'Carrot', 'Rutabaga', 'Cabbage'],
    history: [
      'The clear meat soup is a gentle everyday classic — meat and roots simmered into a light, nourishing broth thickened only with a little barley. It is the taste of a well-run valley kitchen.',
    ],
  },

  /* ---------------------------------------------------------------- */
  /* MODERN VIRAL BAKING — New Wave                                    */
  /* ---------------------------------------------------------------- */
  {
    slug: 'kanelsnurrer',
    name: 'Kanelsnurrer',
    region: 'modern-viral',
    description:
      'Knotted cinnamon buns with a cardamom crumb — the twisted sibling of the skillingsbolle that rules cafés.',
    image: '/assets/img/norcook-kanelsnurrer-hero-20261030.webp',
    cookingTime: '3–3¾ hr (incl. cooling)',
    difficulty: 'Moderate',
    mainIngredients: ['Wheat flour', 'Cardamom', 'Cinnamon', 'Butter', 'Milk', 'Egg'],
    history: [
      'The knotted cinnamon twist has become the signature bake of the new Nordic café — same cardamom dough as the classic bun, but folded and looped into an intricate knot that shows off the baker\'s hand.',
    ],
  },
  {
    slug: 'kardemommeboller',
    name: 'Kardemommeboller',
    region: 'modern-viral',
    description:
      'Pure cardamom knots — fragrant, feather-light and glazed — the bake that defines new Nordic baking.',
    image: '/images/recipes/kardemommeboller.png',
    cookingTime: '2 hr 15 min',
    difficulty: 'Moderate',
    mainIngredients: ['Wheat flour', 'Cardamom', 'Butter', 'Milk', 'Sugar'],
    history: [
      'Where cinnamon once ruled, cardamom now reigns. The pure cardamom knot — no filling, just an intense hit of freshly ground pods — has become the emblem of the internet\'s Scandinavian baking obsession.',
    ],
  },
  {
    slug: 'skolebrod',
    name: 'Skolebrød',
    region: 'modern-viral',
    description:
      'Custard-filled cardamom buns topped with white glaze and toasted coconut — the "school bread" classic.',
    image: '/images/recipes/skolebrod.png',
    cookingTime: '2 hr 20 min',
    difficulty: 'Moderate',
    mainIngredients: ['Wheat flour', 'Vanilla custard', 'Cardamom', 'Coconut', 'Icing'],
    history: [
      'A lunchbox legend reborn as a café star, skolebrød cradles a pool of vanilla custard in a soft cardamom bun, finished with sweet glaze and a ring of coconut.',
    ],
  },
  {
    slug: 'solskinnsboller',
    name: 'Solskinnsboller',
    region: 'modern-viral',
    description:
      'Golden "sunshine buns" with a glossy custard centre, glazed and bright — pure Nordic bakery comfort.',
    image: '/images/recipes/solskinnsboller.png',
    cookingTime: '2 hr 10 min',
    difficulty: 'Moderate',
    mainIngredients: ['Wheat flour', 'Vanilla custard', 'Cardamom', 'Sugar glaze', 'Egg'],
    history: [
      'Named for the sunny disc of custard at their heart, solskinnsboller are the coconut-free cousin of skolebrød — soft, glossy and unashamedly cheerful.',
    ],
  },
  {
    slug: 'hveteboller',
    name: 'Hveteboller',
    region: 'modern-viral',
    description:
      'Simple sweet cardamom buns studded with pearl sugar or raisins — the plain bun everyone grows up on.',
    image: '/images/recipes/hveteboller.png',
    cookingTime: '2 hr',
    difficulty: 'Easy',
    mainIngredients: ['Wheat flour', 'Cardamom', 'Butter', 'Raisins', 'Pearl sugar'],
    history: [
      'The unfilled sweet bun is the foundation of Norwegian baking — the first thing many children learn to make. Warm from the oven with butter, it needs nothing more.',
    ],
  },
  {
    slug: 'julekake',
    name: 'Julekake',
    region: 'modern-viral',
    description:
      'A cardamom-scented Christmas bread studded with raisins and candied peel, sliced and spread with butter.',
    image: '/images/recipes/julekake.png',
    cookingTime: '3 hr',
    difficulty: 'Moderate',
    mainIngredients: ['Wheat flour', 'Cardamom', 'Raisins', 'Candied peel', 'Butter'],
    history: [
      'The festive loaf of the season, julekake perfumes the whole house with cardamom as it bakes. Sliced and buttered, it bridges breakfast and coffee time through the Christmas weeks.',
    ],
  },
  {
    slug: 'lefse',
    name: 'Lefse',
    region: 'modern-viral',
    description:
      'Soft potato flatbread rolled thin and griddled, spread with butter, sugar and cinnamon and folded.',
    image: '/images/recipes/lefse.png',
    cookingTime: '1 hr 30 min',
    difficulty: 'Moderate',
    mainIngredients: ['Potato', 'Flour', 'Butter', 'Sugar', 'Cinnamon'],
    history: [
      'Lefse spans the whole country in countless forms, but the sweet, buttery rolled version is the one that travels. Tender and faintly earthy from potato, it is comfort you can fold in your hand.',
    ],
  },
  {
    slug: 'krumkake',
    name: 'Krumkaker',
    region: 'modern-viral',
    description:
      'Crisp, patterned wafer cookies rolled into cones on a wooden form — often filled with whipped cream.',
    image: '/images/recipes/krumkake.png',
    cookingTime: '1 hr',
    difficulty: 'Advanced',
    mainIngredients: ['Flour', 'Butter', 'Sugar', 'Cardamom', 'Egg'],
    history: [
      'Baked on an ornate iron and rolled while still hot, krumkaker are the lacy, cone-shaped cookies of the Christmas platter — one of the traditional seven sorts a proud host once baked.',
    ],
  },
  {
    slug: 'goro',
    name: 'Goro',
    region: 'modern-viral',
    description:
      'A delicate cardamom-and-cream wafer, pressed with a decorative iron into elegant rectangles.',
    image: '/images/recipes/goro.png',
    cookingTime: '1 hr 15 min',
    difficulty: 'Advanced',
    mainIngredients: ['Flour', 'Cream', 'Butter', 'Cardamom', 'Sugar'],
    history: [
      'Goro is among the most refined of the Christmas cookies — a rich, faintly cardamom wafer embossed by a patterned iron and trimmed into neat rectangles. A test of patience and heritage.',
    ],
  },
  {
    slug: 'sandkaker',
    name: 'Sandkaker',
    region: 'modern-viral',
    description:
      'Buttery almond tart shells pressed into fluted moulds and baked until sandy-crisp and golden.',
    image: '/images/recipes/sandkaker.png',
    cookingTime: '1 hr 10 min',
    difficulty: 'Moderate',
    mainIngredients: ['Flour', 'Butter', 'Almonds', 'Sugar', 'Egg'],
    history: [
      'Pressed thin into fluted tins, sandkaker bake into crisp little almond shells with a texture like fine sand. Eaten plain or filled with cream and berries, they are Christmas-table staples.',
    ],
  },
  {
    slug: 'berlinerkranser',
    name: 'Berlinerkranser',
    region: 'modern-viral',
    description:
      'Delicate wreath cookies of cooked-yolk dough, tied in a knot and finished with pearl sugar.',
    image: '/images/recipes/berlinerkranser.png',
    cookingTime: '1 hr 20 min',
    difficulty: 'Advanced',
    mainIngredients: ['Flour', 'Cooked egg yolk', 'Butter', 'Sugar', 'Pearl sugar'],
    history: [
      'Their signature comes from hard-boiled yolks mashed into the dough, giving a uniquely tender crumb. Shaped into little wreaths and sugared, berlinerkranser are among the seven sorts of Christmas.',
    ],
  },
  {
    slug: 'serinakaker',
    name: 'Serinakaker',
    region: 'modern-viral',
    description:
      'Crumbly vanilla butter cookies brushed with egg and pearl sugar, pressed with a fork before baking.',
    image: '/images/recipes/serinakaker.png',
    cookingTime: '1 hr',
    difficulty: 'Easy',
    mainIngredients: ['Flour', 'Butter', 'Sugar', 'Vanilla', 'Pearl sugar'],
    history: [
      'Perhaps the most beloved of the Christmas cookies, serinakaker are simple butter rounds marked with a fork and crowned with pearl sugar — short, tender and endlessly moreish.',
    ],
  },
  {
    slug: 'fattigmann',
    name: 'Fattigmann',
    region: 'modern-viral',
    description:
      'Cardamom-and-cognac dough cut into diamonds, knotted and deep-fried, dusted with icing sugar.',
    image: '/images/recipes/fattigmann.png',
    cookingTime: '1 hr 30 min',
    difficulty: 'Advanced',
    mainIngredients: ['Flour', 'Cardamom', 'Cream', 'Cognac', 'Icing sugar'],
    history: [
      'The name means "poor man," an irony given the cream, eggs and cognac inside. Rolled thin, cut into knotted diamonds and fried crisp, fattigmann is a labour-of-love Christmas classic.',
    ],
  },
  {
    slug: 'smultringer',
    name: 'Smultringer',
    region: 'modern-viral',
    description:
      'Old-fashioned cardamom doughnuts fried until golden — cakey, lightly spiced and dusted with sugar.',
    image: '/images/recipes/smultringer.png',
    cookingTime: '1 hr 15 min',
    difficulty: 'Moderate',
    mainIngredients: ['Flour', 'Cardamom', 'Buttermilk', 'Sugar', 'Butter'],
    history: [
      'The Norwegian doughnut is dense, cakey and warm with cardamom, traditionally fried in lard. A fixture of Christmas and country fairs, smultringer are humble nostalgia on a plate.',
    ],
  },
  {
    slug: 'vafler',
    name: 'Vafler',
    region: 'modern-viral',
    description:
      'Heart-shaped cardamom waffles served soft, with sour cream, brown cheese or strawberry jam.',
    image: '/images/recipes/vafler.png',
    cookingTime: '30 min',
    difficulty: 'Easy',
    mainIngredients: ['Flour', 'Cardamom', 'Sour cream', 'Egg', 'Brown cheese'],
    history: [
      'The heart-shaped waffle is the warmest ritual in Norwegian life — served soft, never crisp, at cabins, church basements and offices alike. With brown cheese and jam, it is edible hospitality.',
    ],
  },
  {
    slug: 'pepperkaker',
    name: 'Pepperkaker',
    region: 'modern-viral',
    description:
      'Wafer-thin, deeply spiced gingerbread snapped from festive shapes — the crispest scent of Christmas.',
    image: '/images/recipes/pepperkaker.png',
    cookingTime: '2 hr',
    difficulty: 'Easy',
    mainIngredients: ['Flour', 'Ginger', 'Cinnamon', 'Cloves', 'Syrup'],
    history: [
      'Rolled paper-thin and cut into hearts, stars and pigs, pepperkaker fill Norwegian homes with the scent of December. Building and decorating them is a cherished ritual of the season.',
    ],
  },
]

export const RECIPES: Recipe[] = BASE_RECIPES.map((recipe) => {
  const detail = RECIPE_DETAILS[recipe.slug]
  const merged = detail
    ? { ...recipe, ...detail, image: recipe.image.replace(/\.png$/, '.webp') }
    : { ...recipe, image: recipe.image.replace(/\.png$/, '.webp') }
  // Build-time nutrition join (single enriched record for every surface):
  // map each ingredient line to its verified per-100g values, if any.
  // Refresh with: DICTIONARY_PATH=<updated bundle> node scripts/build-nutrition.mjs
  const ingredientNutrition: Record<string, IngredientNutrition> = {}
  for (const line of merged.ingredients ?? []) {
    const nutrition = nutritionForIngredientLine(line)
    if (nutrition) ingredientNutrition[line] = nutrition
  }
  return Object.keys(ingredientNutrition).length
    ? { ...merged, ingredientNutrition }
    : merged
})

export function getRecipe(slug: string): Recipe | undefined {
  return RECIPES.find((r) => r.slug === slug)
}

export function getRecipesByRegion(slug: RegionSlug): Recipe[] {
  return RECIPES.filter((recipe) => recipe.region === slug)
}

export function getRecipesBySlugs(slugs: readonly string[]): Recipe[] {
  return slugs
    .map((slug) => RECIPES.find((recipe) => recipe.slug === slug))
    .filter((recipe): recipe is Recipe => Boolean(recipe))
}
