// Algorithmic dynamic generators for Fill in the Blanks & Read and Complete (C-Test)
// Produces fresh, non-repeating masks across sessions with zero external API keys.

const DYNAMIC_FILL_CORPUS = [
  // Level 1 (12 sentences)
  { id: 'df1', difficulty: 1, sentence: 'Students are encouraged to arrive early so they can prepare for the laboratory session.', targets: ['prepare', 'arrive', 'encourage'] },
  { id: 'df2', difficulty: 1, sentence: 'Public libraries provide free access to books, computers, and quiet study rooms.', targets: ['access', 'provide', 'libraries'] },
  { id: 'df3', difficulty: 1, sentence: 'Every morning my sister checks the weather forecast before walking to the train station.', targets: ['weather', 'forecast', 'walking'] },
  { id: 'df4', difficulty: 1, sentence: 'Fresh vegetables and fruit from the local market usually taste much better in autumn.', targets: ['market', 'usually', 'vegetables'] },
  { id: 'df5', difficulty: 1, sentence: 'Remember to save your document frequently so you never lose hours of careful work.', targets: ['document', 'frequently', 'careful'] },
  { id: 'df6', difficulty: 1, sentence: 'Visitors can borrow an audio guide at the museum entrance for a small deposit.', targets: ['borrow', 'entrance', 'museum'] },
  { id: 'df7', difficulty: 1, sentence: 'Taking short breaks between study sessions helps students stay focused and alert.', targets: ['focused', 'between', 'sessions'] },
  { id: 'df8', difficulty: 1, sentence: 'The new sports center includes an indoor swimming pool and three basketball courts.', targets: ['includes', 'indoor', 'center'] },
  { id: 'df9', difficulty: 1, sentence: 'Please double check your email address before submitting the online registration form.', targets: ['address', 'online', 'before'] },
  { id: 'df10', difficulty: 1, sentence: 'Tourists love photographing the historic stone bridge when the evening lights turn on.', targets: ['historic', 'evening', 'bridge'] },
  { id: 'df11', difficulty: 1, sentence: 'Learning how to cook simple meals at home can save college students a lot of money.', targets: ['simple', 'college', 'learning'] },
  { id: 'df12', difficulty: 1, sentence: 'During winter holidays, many families travel south to enjoy warmer coastal weather.', targets: ['travel', 'coastal', 'holidays'] },

  // Level 2 (14 sentences)
  { id: 'df13', difficulty: 2, sentence: 'Because of the heavy snowstorm, the university decided to cancel all afternoon lectures.', targets: ['cancel', 'decided', 'lectures'] },
  { id: 'df14', difficulty: 2, sentence: 'Regular physical exercise can significantly improve both sleep quality and daily mood.', targets: ['improve', 'quality', 'physical'] },
  { id: 'df15', difficulty: 2, sentence: 'Before signing a rental contract, tenants should carefully read every clause in the agreement.', targets: ['clause', 'agreement', 'tenants'] },
  { id: 'df16', difficulty: 2, sentence: 'Solar energy has become an increasingly affordable option for rural communities.', targets: ['affordable', 'option', 'communities'] },
  { id: 'df17', difficulty: 2, sentence: 'Good time management allows working students to balance part-time jobs with coursework.', targets: ['balance', 'management', 'coursework'] },
  { id: 'df18', difficulty: 2, sentence: 'Although the highway was crowded, the express bus arrived at the airport right on schedule.', targets: ['schedule', 'crowded', 'arrived'] },
  { id: 'df19', difficulty: 2, sentence: 'The city council voted to expand bicycle lanes across three major downtown avenues.', targets: ['expand', 'avenues', 'council'] },
  { id: 'df20', difficulty: 2, sentence: 'Managers should offer clear instructions whenever employees adopt unfamiliar software tools.', targets: ['adopt', 'unfamiliar', 'instructions'] },
  { id: 'df21', difficulty: 2, sentence: 'Heavy rainfall during April helped restore water levels in several regional reservoirs.', targets: ['restore', 'regional', 'levels'] },
  { id: 'df22', difficulty: 2, sentence: 'Volunteers spent Saturday morning cleaning plastic debris along the sandy shoreline.', targets: ['debris', 'shoreline', 'morning'] },
  { id: 'df23', difficulty: 2, sentence: 'Consumers are becoming more selective about packaging materials when choosing household products.', targets: ['selective', 'materials', 'products'] },
  { id: 'df24', difficulty: 2, sentence: 'Our biology instructor gave a practical demonstration showing how plant cells absorb water.', targets: ['absorb', 'practical', 'instructor'] },
  { id: 'df25', difficulty: 2, sentence: 'Strict safety inspections ensure that every passenger aircraft remains reliable before takeoff.', targets: ['reliable', 'inspections', 'ensure'] },
  { id: 'df26', difficulty: 2, sentence: 'Neighborhood cafes often serve as informal meeting spaces for remote writers and designers.', targets: ['informal', 'remote', 'designers'] },

  // Level 3 (14 sentences)
  { id: 'df27', difficulty: 3, sentence: 'The researchers collected data over three years to establish a clear link between diet and focus.', targets: ['establish', 'collected', 'researchers'] },
  { id: 'df28', difficulty: 3, sentence: 'Although the two candidates disagreed on tax policy, they reached a compromise on education funding.', targets: ['compromise', 'candidates', 'funding'] },
  { id: 'df29', difficulty: 3, sentence: 'Urban planners must balance rapid economic growth with long-term environmental protection.', targets: ['environmental', 'planners', 'protection'] },
  { id: 'df30', difficulty: 3, sentence: 'Lack of reliable clean water remains a persistent challenge in several arid regions.', targets: ['persistent', 'challenge', 'regions'] },
  { id: 'df31', difficulty: 3, sentence: 'Independent bookshops continue to thrive by hosting local author readings and community workshops.', targets: ['thrive', 'hosting', 'workshops'] },
  { id: 'df32', difficulty: 3, sentence: 'Peer review helps scientific journals verify that experimental methods are sound and transparent.', targets: ['verify', 'transparent', 'methods'] },
  { id: 'df33', difficulty: 3, sentence: 'High-speed rail lines provide an efficient alternative to short regional airline flights.', targets: ['alternative', 'efficient', 'regional'] },
  { id: 'df34', difficulty: 3, sentence: 'Early childhood educators emphasize curiosity and play as essential drivers of cognitive development.', targets: ['cognitive', 'essential', 'curiosity'] },
  { id: 'df35', difficulty: 3, sentence: 'Digital archives allow scholars anywhere in the world to examine fragile historical manuscripts.', targets: ['fragile', 'examine', 'scholars'] },
  { id: 'df36', difficulty: 3, sentence: 'To prevent supply shortages, hospital pharmacies maintain an extra reserve of critical medicines.', targets: ['reserve', 'shortages', 'maintain'] },
  { id: 'df37', difficulty: 3, sentence: 'Consistent feedback from mentors encourages young athletes to refine their technique steadily.', targets: ['refine', 'technique', 'mentors'] },
  { id: 'df38', difficulty: 3, sentence: 'Economists debated whether lowering transit fares would generate enough ridership to offset costs.', targets: ['offset', 'generate', 'ridership'] },
  { id: 'df39', difficulty: 3, sentence: 'Cross-cultural teams often produce more creative solutions because members bring diverse perspectives.', targets: ['diverse', 'perspectives', 'solutions'] },
  { id: 'df40', difficulty: 3, sentence: 'A detailed budget helps nonprofit organizations allocate donations transparently across programs.', targets: ['allocate', 'transparently', 'budget'] },

  // Level 4 (12 sentences)
  { id: 'df41', difficulty: 4, sentence: 'The committee reviewed the proposal thoroughly, yet its final verdict remained somewhat ambiguous.', targets: ['ambiguous', 'verdict', 'thoroughly'] },
  { id: 'df42', difficulty: 4, sentence: 'New coastal wetlands were restored to mitigate the destructive impact of seasonal flooding.', targets: ['mitigate', 'wetlands', 'seasonal'] },
  { id: 'df43', difficulty: 4, sentence: 'Historians often rely on multiple independent sources to corroborate ancient eyewitness accounts.', targets: ['corroborate', 'multiple', 'accounts'] },
  { id: 'df44', difficulty: 4, sentence: 'Rapid urbanization has accelerated demand for dependable public transit and affordable housing.', targets: ['accelerated', 'dependable', 'urbanization'] },
  { id: 'df45', difficulty: 4, sentence: 'Marine biologists noticed that warming currents can disrupt delicate migration patterns among whales.', targets: ['disrupt', 'delicate', 'migration'] },
  { id: 'df46', difficulty: 4, sentence: 'Despite fierce opposition, the mayor remained pragmatic and focused on achievable infrastructure goals.', targets: ['pragmatic', 'opposition', 'achievable'] },
  { id: 'df47', difficulty: 4, sentence: 'Careful longitudinal studies are required to substantiate claims about long-term dietary habits.', targets: ['substantiate', 'longitudinal', 'dietary'] },
  { id: 'df48', difficulty: 4, sentence: 'Tighter regulations alone cannot eradicate pollution without practical financial incentives for factories.', targets: ['incentives', 'eradicate', 'regulations'] },
  { id: 'df49', difficulty: 4, sentence: 'Architectural preservationists work tirelessly to safeguard landmark buildings from hasty demolition.', targets: ['safeguard', 'demolition', 'landmark'] },
  { id: 'df50', difficulty: 4, sentence: 'The curator curated a compelling exhibition that juxtaposed classical sculptures with modern photography.', targets: ['compelling', 'exhibition', 'sculptures'] },
  { id: 'df51', difficulty: 4, sentence: 'Overreliance on automated metrics can inadvertently distort how universities evaluate teaching quality.', targets: ['distort', 'metrics', 'evaluate'] },
  { id: 'df52', difficulty: 4, sentence: 'Clear communication during emergencies helps authorities disseminate accurate safety updates quickly.', targets: ['disseminate', 'authorities', 'accurate'] },

  // Level 5 (12 sentences)
  { id: 'df53', difficulty: 5, sentence: 'Smartphones have become nearly ubiquitous tools across modern university lecture halls.', targets: ['ubiquitous', 'lecture', 'modern'] },
  { id: 'df54', difficulty: 5, sentence: 'The archaeologist noticed a subtle discrepancy between the pottery fragments and written chronicles.', targets: ['discrepancy', 'fragments', 'subtle'] },
  { id: 'df55', difficulty: 5, sentence: 'Because online trends are often ephemeral, brands invest heavily in enduring customer trust.', targets: ['ephemeral', 'enduring', 'heavily'] },
  { id: 'df56', difficulty: 5, sentence: 'Excessive technical jargon can obfuscate simple policy recommendations for everyday citizens.', targets: ['obfuscate', 'jargon', 'policy'] },
  { id: 'df57', difficulty: 5, sentence: 'Astronomers used radio telescopes to detect faint anomalies in the distant galaxy cluster.', targets: ['anomalies', 'distant', 'detect'] },
  { id: 'df58', difficulty: 5, sentence: 'Even under intense pressure, the chief negotiator maintained remarkable equanimity throughout talks.', targets: ['equanimity', 'negotiator', 'intense'] },
  { id: 'df59', difficulty: 5, sentence: 'Prolonged drought can exacerbate existing tensions over shared agricultural irrigation canals.', targets: ['exacerbate', 'prolonged', 'irrigation'] },
  { id: 'df60', difficulty: 5, sentence: 'The author’s meticulous footnotes lent extraordinary credibility to her controversial biography.', targets: ['meticulous', 'credibility', 'footnotes'] },
  { id: 'df61', difficulty: 5, sentence: 'Critics argued that the proposed subsidy would remain contingent upon measurable emissions cuts.', targets: ['contingent', 'measurable', 'subsidy'] },
  { id: 'df62', difficulty: 5, sentence: 'Rather than issuing arbitrary decrees, effective leaders foster consensus through transparent dialogue.', targets: ['arbitrary', 'consensus', 'foster'] },
  { id: 'df63', difficulty: 5, sentence: 'Social psychologists investigate how cognitive biases subtly shape everyday financial judgments.', targets: ['biases', 'judgments', 'investigate'] },
  { id: 'df64', difficulty: 5, sentence: 'Stringent quarantine protocols helped preclude wider transmission of the invasive crop beetle.', targets: ['preclude', 'stringent', 'invasive'] }
];

const DYNAMIC_CTEST_CORPUS = [
  // Level 1-2 (7 passages)
  {
    id: 'dc1',
    difficulty: 2,
    title: 'Urban Community Gardens',
    text: 'Community gardens are transforming unused urban spaces into vibrant green neighborhoods. In many large cities, residents work together to plant vegetables, herbs, and flowers on shared plots of land. These projects not only provide fresh, affordable produce, but they also strengthen social connections among neighbors. Children who participate learn valuable lessons about nutrition and ecology. Furthermore, patches of greenery help cool dense streets during hot summer months and support local pollinators.'
  },
  {
    id: 'dc2',
    difficulty: 1,
    title: 'The Benefits of Walking Meetings',
    text: 'Many office workers spend nearly eight hours sitting in front of computer screens every day. To combat fatigue, some progressive companies now encourage small teams to hold walking meetings in nearby parks. Moving outdoors stimulates blood flow and helps colleagues share ideas in a relaxed atmosphere. Employees often return to their desks feeling refreshed and ready to tackle complex tasks. Simple changes in daily routine can therefore boost both physical health and workplace creativity.'
  },
  {
    id: 'dc3',
    difficulty: 2,
    title: 'Public Libraries in the Digital Age',
    text: 'Although smartphones give people instant access to articles online, public libraries remain busier than ever. Beyond lending printed books, modern libraries offer quiet study spaces, free internet connections, and language workshops for newcomers. Families bring young children to weekly storytelling hours that build early reading habits. Librarians also guide seniors and job seekers through unfamiliar digital tools. As welcoming community hubs, libraries continue to bridge educational gaps across every generation.'
  },
  {
    id: 'dc4',
    difficulty: 2,
    title: 'Why Honey Never Spoils',
    text: 'Archaeologists have discovered pots of honey inside ancient tombs that remain completely safe to eat after thousands of years. Honey owes this remarkable shelf life to its natural chemistry and careful preparation by bees. First, nectar contains very little moisture, making it nearly impossible for bacteria to survive inside a sealed jar. Bees also fan the honeycomb with their wings to evaporate excess water and add mild natural acids. Together, these traits protect honey from decay almost indefinitely.'
  },
  {
    id: 'dc5',
    difficulty: 2,
    title: 'Bicycle Sharing in Modern Cities',
    text: 'Short car trips account for a surprisingly large share of urban traffic congestion and fuel consumption. To offer commuters a faster alternative, dozens of cities have launched public bicycle sharing networks near subway stations. Riders unlock a bike with a mobile app, pedal for fifteen minutes, and return it to any dock near their office. Maintaining dedicated bike lanes makes the commute safer and attracts riders of all ages. Gradually, cleaner streets and quieter neighborhoods benefit everyone.'
  },
  {
    id: 'dc6',
    difficulty: 2,
    title: 'How Coffee Beans Travel the World',
    text: 'Each morning millions of people enjoy a warm cup of coffee without thinking about its long journey. Coffee trees thrive in sunny tropical highlands across Latin America, East Africa, and Southeast Asia. Farmers harvest bright red cherries by hand when the fruit reaches peak ripeness. Next, workers dry and sort the green beans before shipping them to local roasters worldwide. Careful roasting transforms simple seeds into aromatic blends tailored to diverse regional tastes.'
  },
  {
    id: 'dc7',
    difficulty: 2,
    title: 'Designing School Playgrounds With Nature',
    text: 'Traditional school playgrounds often feature flat asphalt surfaces and brightly painted plastic slides. Recently, educators have started replacing bare concrete with shaded gardens, wooden climbing logs, and small vegetable beds. Studies show that playing near trees lowers stress and improves attention when students return to classrooms. Children also invent more cooperative games when surrounded by rocks, sand, and natural slopes. Consequently, green schoolyards support healthier minds as well as stronger bodies.'
  },

  // Level 3 (7 passages)
  {
    id: 'dc8',
    difficulty: 3,
    title: 'Sleep and Memory Consolidation',
    text: 'Scientists have long recognized that quality sleep plays a critical role in human learning. While a person rests, the brain does not simply shut down; instead, it actively reorganizes recent experiences. Important information gathered during the day is transferred from temporary storage into long-term memory networks. Students who pull all-nighters before exams often struggle to recall complex concepts accurately because their brains miss this vital stage. Consequently, maintaining a consistent sleep schedule is one of the most effective study strategies available.'
  },
  {
    id: 'dc9',
    difficulty: 3,
    title: 'The Evolution of Paper Money',
    text: 'Before paper banknotes existed, societies relied heavily on metal coins for daily trade. However, carrying large quantities of silver or copper across long distances was both heavy and dangerous for traveling merchants. During the Tang and Song dynasties in China, traders began leaving coins with trusted agents in exchange for written receipts. Over time, these paper certificates evolved into an official currency backed by the government. Although people initially questioned whether lightweight paper could hold genuine value, the convenience of banknotes soon revolutionized global commerce.'
  },
  {
    id: 'dc10',
    difficulty: 3,
    title: 'Vertical Farming in Warehouses',
    text: 'Traditional agriculture depends heavily on predictable rainfall and vast stretches of fertile land. Inside urban vertical farms, engineers stack trays of leafy greens inside climate-controlled buildings instead of open fields. Precise LED lighting replaces sunlight, while recycled nutrient water flows directly to plant roots without soil. Because crops grow indoors year-round, harvests remain protected from droughts, frost, and hungry insects. Although electricity costs remain high, vertical farms bring fresh produce within minutes of city kitchens.'
  },
  {
    id: 'dc11',
    difficulty: 3,
    title: 'The Science of Sourdough Bread',
    text: 'Long before commercial yeast packets appeared in grocery stores, bakers leavened bread using wild starter cultures. A simple mixture of flour and water captures beneficial bacteria and yeast naturally present in the surrounding air. Over several days of regular feeding, these tiny organisms ferment sugars and release bubbles of carbon dioxide gas. This slow fermentation gives sourdough loaves their chewy texture, gentle tang, and extended freshness without artificial preservatives. Today, artisan bakers still rely on patient microbial teamwork inside every warm loaf.'
  },
  {
    id: 'dc12',
    difficulty: 3,
    title: 'Why Coral Reefs Matter',
    text: 'Although coral reefs cover less than one percent of the ocean floor, they shelter roughly a quarter of all marine species. Reefs form vast underwater cities where colorful fish, crabs, and sea turtles find food and safety. Beyond supporting biodiversity, coral barriers absorb powerful storm waves before they erode coastal towns and harbors. Rising ocean temperatures, however, force stressed corals to expel the algae that give them energy and color. Protecting reefs through cleaner waters and reduced emissions safeguards both ocean life and coastal livelihoods.'
  },
  {
    id: 'dc13',
    difficulty: 3,
    title: 'The Architecture of Windcatchers',
    text: 'Long before electric air conditioners existed, builders in arid Middle Eastern cities engineered clever towers called windcatchers. Rising above flat rooftops, these tall brick shafts capture cool upper breezes and channel them downward into living rooms. Warm indoor air simultaneously escapes through high opposite vents, creating natural circulation without mechanical power. When paired with shaded courtyards and underground water channels, windcatchers lowered indoor temperatures by ten degrees or more. Modern sustainable architects now study these ancient passive designs to cool contemporary buildings.'
  },
  {
    id: 'dc14',
    difficulty: 3,
    title: 'Music Training and Listening Skills',
    text: 'Learning to play a musical instrument trains far more than finger coordination and rhythm. Musicians constantly distinguish subtle shifts in pitch, timing, and volume while performing alongside other players. Neuroscientists have observed that this attentive practice sharpens how the auditory system filters speech inside noisy restaurants or classrooms. Even adults who study an instrument for a few months display faster neural responses to spoken consonants. Musical education therefore strengthens everyday communication skills well beyond the concert stage.'
  },

  // Level 4-5 (6 passages)
  {
    id: 'dc15',
    difficulty: 4,
    title: 'Acoustic Design in Concert Halls',
    text: 'Designing a world-class concert hall requires a delicate balance between architecture and physics. Sound waves produced by an orchestra must reflect evenly off walls and ceilings so that every listener hears clear, warm music. If a room causes too much echo, fast musical passages blur together and lose definition. Conversely, an overly absorbent space makes instruments sound dull and lifeless. Modern acoustic engineers use computer simulations alongside wooden panels and curved surfaces to achieve clarity. As a result, audiences sitting in the back balcony enjoy nearly the same richness as those near the stage.'
  },
  {
    id: 'dc16',
    difficulty: 4,
    title: 'Pollinators Beyond Honeybees',
    text: 'When people picture crop pollination, domesticated honeybees almost always come to mind first. Yet ecologists emphasize that thousands of wild solitary bees, hoverflies, moths, and hummingbirds perform vital agricultural work every spring. Wild bumblebees, for instance, vibrate tomato flowers at specific frequencies that honeybees cannot easily replicate. Preserving hedgerows and native wildflowers near farms gives these diverse insects nesting shelter throughout the year. Relying on a wide spectrum of wild pollinators ultimately makes food supplies far more resilient.'
  },
  {
    id: 'dc17',
    difficulty: 4,
    title: 'How Ocean Currents Regulate Climate',
    text: 'Massive ocean currents act like a planetary conveyor belt distributing solar heat from the equator toward polar latitudes. Warm surface waters drift northward, releasing gentle warmth into coastal winds that keep Western Europe milder than comparable Canadian regions. As salty water cools near Greenland, it grows denser, sinks toward the abyss, and drives deep return flows southward. Climate scientists monitor these currents closely because rapid freshwater melt from glaciers could gradually alter circulation speeds. Understanding marine heat transport remains indispensable for forecasting regional weather shifts.'
  },
  {
    id: 'dc18',
    difficulty: 5,
    title: 'Microplastics in Freshwater Ecosystems',
    text: 'While ocean plastic pollution has captured widespread public attention, freshwater rivers and lakes face a similarly urgent threat. Microscopic plastic fibers shed from synthetic clothing and packaging accumulate steadily in inland waterways. Because wastewater treatment facilities cannot always filter out particles smaller than a millimeter, they frequently pass into streams. Aquatic organisms mistake these fragments for food, allowing synthetic compounds to enter the broader food chain. Environmental chemists are now developing biodegradable textiles and innovative filtration membranes to curb emissions at the source. Addressing freshwater contamination early is essential for safeguarding both biodiversity and drinking water.'
  },
  {
    id: 'dc19',
    difficulty: 5,
    title: 'The Paradox of Choice in Consumer Markets',
    text: 'Conventional economic theory assumes that expanding consumer options automatically improves satisfaction and marketplace efficiency. Behavioral psychologists, however, have repeatedly demonstrated that overwhelming assortments can paralyze decision-making and provoke lasting regret. When shoppers confront thirty nearly identical varieties of jam or retirement plans, mental fatigue often induces them either to walk away empty-handed or to second-guess their selection afterward. Curating thoughtful, manageable choices therefore benefits both customers and businesses alike. Simplicity in presentation frequently fosters deeper confidence than boundless abundance.'
  },
  {
    id: 'dc20',
    difficulty: 5,
    title: 'Rewilding Abandoned Farmland',
    text: 'Across mountainous regions of Europe and North America, economic shifts have left millions of acres of marginal farmland uncultivated. Rather than managing these landscapes intensively, conservationists increasingly advocate ecological rewilding to restore self-sustaining ecosystems. Allowing native forests to regenerate alongside reintroduced herbivores creates diverse mosaics of meadow, shrub, and woodland habitats. Over decades, deeper root networks stabilize fragile soils, absorb heavy floodwaters, and sequester substantial atmospheric carbon. Rewilding thus illustrates how stepping back judiciously can revitalize degraded environments.'
  }
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickFromCorpus(corpus, difficulty, seenIds = new Set(), usedIds = new Set()) {
  let pool = corpus.filter((item) => !usedIds.has(item.id) && !seenIds.has(item.id));
  if (!pool.length) pool = corpus.filter((item) => !usedIds.has(item.id));
  if (!pool.length) pool = corpus;

  const shuffled = shuffle(pool);
  const exact = shuffled.filter((item) => item.difficulty === difficulty);
  if (exact.length > 0) return exact[0];
  const near = shuffled.filter((item) => Math.abs(item.difficulty - difficulty) <= 1);
  if (near.length > 0) return near[0];
  return shuffled[0];
}

export function getDynamicFillCount() {
  return DYNAMIC_FILL_CORPUS.length;
}

export function getDynamicCTestCount() {
  return DYNAMIC_CTEST_CORPUS.length;
}

export function generateDynamicFillBlanks({ difficulty = 3, seenIds = new Set(), usedIds = new Set() } = {}) {
  const entry = pickFromCorpus(DYNAMIC_FILL_CORPUS, difficulty, seenIds, usedIds);
  const sentence = entry.sentence;
  const targets = shuffle(entry.targets || []);

  for (const target of targets) {
    const regex = new RegExp(`\\b(${target})\\b`, 'i');
    const m = regex.exec(sentence);
    if (!m) continue;
    const matchedWord = m[1];
    if (matchedWord.length < 5) continue;

    const prefixLen = Math.max(2, Math.min(5, Math.ceil(matchedWord.length * 0.45)));
    if (matchedWord.length - prefixLen < 2) continue;

    const prefix = matchedWord.slice(0, prefixLen);
    const missing = matchedWord.slice(prefixLen).toLowerCase();
    const before = sentence.slice(0, m.index);
    const after = sentence.slice(m.index + matchedWord.length);

    return {
      id: entry.id,
      type: 'fill_blanks',
      difficulty: entry.difficulty,
      before,
      prefix,
      missing,
      after,
      fullWord: matchedWord,
      isDynamic: true
    };
  }

  // Fallback safe slice if no target matched
  const fallbackWord = 'learning';
  return {
    id: entry.id,
    type: 'fill_blanks',
    difficulty: entry.difficulty,
    before: `${sentence} `,
    prefix: fallbackWord.slice(0, 4),
    missing: fallbackWord.slice(4),
    after: '.',
    fullWord: fallbackWord,
    isDynamic: true
  };
}

export function generateDynamicReadComplete({ difficulty = 3, seenIds = new Set(), usedIds = new Set() } = {}) {
  const entry = pickFromCorpus(DYNAMIC_CTEST_CORPUS, difficulty, seenIds, usedIds);
  // Split into sentences preserving trailing spaces cleanly
  const sentences = entry.text.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [entry.text];

  if (sentences.length < 3) {
    return {
      id: entry.id,
      type: 'read_complete',
      difficulty: entry.difficulty,
      title: entry.title,
      segments: [{ text: entry.text }],
      isDynamic: true
    };
  }

  const firstSentence = sentences[0];
  const lastSentence = sentences[sentences.length - 1];
  const middleText = sentences.slice(1, -1).join('');

  // Tokenize middle text into words and non-word punctuation/whitespace tokens
  const tokens = middleText.match(/[A-Za-z]+|[^A-Za-z]+/g) || [middleText];
  const wordIndices = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // Candidate words: lowercase start (skip proper nouns), pure alphabetic, length 4..14
    if (/^[a-z]{4,14}$/.test(tok)) {
      wordIndices.push(i);
    }
  }

  // Select 8-9 well-spaced words across middle sentences (randomized each run!)
  const desiredBlanks = Math.min(9, Math.max(6, Math.floor(wordIndices.length / 4)));
  const selectedWordIndices = new Set();
  const randomizedOrder = shuffle(wordIndices);

  for (const tokIdx of randomizedOrder) {
    if (selectedWordIndices.size >= desiredBlanks) break;
    // Keep at least 4 tokens (~2 words + spaces) gap between blanks just like DET C-tests
    const tooClose = [...selectedWordIndices].some((chosen) => Math.abs(chosen - tokIdx) < 4);
    if (!tooClose) {
      selectedWordIndices.add(tokIdx);
    }
  }

  // Backfill if strict spacing yielded fewer than 6
  if (selectedWordIndices.size < 6) {
    for (const tokIdx of randomizedOrder) {
      if (selectedWordIndices.size >= 6) break;
      const adjacent = [...selectedWordIndices].some((chosen) => Math.abs(chosen - tokIdx) < 2);
      if (!adjacent) selectedWordIndices.add(tokIdx);
    }
  }

  const segments = [{ text: firstSentence }];
  let textBuffer = '';

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (selectedWordIndices.has(i)) {
      if (textBuffer) {
        segments.push({ text: textBuffer });
        textBuffer = '';
      }
      const prefixLen = Math.max(1, Math.min(5, Math.floor(tok.length / 2)));
      segments.push({
        prefix: tok.slice(0, prefixLen),
        missing: tok.slice(prefixLen).toLowerCase()
      });
    } else {
      textBuffer += tok;
    }
  }

  if (textBuffer || lastSentence) {
    segments.push({ text: textBuffer + lastSentence });
  }

  return {
    id: entry.id,
    type: 'read_complete',
    difficulty: entry.difficulty,
    title: entry.title,
    segments,
    isDynamic: true
  };
}
