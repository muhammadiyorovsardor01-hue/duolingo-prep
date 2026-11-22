import { SCENES } from './scenes.js';

export const QUESTION_TYPES = [
  {
    id: 'read_select',
    name: 'Read and Select',
    skills: ['reading'],
    durationSec: 5,
    sessionLength: 15,
    descUz: '5 soniya ichida so‘z haqiqiy inglizcha so‘zmi yoki soxta so‘zmi — aniqlang.',
    descEn: 'Decide within 5 seconds whether the displayed word is a real English word.',
    aiGeneratable: true,
    icon: '🔍'
  },
  {
    id: 'fill_blanks',
    name: 'Fill in the Blanks',
    skills: ['reading', 'writing'],
    durationSec: 20,
    sessionLength: 6,
    descUz: 'Gapdagi tushirib qoldirilgan so‘zning qolgan harflarini 20 soniyada to‘ldiring.',
    descEn: 'Complete the unfinished word in a sentence within 20 seconds.',
    aiGeneratable: true,
    icon: '✏️'
  },
  {
    id: 'read_complete',
    name: 'Read and Complete',
    skills: ['reading', 'writing'],
    durationSec: 180,
    sessionLength: 2,
    descUz: 'Akademik matndagi chala qoldirilgan so‘zlarning harflarini 3 daqiqada tiklang.',
    descEn: 'Restore missing word endings across an academic C-test paragraph in 3 minutes.',
    aiGeneratable: true,
    icon: '📄'
  },
  {
    id: 'listen_type',
    name: 'Listen and Type',
    skills: ['listening', 'writing'],
    durationSec: 60,
    sessionLength: 6,
    descUz: 'Gapni tinglang (ko‘pi bilan 3 marta) va eshitganingizni aniq yozing.',
    descEn: 'Listen to a spoken sentence (up to 3 plays) and type exactly what you hear.',
    aiGeneratable: true,
    icon: '🎧'
  },
  {
    id: 'read_aloud',
    name: 'Read Aloud',
    skills: ['reading', 'speaking'],
    durationSec: 20,
    sessionLength: 5,
    descUz: 'Ekrandagi gapni 20 soniya ichida ravon va aniq talaffuz bilan o‘qib bering.',
    descEn: 'Record yourself reading the displayed sentence aloud within 20 seconds.',
    aiGeneratable: true,
    icon: '🗣️'
  },
  {
    id: 'interactive_reading',
    name: 'Interactive Reading',
    skills: ['reading'],
    durationSec: 420,
    sessionLength: 1,
    descUz: '6 bosqichli matn tahlili: so‘z tanlash, gap qo‘shish, javobni belgilash, g‘oya va sarlavha.',
    descEn: 'Multi-stage passage reading: blanks, sentence insertion, highlighting, main idea, and title.',
    aiGeneratable: true,
    icon: '📚'
  },
  {
    id: 'interactive_listening',
    name: 'Interactive Listening',
    skills: ['listening', 'writing'],
    durationSec: 240,
    sessionLength: 1,
    descUz: 'Universitet dialogida to‘g‘ri javobni tanlang va oxirida suhbat mazmunini 75 soniyada yozing.',
    descEn: 'Participate in a multi-turn campus dialogue, then summarize it in 75 seconds.',
    aiGeneratable: true,
    icon: '💬'
  },
  {
    id: 'write_photo',
    name: 'Write About the Photo',
    skills: ['writing'],
    durationSec: 60,
    sessionLength: 3,
    descUz: 'Rasmni 1 daqiqa ichida batafsil va chiroyli grammatika bilan tasvirlab yozing.',
    descEn: 'Describe an image in clear, detailed English within 1 minute.',
    aiGeneratable: false,
    icon: '🖼️'
  },
  {
    id: 'interactive_writing',
    name: 'Interactive Writing',
    skills: ['writing'],
    durationSec: 480,
    sessionLength: 1,
    descUz: '2 bosqichli insho: asosiy fikr (5 daqiqa) + davomiy savolga qo‘shimcha javob (3 daqiqa).',
    descEn: 'Two-part writing: 5-minute main response followed by a 3-minute follow-up prompt.',
    aiGeneratable: true,
    icon: '📝'
  },
  {
    id: 'speak_photo',
    name: 'Speak About the Photo',
    skills: ['speaking'],
    prepSec: 20,
    durationSec: 90,
    sessionLength: 1,
    descUz: '20 soniya tayyorlanib, rasm haqida 30–90 soniya davomida og‘zaki gapirib bering.',
    descEn: 'Prepare for 20s, then speak about the photo for 30–90 seconds.',
    aiGeneratable: false,
    icon: '📸'
  },
  {
    id: 'read_then_speak',
    name: 'Read, Then Speak',
    skills: ['reading', 'speaking'],
    prepSec: 20,
    durationSec: 90,
    sessionLength: 1,
    descUz: 'Mavzu va 3 ta kichik savolni o‘qib, 90 soniya davomida asosli nutq so‘zlang.',
    descEn: 'Read a topic card with bullet points and speak coherently for up to 90 seconds.',
    aiGeneratable: true,
    icon: '🎙️'
  },
  {
    id: 'writing_sample',
    name: 'Writing Sample',
    skills: ['writing'],
    durationSec: 300,
    sessionLength: 1,
    descUz: '5 daqiqalik akademik ochiq savolga tuzilgan insho yozing (universitetlarga yuboriladi).',
    descEn: 'Write a 5-minute extended essay response on an open-ended prompt.',
    aiGeneratable: true,
    icon: '🎓'
  },
  {
    id: 'speaking_sample',
    name: 'Speaking Sample',
    skills: ['speaking'],
    prepSec: 30,
    durationSec: 180,
    sessionLength: 1,
    descUz: '30 soniya tayyorgarlikdan so‘ng 1–3 daqiqa davomida erkin fikr bildiring.',
    descEn: 'Prepare for 30s, then speak for 1–3 minutes on an open-ended prompt.',
    aiGeneratable: true,
    icon: '🎤'
  }
];

export function getQuestionTypeMeta(typeId) {
  return QUESTION_TYPES.find((t) => t.id === typeId) || QUESTION_TYPES[0];
}

const READ_SELECT_BANK = [
  // Level 1 Real (16)
  { id: 'rs1', word: 'curiosity', isReal: true, difficulty: 1 },
  { id: 'rs2', word: 'volunteer', isReal: true, difficulty: 1 },
  { id: 'rs3', word: 'calendar', isReal: true, difficulty: 1 },
  { id: 'rs4', word: 'library', isReal: true, difficulty: 1 },
  { id: 'rs5', word: 'neighbor', isReal: true, difficulty: 1 },
  { id: 'rs6', word: 'schedule', isReal: true, difficulty: 1 },
  { id: 'rs7', word: 'umbrella', isReal: true, difficulty: 1 },
  { id: 'rs8', word: 'celebrate', isReal: true, difficulty: 1 },
  { id: 'rs9', word: 'familiar', isReal: true, difficulty: 1 },
  { id: 'rs10', word: 'ordinary', isReal: true, difficulty: 1 },
  { id: 'rs11', word: 'organize', isReal: true, difficulty: 1 },
  { id: 'rs12', word: 'grateful', isReal: true, difficulty: 1 },
  { id: 'rs13', word: 'decision', isReal: true, difficulty: 1 },
  { id: 'rs14', word: 'valuable', isReal: true, difficulty: 1 },
  { id: 'rs15', word: 'reliable', isReal: true, difficulty: 1 },
  { id: 'rs16', word: 'discover', isReal: true, difficulty: 1 },
  // Level 1 Fake (16)
  { id: 'rs17', word: 'incredient', isReal: false, difficulty: 1 },
  { id: 'rs18', word: 'mistraveling', isReal: false, difficulty: 1 },
  { id: 'rs19', word: 'confusation', isReal: false, difficulty: 1 },
  { id: 'rs20', word: 'unhelpish', isReal: false, difficulty: 1 },
  { id: 'rs21', word: 'believation', isReal: false, difficulty: 1 },
  { id: 'rs22', word: 'friendlessity', isReal: false, difficulty: 1 },
  { id: 'rs23', word: 'misrememberful', isReal: false, difficulty: 1 },
  { id: 'rs24', word: 'happyment', isReal: false, difficulty: 1 },
  { id: 'rs25', word: 'carefullyness', isReal: false, difficulty: 1 },
  { id: 'rs26', word: 'studyness', isReal: false, difficulty: 1 },
  { id: 'rs27', word: 'explaination', isReal: false, difficulty: 1 },
  { id: 'rs28', word: 'thinkment', isReal: false, difficulty: 1 },
  { id: 'rs29', word: 'travelment', isReal: false, difficulty: 1 },
  { id: 'rs30', word: 'readation', isReal: false, difficulty: 1 },
  { id: 'rs31', word: 'playness', isReal: false, difficulty: 1 },
  { id: 'rs32', word: 'talkment', isReal: false, difficulty: 1 },

  // Level 2 Real (16)
  { id: 'rs33', word: 'abundant', isReal: true, difficulty: 2 },
  { id: 'rs34', word: 'reluctant', isReal: true, difficulty: 2 },
  { id: 'rs35', word: 'sustainable', isReal: true, difficulty: 2 },
  { id: 'rs36', word: 'compromise', isReal: true, difficulty: 2 },
  { id: 'rs37', word: 'adjacent', isReal: true, difficulty: 2 },
  { id: 'rs38', word: 'adequate', isReal: true, difficulty: 2 },
  { id: 'rs39', word: 'hesitate', isReal: true, difficulty: 2 },
  { id: 'rs40', word: 'generate', isReal: true, difficulty: 2 },
  { id: 'rs41', word: 'allocate', isReal: true, difficulty: 2 },
  { id: 'rs42', word: 'consequence', isReal: true, difficulty: 2 },
  { id: 'rs43', word: 'distinct', isReal: true, difficulty: 2 },
  { id: 'rs44', word: 'relevant', isReal: true, difficulty: 2 },
  { id: 'rs45', word: 'accurate', isReal: true, difficulty: 2 },
  { id: 'rs46', word: 'persuade', isReal: true, difficulty: 2 },
  { id: 'rs47', word: 'strategy', isReal: true, difficulty: 2 },
  { id: 'rs48', word: 'moderate', isReal: true, difficulty: 2 },
  // Level 2 Fake (16)
  { id: 'rs49', word: 'untrastive', isReal: false, difficulty: 2 },
  { id: 'rs50', word: 'relimination', isReal: false, difficulty: 2 },
  { id: 'rs51', word: 'flimbering', isReal: false, difficulty: 2 },
  { id: 'rs52', word: 'dispartment', isReal: false, difficulty: 2 },
  { id: 'rs53', word: 'explanory', isReal: false, difficulty: 2 },
  { id: 'rs54', word: 'tranquilityness', isReal: false, difficulty: 2 },
  { id: 'rs55', word: 'adjacenceful', isReal: false, difficulty: 2 },
  { id: 'rs56', word: 'compenstate', isReal: false, difficulty: 2 },
  { id: 'rs57', word: 'reluctation', isReal: false, difficulty: 2 },
  { id: 'rs58', word: 'abundanize', isReal: false, difficulty: 2 },
  { id: 'rs59', word: 'persuadation', isReal: false, difficulty: 2 },
  { id: 'rs60', word: 'moderatelyness', isReal: false, difficulty: 2 },
  { id: 'rs61', word: 'strategiful', isReal: false, difficulty: 2 },
  { id: 'rs62', word: 'hesitatious', isReal: false, difficulty: 2 },
  { id: 'rs63', word: 'accuratement', isReal: false, difficulty: 2 },
  { id: 'rs64', word: 'consequate', isReal: false, difficulty: 2 },

  // Level 3 Real (16)
  { id: 'rs65', word: 'ambiguous', isReal: true, difficulty: 3 },
  { id: 'rs66', word: 'feasible', isReal: true, difficulty: 3 },
  { id: 'rs67', word: 'coherent', isReal: true, difficulty: 3 },
  { id: 'rs68', word: 'inevitable', isReal: true, difficulty: 3 },
  { id: 'rs69', word: 'resilient', isReal: true, difficulty: 3 },
  { id: 'rs70', word: 'incentive', isReal: true, difficulty: 3 },
  { id: 'rs71', word: 'plausible', isReal: true, difficulty: 3 },
  { id: 'rs72', word: 'threshold', isReal: true, difficulty: 3 },
  { id: 'rs73', word: 'arbitrary', isReal: true, difficulty: 3 },
  { id: 'rs74', word: 'empirical', isReal: true, difficulty: 3 },
  { id: 'rs75', word: 'implement', isReal: true, difficulty: 3 },
  { id: 'rs76', word: 'consensus', isReal: true, difficulty: 3 },
  { id: 'rs77', word: 'advocate', isReal: true, difficulty: 3 },
  { id: 'rs78', word: 'cumulative', isReal: true, difficulty: 3 },
  { id: 'rs79', word: 'paradigm', isReal: true, difficulty: 3 },
  { id: 'rs80', word: 'complement', isReal: true, difficulty: 3 },
  // Level 3 Fake (16)
  { id: 'rs81', word: 'prevalate', isReal: false, difficulty: 3 },
  { id: 'rs82', word: 'subverent', isReal: false, difficulty: 3 },
  { id: 'rs83', word: 'intermize', isReal: false, difficulty: 3 },
  { id: 'rs84', word: 'graduatious', isReal: false, difficulty: 3 },
  { id: 'rs85', word: 'quantisible', isReal: false, difficulty: 3 },
  { id: 'rs86', word: 'reconsidate', isReal: false, difficulty: 3 },
  { id: 'rs87', word: 'apprehendive', isReal: false, difficulty: 3 },
  { id: 'rs88', word: 'plausivate', isReal: false, difficulty: 3 },
  { id: 'rs89', word: 'thresholize', isReal: false, difficulty: 3 },
  { id: 'rs90', word: 'coherentiate', isReal: false, difficulty: 3 },
  { id: 'rs91', word: 'incentivate', isReal: false, difficulty: 3 },
  { id: 'rs92', word: 'empiricate', isReal: false, difficulty: 3 },
  { id: 'rs93', word: 'advocatious', isReal: false, difficulty: 3 },
  { id: 'rs94', word: 'cumulativity', isReal: false, difficulty: 3 },
  { id: 'rs95', word: 'paradigmal', isReal: false, difficulty: 3 },
  { id: 'rs96', word: 'complementize', isReal: false, difficulty: 3 },

  // Level 4 Real (16)
  { id: 'rs97', word: 'mitigate', isReal: true, difficulty: 4 },
  { id: 'rs98', word: 'fluctuate', isReal: true, difficulty: 4 },
  { id: 'rs99', word: 'scrutinize', isReal: true, difficulty: 4 },
  { id: 'rs100', word: 'pragmatic', isReal: true, difficulty: 4 },
  { id: 'rs101', word: 'discrepancy', isReal: true, difficulty: 4 },
  { id: 'rs102', word: 'benevolent', isReal: true, difficulty: 4 },
  { id: 'rs103', word: 'exacerbate', isReal: true, difficulty: 4 },
  { id: 'rs104', word: 'proliferate', isReal: true, difficulty: 4 },
  { id: 'rs105', word: 'ambivalent', isReal: true, difficulty: 4 },
  { id: 'rs106', word: 'meticulous', isReal: true, difficulty: 4 },
  { id: 'rs107', word: 'alleviate', isReal: true, difficulty: 4 },
  { id: 'rs108', word: 'preclude', isReal: true, difficulty: 4 },
  { id: 'rs109', word: 'substantiate', isReal: true, difficulty: 4 },
  { id: 'rs110', word: 'contingent', isReal: true, difficulty: 4 },
  { id: 'rs111', word: 'disseminate', isReal: true, difficulty: 4 },
  { id: 'rs112', word: 'culminate', isReal: true, difficulty: 4 },
  // Level 4 Fake (16)
  { id: 'rs113', word: 'conglurate', isReal: false, difficulty: 4 },
  { id: 'rs114', word: 'strenuousity', isReal: false, difficulty: 4 },
  { id: 'rs115', word: 'proclivate', isReal: false, difficulty: 4 },
  { id: 'rs116', word: 'benevolenceful', isReal: false, difficulty: 4 },
  { id: 'rs117', word: 'obliquence', isReal: false, difficulty: 4 },
  { id: 'rs118', word: 'mitigulate', isReal: false, difficulty: 4 },
  { id: 'rs119', word: 'fluctuosity', isReal: false, difficulty: 4 },
  { id: 'rs120', word: 'scrutinizate', isReal: false, difficulty: 4 },
  { id: 'rs121', word: 'pragmatify', isReal: false, difficulty: 4 },
  { id: 'rs122', word: 'discrepate', isReal: false, difficulty: 4 },
  { id: 'rs123', word: 'exacerbrate', isReal: false, difficulty: 4 },
  { id: 'rs124', word: 'proliferious', isReal: false, difficulty: 4 },
  { id: 'rs125', word: 'ambivalate', isReal: false, difficulty: 4 },
  { id: 'rs126', word: 'meticulize', isReal: false, difficulty: 4 },
  { id: 'rs127', word: 'alleviationly', isReal: false, difficulty: 4 },
  { id: 'rs128', word: 'precludence', isReal: false, difficulty: 4 },

  // Level 5 Real (16)
  { id: 'rs129', word: 'ubiquitous', isReal: true, difficulty: 5 },
  { id: 'rs130', word: 'ephemeral', isReal: true, difficulty: 5 },
  { id: 'rs131', word: 'corroborate', isReal: true, difficulty: 5 },
  { id: 'rs132', word: 'magnanimous', isReal: true, difficulty: 5 },
  { id: 'rs133', word: 'obfuscate', isReal: true, difficulty: 5 },
  { id: 'rs134', word: 'recalcitrant', isReal: true, difficulty: 5 },
  { id: 'rs135', word: 'idiosyncrasy', isReal: true, difficulty: 5 },
  { id: 'rs136', word: 'juxtapose', isReal: true, difficulty: 5 },
  { id: 'rs137', word: 'perspicacious', isReal: true, difficulty: 5 },
  { id: 'rs138', word: 'equanimity', isReal: true, difficulty: 5 },
  { id: 'rs139', word: 'taciturn', isReal: true, difficulty: 5 },
  { id: 'rs140', word: 'superfluous', isReal: true, difficulty: 5 },
  { id: 'rs141', word: 'intransigent', isReal: true, difficulty: 5 },
  { id: 'rs142', word: 'anachronism', isReal: true, difficulty: 5 },
  { id: 'rs143', word: 'circumspect', isReal: true, difficulty: 5 },
  { id: 'rs144', word: 'propensity', isReal: true, difficulty: 5 },
  // Level 5 Fake (16)
  { id: 'rs145', word: 'perspicuate', isReal: false, difficulty: 5 },
  { id: 'rs146', word: 'confabulious', isReal: false, difficulty: 5 },
  { id: 'rs147', word: 'veritacious', isReal: false, difficulty: 5 },
  { id: 'rs148', word: 'ubiquitence', isReal: false, difficulty: 5 },
  { id: 'rs149', word: 'ephemerious', isReal: false, difficulty: 5 },
  { id: 'rs150', word: 'corroborify', isReal: false, difficulty: 5 },
  { id: 'rs151', word: 'magnanimious', isReal: false, difficulty: 5 },
  { id: 'rs152', word: 'obfuscal', isReal: false, difficulty: 5 },
  { id: 'rs153', word: 'recalcitrious', isReal: false, difficulty: 5 },
  { id: 'rs154', word: 'juxtaposent', isReal: false, difficulty: 5 },
  { id: 'rs155', word: 'equanimical', isReal: false, difficulty: 5 },
  { id: 'rs156', word: 'taciturnize', isReal: false, difficulty: 5 },
  { id: 'rs157', word: 'superfluicate', isReal: false, difficulty: 5 },
  { id: 'rs158', word: 'intransigentize', isReal: false, difficulty: 5 },
  { id: 'rs159', word: 'anachronate', isReal: false, difficulty: 5 },
  { id: 'rs160', word: 'circumspectious', isReal: false, difficulty: 5 }
];

const FILL_BLANKS_BANK = [
  { id: 'fb1', difficulty: 1, before: 'Students are encouraged to arrive early so they can ', prefix: 'prep', missing: 'are', after: ' for the laboratory session.', fullWord: 'prepare' },
  { id: 'fb2', difficulty: 1, before: 'Public libraries provide free ', prefix: 'acc', missing: 'ess', after: ' to books, computers, and quiet study rooms.', fullWord: 'access' },
  { id: 'fb3', difficulty: 2, before: 'Because of the heavy snowstorm, the university decided to ', prefix: 'can', missing: 'cel', after: ' all afternoon lectures.', fullWord: 'cancel' },
  { id: 'fb4', difficulty: 2, before: 'Regular physical exercise can significantly ', prefix: 'imp', missing: 'rove', after: ' both sleep quality and mood.', fullWord: 'improve' },
  { id: 'fb5', difficulty: 2, before: 'Before signing a rental contract, tenants should carefully read every ', prefix: 'clau', missing: 'se', after: ' in the agreement.', fullWord: 'clause' },
  { id: 'fb6', difficulty: 2, before: 'Solar energy has become an increasingly ', prefix: 'affor', missing: 'dable', after: ' option for rural communities.', fullWord: 'affordable' },
  { id: 'fb7', difficulty: 3, before: 'The researchers collected data over three years to ', prefix: 'estab', missing: 'lish', after: ' a clear link between diet and focus.', fullWord: 'establish' },
  { id: 'fb8', difficulty: 3, before: 'Although the two candidates disagreed on tax policy, they reached a ', prefix: 'comp', missing: 'romise', after: ' on education funding.', fullWord: 'compromise' },
  { id: 'fb9', difficulty: 3, before: 'Urban planners must balance economic growth with ', prefix: 'envir', missing: 'onmental', after: ' protection.', fullWord: 'environmental' },
  { id: 'fb10', difficulty: 3, before: 'Lack of clean water remains a ', prefix: 'pers', missing: 'istent', after: ' challenge in several arid regions.', fullWord: 'persistent' },
  { id: 'fb11', difficulty: 4, before: 'The committee reviewed the proposal thoroughly, yet its final verdict remained ', prefix: 'ambig', missing: 'uous', after: '.', fullWord: 'ambiguous' },
  { id: 'fb12', difficulty: 4, before: 'New coastal wetlands were restored to ', prefix: 'miti', missing: 'gate', after: ' the impact of seasonal flooding.', fullWord: 'mitigate' },
  { id: 'fb13', difficulty: 4, before: 'Historians often rely on multiple independent sources to ', prefix: 'corrob', missing: 'orate', after: ' eyewitness accounts.', fullWord: 'corroborate' },
  { id: 'fb14', difficulty: 4, before: 'Rapid urbanization has ', prefix: 'accel', missing: 'erated', after: ' demand for reliable public transit networks.', fullWord: 'accelerated' },
  { id: 'fb15', difficulty: 5, before: 'Smartphones have become nearly ', prefix: 'ubiq', missing: 'uitous', after: ' tools in modern university classrooms.', fullWord: 'ubiquitous' },
  { id: 'fb16', difficulty: 5, before: 'The archaeologist noticed a subtle ', prefix: 'discr', missing: 'epancy', after: ' between the pottery fragments and written records.', fullWord: 'discrepancy' }
];

const READ_COMPLETE_BANK = [
  {
    id: 'rc1',
    difficulty: 2,
    title: 'Urban Community Gardens',
    segments: [
      { text: 'Community gardens are transforming unused urban spaces into vibrant green neighborhoods. In many large ' },
      { prefix: 'ci', missing: 'ties' },
      { text: ', residents work together to ' },
      { prefix: 'pl', missing: 'ant' },
      { text: ' vegetables, herbs, and flowers on shared plots of land. These projects not ' },
      { prefix: 'on', missing: 'ly' },
      { text: ' provide fresh, affordable produce, ' },
      { prefix: 'b', missing: 'ut' },
      { text: ' they also strengthen social connections among neighbors. Children who ' },
      { prefix: 'partic', missing: 'ipate' },
      { text: ' learn valuable lessons about nutrition and ecology. Furthermore, patches of greenery help cool dense streets during hot summer months and support local pollinators.' }
    ]
  },
  {
    id: 'rc2',
    difficulty: 3,
    title: 'Sleep and Memory Consolidation',
    segments: [
      { text: 'Scientists have long recognized that quality sleep plays a critical role in human learning. While a person ' },
      { prefix: 'res', missing: 'ts' },
      { text: ', the brain does not simply shut down; ' },
      { prefix: 'inst', missing: 'ead' },
      { text: ', it actively reorganizes recent experiences. Important information gathered during the day is ' },
      { prefix: 'trans', missing: 'ferred' },
      { text: ' from temporary storage into long-term memory networks. Students who pull all-nighters before exams often struggle to ' },
      { prefix: 'rec', missing: 'all' },
      { text: ' complex concepts accurately because their brains miss this vital stage. Consequently, maintaining a ' },
      { prefix: 'cons', missing: 'istent' },
      { text: ' sleep schedule is one of the most effective study strategies available.' }
    ]
  },
  {
    id: 'rc3',
    difficulty: 3,
    title: 'The Evolution of Paper Money',
    segments: [
      { text: 'Before paper banknotes existed, societies relied heavily on metal coins for daily trade. However, carrying large quantities of silver or copper across long distances was both ' },
      { prefix: 'hea', missing: 'vy' },
      { text: ' and dangerous for traveling merchants. During the Tang and Song dynasties in China, traders began leaving coins with trusted ' },
      { prefix: 'age', missing: 'nts' },
      { text: ' in exchange for written receipts. Over time, these paper certificates evolved into an official ' },
      { prefix: 'curr', missing: 'ency' },
      { text: ' backed by the government. Although people initially questioned whether lightweight paper could hold genuine ' },
      { prefix: 'val', missing: 'ue' },
      { text: ', the convenience of banknotes soon revolutionized global commerce.' }
    ]
  },
  {
    id: 'rc4',
    difficulty: 4,
    title: 'Acoustic Design in Concert Halls',
    segments: [
      { text: 'Designing a world-class concert hall requires a delicate balance between architecture and physics. Sound waves produced by an orchestra must ' },
      { prefix: 'ref', missing: 'lect' },
      { text: ' evenly off walls and ceilings so that every listener hears clear, warm music. If a room causes too much ' },
      { prefix: 'ec', missing: 'ho' },
      { text: ', fast musical passages blur together and lose definition. Conversely, an overly absorbent space makes instruments sound ' },
      { prefix: 'du', missing: 'll' },
      { text: ' and lifeless. Modern acoustic engineers use computer ' },
      { prefix: 'simul', missing: 'ations' },
      { text: ' alongside wooden panels and curved surfaces to ' },
      { prefix: 'ach', missing: 'ieve' },
      { text: ' clarity. As a result, audiences sitting in the back balcony enjoy nearly the same richness as those near the stage.' }
    ]
  },
  {
    id: 'rc5',
    difficulty: 5,
    title: 'Microplastics in Freshwater Ecosystems',
    segments: [
      { text: 'While ocean plastic pollution has captured widespread public attention, freshwater rivers and lakes face a similarly urgent threat. Microscopic plastic fibers shed from synthetic clothing and packaging ' },
      { prefix: 'accum', missing: 'ulate' },
      { text: ' steadily in inland waterways. Because wastewater treatment facilities cannot always ' },
      { prefix: 'fil', missing: 'ter' },
      { text: ' out particles smaller than a millimeter, they frequently pass into streams. Aquatic organisms mistake these ' },
      { prefix: 'frag', missing: 'ments' },
      { text: ' for food, allowing synthetic compounds to enter the broader food chain. Environmental chemists are now developing biodegradable textiles and ' },
      { prefix: 'inno', missing: 'vative' },
      { text: ' filtration membranes to curb emissions at the source. Addressing freshwater contamination early is essential for safeguarding both biodiversity and drinking water.' }
    ]
  }
];

const LISTEN_TYPE_BANK = [
  { id: 'lt1', difficulty: 1, sentence: 'The library stays open until midnight during final exams.' },
  { id: 'lt2', difficulty: 1, sentence: 'Please remember to bring your student identification card tomorrow.' },
  { id: 'lt3', difficulty: 2, sentence: 'Several trains were delayed this morning because of heavy fog.' },
  { id: 'lt4', difficulty: 2, sentence: 'Professor Miller asked everyone to submit their essays before Friday.' },
  { id: 'lt5', difficulty: 2, sentence: 'Our neighborhood café now offers reusable cups for regular customers.' },
  { id: 'lt6', difficulty: 3, sentence: 'Although the experiment took months to prepare, the results were remarkably clear.' },
  { id: 'lt7', difficulty: 3, sentence: 'Investing in public transportation reduces traffic congestion and lowers air pollution.' },
  { id: 'lt8', difficulty: 3, sentence: 'Volunteers planted over three hundred native trees along the riverbank.' },
  { id: 'lt9', difficulty: 3, sentence: 'Students who participate in study groups often retain new vocabulary longer.' },
  { id: 'lt10', difficulty: 4, sentence: 'Economic analysts cautioned that energy prices could fluctuate throughout the winter.' },
  { id: 'lt11', difficulty: 4, sentence: 'The museum exhibition explores how ancient astronomers mapped seasonal stars.' },
  { id: 'lt12', difficulty: 4, sentence: 'Effective communication requires listening carefully before offering constructive feedback.' },
  { id: 'lt13', difficulty: 5, sentence: 'Despite initial skepticism, the interdisciplinary research team corroborated the earlier findings.' },
  { id: 'lt14', difficulty: 5, sentence: 'Municipal authorities implemented stringent conservation measures to mitigate seasonal droughts.' }
];

const READ_ALOUD_BANK = [
  { id: 'ra1', difficulty: 1, sentence: 'My brother enjoys riding his bicycle through the park every Sunday morning.' },
  { id: 'ra2', difficulty: 2, sentence: 'Learning a second language opens doors to new cultures and international friendships.' },
  { id: 'ra3', difficulty: 2, sentence: 'The university bookstore will offer discounted textbooks throughout the first week of classes.' },
  { id: 'ra4', difficulty: 3, sentence: 'Renewable energy technologies are rapidly transforming how coastal cities generate electricity.' },
  { id: 'ra5', difficulty: 3, sentence: 'Before drawing firm conclusions, scientists carefully examine whether their data can be replicated.' },
  { id: 'ra6', difficulty: 4, sentence: 'Although digital archives make historical documents accessible worldwide, preserving original manuscripts remains vital.' },
  { id: 'ra7', difficulty: 4, sentence: 'Clear urban signage helps first-time visitors navigate crowded subway stations with confidence.' },
  { id: 'ra8', difficulty: 5, sentence: 'Longitudinal studies indicate that early childhood exposure to music enhances auditory processing.' }
];

const INTERACTIVE_READING_BANK = [
  {
    id: 'ir1',
    difficulty: 3,
    title: 'How Cities Cool Down With Reflective Surfaces',
    stage1: {
      paragraphParts: [
        'Modern cities often absorb far more heat than surrounding rural areas, creating what scientists call the urban heat island ',
        '. Dark asphalt roads and tar rooftops trap solar ',
        ' throughout the afternoon and release it slowly after sunset. To ',
        ' this rising temperature, several municipalities have started coating streets and roofs with pale, reflective paint. Early trials in Phoenix and Los Angeles ',
        ' that lighter surfaces can lower neighborhood air temperatures by several degrees. In addition to improving outdoor comfort, cooler buildings require significantly less electricity for air ',
        '.'
      ],
      blanks: [
        { options: ['effect', 'traffic', 'border', 'schedule'], correct: 'effect' },
        { options: ['noise', 'radiation', 'moisture', 'gravity'], correct: 'radiation' },
        { options: ['counteract', 'celebrate', 'abandon', 'postpone'], correct: 'counteract' },
        { options: ['ignored', 'demonstrated', 'forbidden', 'doubted'], correct: 'demonstrated' },
        { options: ['conditioning', 'transport', 'advertising', 'banking'], correct: 'conditioning' }
      ]
    },
    stage2: {
      before: 'Modern cities often absorb far more heat than surrounding rural areas, creating what scientists call the urban heat island effect. Dark asphalt roads and tar rooftops trap solar radiation throughout the afternoon and release it slowly after sunset. To counteract this rising temperature, several municipalities have started coating streets and roofs with pale, reflective paint. Early trials in Phoenix and Los Angeles demonstrated that lighter surfaces can lower neighborhood air temperatures by several degrees. In addition to improving outdoor comfort, cooler buildings require significantly less electricity for air conditioning.',
      after: 'Consequently, urban planners view reflective materials as an affordable complement to tree-planting programs rather than a complete replacement.',
      options: [
        'However, reflective coatings must be paired with shade trees because bright pavements can increase glare for pedestrians.',
        'Many residents prefer moving to rural farms where winter temperatures remain mild.',
        'Electric buses have completely replaced personal automobiles in every major desert city.',
        'Paint manufacturers rarely test whether their products last indoors during rainy seasons.'
      ],
      correct: 'However, reflective coatings must be paired with shade trees because bright pavements can increase glare for pedestrians.'
    },
    fullSentences: [
      'Modern cities often absorb far more heat than surrounding rural areas, creating what scientists call the urban heat island effect.',
      'Dark asphalt roads and tar rooftops trap solar radiation throughout the afternoon and release it slowly after sunset.',
      'To counteract this rising temperature, several municipalities have started coating streets and roofs with pale, reflective paint.',
      'Early trials in Phoenix and Los Angeles demonstrated that lighter surfaces can lower neighborhood air temperatures by several degrees.',
      'In addition to improving outdoor comfort, cooler buildings require significantly less electricity for air conditioning.',
      'However, reflective coatings must be paired with shade trees because bright pavements can increase glare for pedestrians.',
      'Consequently, urban planners view reflective materials as an affordable complement to tree-planting programs rather than a complete replacement.'
    ],
    stage3a: {
      question: 'Highlight the sentence that explains why traditional roads and roofs make cities hotter.',
      correctSentenceIndex: 1
    },
    stage3b: {
      question: 'Highlight the sentence that mentions one drawback of bright reflective surfaces.',
      correctSentenceIndex: 5
    },
    stage4: {
      question: 'What is the main idea of the passage?',
      options: [
        'Reflective surfaces help reduce urban heat and energy demand, especially when combined with trees.',
        'Dark asphalt is cheaper to manufacture than pale concrete in desert regions.',
        'Air conditioning units are the primary source of electricity in Phoenix.',
        'Tree-planting initiatives have failed to lower summer temperatures in major cities.'
      ],
      correct: 'Reflective surfaces help reduce urban heat and energy demand, especially when combined with trees.'
    },
    stage5: {
      options: [
        'Cooling Cities With Reflective Surfaces',
        'A History of Asphalt Road Construction',
        'Why Pedestrians Prefer Rural Towns',
        'Inside Power Plants During Summer'
      ],
      correct: 'Cooling Cities With Reflective Surfaces'
    }
  },
  {
    id: 'ir2',
    difficulty: 4,
    title: 'The Power of Birdsong Learning',
    stage1: {
      paragraphParts: [
        'Unlike many animals whose vocal calls are purely instinctive, songbirds must actively learn their melodies from adult tutors. Young zebra finches listen attentively to their fathers during a sensitive early ',
        ' of development. Even before they attempt to sing, neural pathways in their brains store a detailed auditory ',
        ' of the tune. Later, through weeks of noisy practice called subsong, the young birds gradually ',
        ' their own vocalizations until they match the memorized pattern. Researchers study this process closely because it shares striking ',
        ' with how human infants acquire spoken language. Disruption of social interaction during youth can permanently ',
        ' a bird’s ability to produce normal adult songs.'
      ],
      blanks: [
        { options: ['window', 'weather', 'currency', 'harvest'], correct: 'window' },
        { options: ['template', 'recipe', 'mineral', 'parcel'], correct: 'template' },
        { options: ['refine', 'forget', 'conceal', 'divide'], correct: 'refine' },
        { options: ['parallels', 'conflicts', 'invoices', 'hazards'], correct: 'parallels' },
        { options: ['impair', 'decorate', 'multiply', 'borrow'], correct: 'impair' }
      ]
    },
    stage2: {
      before: 'Unlike many animals whose vocal calls are purely instinctive, songbirds must actively learn their melodies from adult tutors. Young zebra finches listen attentively to their fathers during a sensitive early window of development. Even before they attempt to sing, neural pathways in their brains store a detailed auditory template of the tune. Later, through weeks of noisy practice called subsong, the young birds gradually refine their own vocalizations until they match the memorized pattern. Researchers study this process closely because it shares striking parallels with how human infants acquire spoken language. Disruption of social interaction during youth can permanently impair a bird’s ability to produce normal adult songs.',
      after: 'Therefore, examining songbirds continues to yield valuable insights into both animal behavior and human speech disorders.',
      options: [
        'Feedback from hearing their own voice is equally essential, as birds raised without auditory feedback fail to stabilize their notes.',
        'Migratory ducks never return to the same freshwater lakes during warm spring months.',
        'Zebra finches prefer nesting inside empty metal pipes rather than natural branches.',
        'Most adult birds change their entire repertoire every single week.'
      ],
      correct: 'Feedback from hearing their own voice is equally essential, as birds raised without auditory feedback fail to stabilize their notes.'
    },
    fullSentences: [
      'Unlike many animals whose vocal calls are purely instinctive, songbirds must actively learn their melodies from adult tutors.',
      'Young zebra finches listen attentively to their fathers during a sensitive early window of development.',
      'Even before they attempt to sing, neural pathways in their brains store a detailed auditory template of the tune.',
      'Later, through weeks of noisy practice called subsong, the young birds gradually refine their own vocalizations until they match the memorized pattern.',
      'Researchers study this process closely because it shares striking parallels with how human infants acquire spoken language.',
      'Disruption of social interaction during youth can permanently impair a bird’s ability to produce normal adult songs.',
      'Feedback from hearing their own voice is equally essential, as birds raised without auditory feedback fail to stabilize their notes.',
      'Therefore, examining songbirds continues to yield valuable insights into both animal behavior and human speech disorders.'
    ],
    stage3a: {
      question: 'Highlight the sentence that explains why scientists find songbird learning relevant to humans.',
      correctSentenceIndex: 4
    },
    stage3b: {
      question: 'Highlight the sentence describing what happens during the "subsong" practice phase.',
      correctSentenceIndex: 3
    },
    stage4: {
      question: 'What is the main idea of this passage?',
      options: [
        'Songbirds learn songs through early listening, practice, and feedback in ways that resemble human language learning.',
        'Zebra finches are louder than any other bird species studied in biology laboratories.',
        'Adult songbirds stop listening to other members of their flock once winter begins.',
        'Human infants learn vocabulary faster than migratory birds find food.'
      ],
      correct: 'Songbirds learn songs through early listening, practice, and feedback in ways that resemble human language learning.'
    },
    stage5: {
      options: [
        'How Songbirds Learn Their Melodies',
        'Protecting Zebra Finches From Winter Storms',
        'A Field Guide to Backyard Birdhouses',
        'Why Birds Migrate Across Oceans'
      ],
      correct: 'How Songbirds Learn Their Melodies'
    }
  }
];

const INTERACTIVE_LISTENING_BANK = [
  {
    id: 'il1',
    difficulty: 2,
    scenario: 'You are a university student visiting your biology teaching assistant, Maya, during office hours to ask about a lab report deadline.',
    peerName: 'Maya (TA)',
    turns: [
      {
        audioText: 'Hi! Come on in. Are you here to go over the cellular respiration lab report?',
        options: [
          'Yes, thanks for seeing me. I had a quick question about the data analysis section.',
          'No, I am looking for the campus swimming pool schedule.',
          'Actually, I already graduated three years ago.',
          'I forgot whether biology is a type of math.'
        ],
        correct: 'Yes, thanks for seeing me. I had a quick question about the data analysis section.'
      },
      {
        audioText: 'Sure, happy to help. Which part of the data analysis is giving you trouble — the oxygen graph or the error calculation?',
        options: [
          'Mainly the error calculation. I am unsure whether to use standard deviation across all three trials.',
          'I already ate lunch at the student cafeteria.',
          'I prefer reading historical novels on rainy weekends.',
          'The projector in the lecture hall was painted blue.'
        ],
        correct: 'Mainly the error calculation. I am unsure whether to use standard deviation across all three trials.'
      },
      {
        audioText: 'Good catch! Yes, include the standard deviation for the three trials and briefly mention any outlier in your discussion paragraph.',
        options: [
          'That makes sense. Also, since our lab partner was sick yesterday, could we get a 24-hour extension?',
          'Okay, so I should delete all three trials and leave the page blank?',
          'Wait, is standard deviation a museum downtown?',
          'I will buy three new bicycles tomorrow afternoon.'
        ],
        correct: 'That makes sense. Also, since our lab partner was sick yesterday, could we get a 24-hour extension?'
      },
      {
        audioText: 'Since you came by early to check, I can approve an extension until Thursday at five p.m. Just email me a quick reminder tonight.',
        options: [
          'Thank you so much, Maya! I will send you that email right after class and submit on Thursday.',
          'I refuse to submit any report this semester.',
          'Thursday is when I plan to drop out of school.',
          'Please cancel my library membership instead.'
        ],
        correct: 'Thank you so much, Maya! I will send you that email right after class and submit on Thursday.'
      }
    ],
    summaryPrompt: 'Summarize your conversation with Maya, including what you asked about the lab report and what you agreed on regarding the deadline.'
  },
  {
    id: 'il2',
    difficulty: 3,
    scenario: 'You are meeting your academic advisor, Dr. Patel, to plan your course registration for next semester.',
    peerName: 'Dr. Patel',
    turns: [
      {
        audioText: 'Good afternoon! I pulled up your transcript. How are you feeling about your workload this term?',
        options: [
          'Pretty good overall, though balancing two lab courses with my part-time job has been intense.',
          'My suitcase is still at the train station.',
          'I think Tuesday tastes better than Friday.',
          'I never enrolled at this university.'
        ],
        correct: 'Pretty good overall, though balancing two lab courses with my part-time job has been intense.'
      },
      {
        audioText: 'I see that. For next semester, you still need an ethics seminar and a statistics class. Do you want to take both together?',
        options: [
          'That sounds manageable if I take the morning ethics seminar and keep Fridays open for work.',
          'No, I want to register for six advanced physics labs at midnight.',
          'Statistics is only taught inside coffee shops.',
          'I forgot how to read English books.'
        ],
        correct: 'That sounds manageable if I take the morning ethics seminar and keep Fridays open for work.'
      },
      {
        audioText: 'Smart plan. There is an open seat in Professor Green’s ethics seminar on Mondays and Wednesdays at ten. Would you like me to reserve it?',
        options: [
          'Yes, please! Ten o’clock works perfectly with my schedule. Do I need a prerequisite for statistics?',
          'No, cancel all my classes for the next two years.',
          'Professor Green sold me a broken bicycle.',
          'I prefer taking exams without enrolling in any course.'
        ],
        correct: 'Yes, please! Ten o’clock works perfectly with my schedule. Do I need a prerequisite for statistics?'
      },
      {
        audioText: 'Your calculus credit from last fall satisfies the prerequisite, so you are cleared to register as soon as the portal opens Friday morning.',
        options: [
          'Awesome, thank you, Dr. Patel. I will log into the portal Friday morning and confirm my schedule.',
          'Wait, why did my laptop turn into a refrigerator?',
          'I will ignore the portal until next summer.',
          'Calculus is not a real branch of mathematics.'
        ],
        correct: 'Awesome, thank you, Dr. Patel. I will log into the portal Friday morning and confirm my schedule.'
      }
    ],
    summaryPrompt: 'Summarize your meeting with Dr. Patel, explaining your course plan for next semester and the next steps.'
  }
];

const PHOTO_PROMPTS = [
  { id: 'ph1', sceneId: 'coffee_shop', difficulty: 2, prompt: 'Write a description of the image below for 1 minute.', speakPrompt: 'Describe the image below in detail. Talk about who is in the scene, what they are doing, and the atmosphere.' },
  { id: 'ph2', sceneId: 'university_library', difficulty: 2, prompt: 'Write a description of the image below for 1 minute.', speakPrompt: 'Describe the image below in detail. Mention the setting, the people, and the objects on the table.' },
  { id: 'ph3', sceneId: 'farmers_market', difficulty: 3, prompt: 'Write a description of the image below for 1 minute.', speakPrompt: 'Describe this outdoor market scene in detail, including the people, colors, and items for sale.' },
  { id: 'ph4', sceneId: 'science_lab', difficulty: 3, prompt: 'Write a description of the image below for 1 minute.', speakPrompt: 'Describe what the researcher is doing and what equipment you see in this laboratory.' },
  { id: 'ph5', sceneId: 'coastal_bridge', difficulty: 3, prompt: 'Write a description of the image below for 1 minute.', speakPrompt: 'Describe the scene on the bridge, the weather or time of day, and what the people are doing.' },
  { id: 'ph6', sceneId: 'family_kitchen', difficulty: 2, prompt: 'Write a description of the image below for 1 minute.', speakPrompt: 'Describe the kitchen scene and how the two people are working together.' },
  { id: 'ph7', sceneId: 'mountain_hike', difficulty: 4, prompt: 'Write a description of the image below for 1 minute.', speakPrompt: 'Describe this mountain landscape, the hiker, and the mood conveyed by the lighting.' },
  { id: 'ph8', sceneId: 'train_station', difficulty: 3, prompt: 'Write a description of the image below for 1 minute.', speakPrompt: 'Describe what is happening on this train platform and who you see waiting.' }
];

const INTERACTIVE_WRITING_BANK = [
  {
    id: 'iw1',
    difficulty: 2,
    part1Prompt: 'Many universities now offer hybrid classes combining online lectures with in-person workshops. Do you think hybrid learning is better than fully in-person education? Explain your view with examples.',
    part2Prompt: 'What challenges might students from low-income backgrounds face in hybrid courses, and how could universities solve them?'
  },
  {
    id: 'iw2',
    difficulty: 3,
    part1Prompt: 'Should cities make public buses and trains completely free for residents, even if it requires slightly higher local taxes? Discuss both benefits and drawbacks.',
    part2Prompt: 'If free public transit becomes overcrowded during rush hour, what practical policies should city planners introduce?'
  },
  {
    id: 'iw3',
    difficulty: 3,
    part1Prompt: 'Some companies now evaluate job applicants using skills tests instead of requiring a university degree. Do you agree with this shift? Why or why not?',
    part2Prompt: 'In which professions should formal university degrees still remain mandatory, and why?'
  },
  {
    id: 'iw4',
    difficulty: 4,
    part1Prompt: 'Artificial intelligence tools can summarize textbooks and draft essays within seconds. How should schools adapt their teaching and grading methods in response?',
    part2Prompt: 'How can a student use AI productively for learning without weakening their own critical thinking skills?'
  }
];

const READ_THEN_SPEAK_BANK = [
  {
    id: 'rts1',
    difficulty: 2,
    prompt: 'Describe a skill outside of school or work that you learned on your own.',
    bullets: [
      'What the skill is and why you wanted to learn it',
      'What resources or methods helped you improve',
      'How this skill helps you in daily life today'
    ]
  },
  {
    id: 'rts2',
    difficulty: 3,
    prompt: 'Discuss whether teenagers should be encouraged to work a part-time job during school holidays.',
    bullets: [
      'Financial and personal benefits of part-time work',
      'Possible risks to academic performance or rest',
      'Your overall recommendation for students and parents'
    ]
  },
  {
    id: 'rts3',
    difficulty: 3,
    prompt: 'Talk about an environmental problem in your city or country and a realistic solution.',
    bullets: [
      'What causes the problem',
      'How it affects local residents',
      'What individuals and governments can do together'
    ]
  },
  {
    id: 'rts4',
    difficulty: 4,
    prompt: 'Compare reading printed books with listening to audiobooks or reading on screens.',
    bullets: [
      'Situations where each format works best',
      'How format affects concentration and memory',
      'Which format you prefer for serious study and why'
    ]
  }
];

const WRITING_SAMPLE_BANK = [
  {
    id: 'ws1',
    difficulty: 3,
    prompt: 'Technology connects people across continents, yet many researchers report rising loneliness among young adults. Explain why this paradox exists and propose meaningful ways communities can rebuild face-to-face connection.'
  },
  {
    id: 'ws2',
    difficulty: 4,
    prompt: 'When governments allocate limited public funds, should priority go toward scientific research with long-term benefits or immediate social services? Support your position with clear reasoning and examples.'
  },
  {
    id: 'ws3',
    difficulty: 3,
    prompt: 'Describe a setback or failure that unexpectedly changed your perspective for the better. What did you learn from the experience, and how did it shape your future goals?'
  }
];

const SPEAKING_SAMPLE_BANK = [
  {
    id: 'ss1',
    difficulty: 3,
    prompt: 'If you could design one new mandatory high school course that every student must take before graduating, what would it teach and why is it essential for modern life?'
  },
  {
    id: 'ss2',
    difficulty: 4,
    prompt: 'Some people prefer living in a fast-paced metropolis with endless opportunities, while others value the calm and tight-knit community of a smaller town. Which environment suits you better and why?'
  },
  {
    id: 'ss3',
    difficulty: 3,
    prompt: 'Tell a story about a time when you had to collaborate with someone whose working style was very different from yours. How did you handle the differences?'
  }
];

export function getBankForType(type) {
  switch (type) {
    case 'read_select': return READ_SELECT_BANK.map((q) => ({ ...q, type }));
    case 'fill_blanks': return FILL_BLANKS_BANK.map((q) => ({ ...q, type }));
    case 'read_complete': return READ_COMPLETE_BANK.map((q) => ({ ...q, type }));
    case 'listen_type': return LISTEN_TYPE_BANK.map((q) => ({ ...q, type }));
    case 'read_aloud': return READ_ALOUD_BANK.map((q) => ({ ...q, type }));
    case 'interactive_reading': return INTERACTIVE_READING_BANK.map((q) => ({ ...q, type }));
    case 'interactive_listening': return INTERACTIVE_LISTENING_BANK.map((q) => ({ ...q, type }));
    case 'write_photo':
      return PHOTO_PROMPTS.map((q) => {
        const scene = SCENES.find((s) => s.id === q.sceneId) || SCENES[0];
        return { ...q, type, imageDescription: scene.imageDescription };
      });
    case 'speak_photo':
      return PHOTO_PROMPTS.map((q) => {
        const scene = SCENES.find((s) => s.id === q.sceneId) || SCENES[0];
        return { ...q, type, prompt: q.speakPrompt, imageDescription: scene.imageDescription };
      });
    case 'interactive_writing': return INTERACTIVE_WRITING_BANK.map((q) => ({ ...q, type }));
    case 'read_then_speak': return READ_THEN_SPEAK_BANK.map((q) => ({ ...q, type }));
    case 'writing_sample': return WRITING_SAMPLE_BANK.map((q) => ({ ...q, type }));
    case 'speaking_sample': return SPEAKING_SAMPLE_BANK.map((q) => ({ ...q, type }));
    default: return [];
  }
}

export function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickQuestionFromBank(type, difficulty = 3, usedIds = new Set(), options = {}) {
  const all = getBankForType(type);
  if (!all.length) return null;

  const seenIds = options.seenIds instanceof Set ? options.seenIds : new Set();
  const preferReal = typeof options.preferReal === 'boolean' ? options.preferReal : null;

  // Tier 1: neither seen previously nor used in this session
  let pool = all.filter((q) => !usedIds.has(q.id) && !seenIds.has(q.id));
  // Tier 2: not used in this session (if entire bank was seen in previous rounds)
  if (!pool.length) {
    pool = all.filter((q) => !usedIds.has(q.id));
  }
  // Tier 3: fallback to full bank
  if (!pool.length) {
    pool = all;
  }

  if (preferReal !== null) {
    const matchingPolar = pool.filter((q) => Boolean(q.isReal) === preferReal);
    if (matchingPolar.length > 0) {
      pool = matchingPolar;
    }
  }

  // Shuffle first so selection is never biased toward top-of-array entries
  const shuffled = shuffleArray(pool);
  const exactDiff = shuffled.filter((q) => (q.difficulty || 3) === difficulty);
  if (exactDiff.length > 0) {
    return exactDiff[Math.floor(Math.random() * exactDiff.length)];
  }
  const nearDiff = shuffled.filter((q) => Math.abs((q.difficulty || 3) - difficulty) <= 1);
  if (nearDiff.length > 0) {
    return nearDiff[Math.floor(Math.random() * nearDiff.length)];
  }
  return shuffled[0];
}

export function buildReadSelectRound({ count = 15, difficulty = 3, seenIds = new Set(), usedIds = new Set() } = {}) {
  const localUsed = new Set(usedIds);
  const realTarget = Math.random() < 0.5 ? Math.floor(count / 2) : Math.ceil(count / 2);
  const fakeTarget = count - realTarget;
  const polarityPlan = shuffleArray([
    ...new Array(realTarget).fill(true),
    ...new Array(fakeTarget).fill(false)
  ]);

  const round = [];
  for (let i = 0; i < count; i++) {
    // Allow natural +/-1 difficulty variety across a round while centering on target difficulty
    const stepDiff = Math.max(1, Math.min(5, difficulty + (i % 3 === 0 ? 0 : (Math.random() < 0.5 ? -1 : 1))));
    const item = pickQuestionFromBank('read_select', stepDiff, localUsed, {
      seenIds,
      preferReal: polarityPlan[i]
    });
    if (item) {
      localUsed.add(item.id);
      round.push(item);
    }
  }
  return shuffleArray(round);
}
