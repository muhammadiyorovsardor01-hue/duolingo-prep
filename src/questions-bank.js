import { SCENES } from './scenes.js';
import {
  generateDynamicFillBlanks,
  generateDynamicReadComplete,
  getDynamicFillCount,
  getDynamicCTestCount
} from './dynamic-gen.js';

export const QUESTION_TYPES = [
  {
    id: 'read_select',
    name: 'Read and Select',
    category: 'reading',
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
    category: 'reading',
    skills: ['reading'],
    durationSec: 20,
    sessionLength: 5,
    descUz: 'Gapdagi tushirib qoldirilgan so‘zning qolgan harflarini 20 soniyada to‘ldiring.',
    descEn: 'Complete the unfinished word in a sentence within 20 seconds.',
    aiGeneratable: true,
    icon: '✏️'
  },
  {
    id: 'read_complete',
    name: 'Read and Complete',
    category: 'reading',
    skills: ['reading'],
    durationSec: 180,
    sessionLength: 2,
    descUz: 'Akademik matndagi chala qoldirilgan so‘zlarning harflarini 3 daqiqada tiklang.',
    descEn: 'Restore missing word endings across an academic C-test paragraph in 3 minutes.',
    aiGeneratable: true,
    icon: '📄'
  },
  {
    id: 'interactive_reading',
    name: 'Interactive Reading',
    category: 'reading',
    skills: ['reading'],
    durationSec: 480,
    sessionLength: 1,
    descUz: '6 bosqichli matn tahlili: so‘z tanlash, gap qo‘shish, javobni belgilash, g‘oya va sarlavha.',
    descEn: 'Multi-stage passage reading: blanks, sentence insertion, highlighting, main idea, and title.',
    aiGeneratable: true,
    icon: '📚'
  },
  {
    id: 'listen_type',
    name: 'Listen and Type',
    category: 'listening',
    skills: ['listening'],
    durationSec: 60,
    sessionLength: 6,
    descUz: 'Gapni tinglang (ko‘pi bilan 3 marta) va eshitganingizni aniq yozing.',
    descEn: 'Listen to a spoken sentence (up to 3 plays) and type exactly what you hear.',
    aiGeneratable: true,
    icon: '🎧'
  },
  {
    id: 'interactive_listening',
    name: 'Interactive Listening',
    category: 'listening',
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
    category: 'writing',
    skills: ['writing'],
    durationSec: 60,
    sessionLength: 3,
    descUz: 'Rasmni 1 daqiqa ichida batafsil va chiroyli grammatika bilan tasvirlab yozing.',
    descEn: 'Describe an image in clear, detailed English within 1 minute.',
    aiGeneratable: false,
    icon: '🖼️'
  },
  {
    id: 'writing_sample',
    name: 'Writing Sample',
    category: 'writing',
    skills: ['writing'],
    durationSec: 300,
    sessionLength: 1,
    descUz: '5 daqiqalik akademik ochiq savolga tuzilgan insho yozing (universitetlarga yuboriladi).',
    descEn: 'Write a 5-minute extended essay response on an open-ended prompt.',
    aiGeneratable: true,
    icon: '🎓'
  },
  {
    id: 'interactive_writing',
    name: 'Interactive Writing',
    category: 'writing',
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
    category: 'speaking',
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
    category: 'speaking',
    skills: ['speaking'],
    prepSec: 20,
    durationSec: 90,
    sessionLength: 1,
    descUz: 'Mavzu va 3 ta kichik savolni o‘qib, 90 soniya davomida asosli nutq so‘zlang.',
    descEn: 'Read a topic card with bullet points and speak coherently for up to 90 seconds.',
    aiGeneratable: true,
    icon: '🎙️'
  },
  {
    id: 'speaking_sample',
    name: 'Speaking Sample',
    category: 'speaking',
    skills: ['speaking'],
    prepSec: 30,
    durationSec: 180,
    sessionLength: 1,
    descUz: '30 soniya tayyorgarlikdan so‘ng 1–3 daqiqa davomida erkin fikr bildiring.',
    descEn: 'Prepare for 30s, then speak for 1–3 minutes on an open-ended prompt.',
    aiGeneratable: true,
    icon: '🎤'
  },
  {
    id: 'interactive_speaking',
    name: 'Interactive Speaking',
    category: 'speaking',
    skills: ['speaking'],
    durationSec: 210,
    turnDurationSec: 35,
    sessionLength: 1,
    descUz: '6 ta ketma-ket og‘zaki suhbat savoli: har bir savol 1 marta eshitiladi, javob berish uchun 35 soniya.',
    descEn: '6-question live audio interview: hear each prompt once and respond within 35 seconds per turn.',
    aiGeneratable: true,
    icon: '🗣️'
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
  { id: 'rs160', word: 'circumspectious', isReal: false, difficulty: 5 },

  // Level 1 Real (16 more)
  { id: 'rs161', word: 'adventure', isReal: true, difficulty: 1 },
  { id: 'rs162', word: 'balance', isReal: true, difficulty: 1 },
  { id: 'rs163', word: 'comfort', isReal: true, difficulty: 1 },
  { id: 'rs164', word: 'deliver', isReal: true, difficulty: 1 },
  { id: 'rs165', word: 'example', isReal: true, difficulty: 1 },
  { id: 'rs166', word: 'festival', isReal: true, difficulty: 1 },
  { id: 'rs167', word: 'genuine', isReal: true, difficulty: 1 },
  { id: 'rs168', word: 'horizon', isReal: true, difficulty: 1 },
  { id: 'rs169', word: 'journey', isReal: true, difficulty: 1 },
  { id: 'rs170', word: 'kitchen', isReal: true, difficulty: 1 },
  { id: 'rs171', word: 'lantern', isReal: true, difficulty: 1 },
  { id: 'rs172', word: 'message', isReal: true, difficulty: 1 },
  { id: 'rs173', word: 'natural', isReal: true, difficulty: 1 },
  { id: 'rs174', word: 'patient', isReal: true, difficulty: 1 },
  { id: 'rs175', word: 'quarter', isReal: true, difficulty: 1 },
  { id: 'rs176', word: 'respect', isReal: true, difficulty: 1 },
  // Level 1 Fake (16 more)
  { id: 'rs177', word: 'adventury', isReal: false, difficulty: 1 },
  { id: 'rs178', word: 'balancity', isReal: false, difficulty: 1 },
  { id: 'rs179', word: 'comfortation', isReal: false, difficulty: 1 },
  { id: 'rs180', word: 'deliverment', isReal: false, difficulty: 1 },
  { id: 'rs181', word: 'examplish', isReal: false, difficulty: 1 },
  { id: 'rs182', word: 'festivality', isReal: false, difficulty: 1 },
  { id: 'rs183', word: 'genuinenessy', isReal: false, difficulty: 1 },
  { id: 'rs184', word: 'horizonful', isReal: false, difficulty: 1 },
  { id: 'rs185', word: 'journeyment', isReal: false, difficulty: 1 },
  { id: 'rs186', word: 'kitchenly', isReal: false, difficulty: 1 },
  { id: 'rs187', word: 'lanternize', isReal: false, difficulty: 1 },
  { id: 'rs188', word: 'messagify', isReal: false, difficulty: 1 },
  { id: 'rs189', word: 'naturalment', isReal: false, difficulty: 1 },
  { id: 'rs190', word: 'patientive', isReal: false, difficulty: 1 },
  { id: 'rs191', word: 'quarterish', isReal: false, difficulty: 1 },
  { id: 'rs192', word: 'respectation', isReal: false, difficulty: 1 },

  // Level 2 Real (16 more)
  { id: 'rs193', word: 'achieve', isReal: true, difficulty: 2 },
  { id: 'rs194', word: 'benefit', isReal: true, difficulty: 2 },
  { id: 'rs195', word: 'capture', isReal: true, difficulty: 2 },
  { id: 'rs196', word: 'decline', isReal: true, difficulty: 2 },
  { id: 'rs197', word: 'emerge', isReal: true, difficulty: 2 },
  { id: 'rs198', word: 'flexible', isReal: true, difficulty: 2 },
  { id: 'rs199', word: 'gradual', isReal: true, difficulty: 2 },
  { id: 'rs200', word: 'harvest', isReal: true, difficulty: 2 },
  { id: 'rs201', word: 'inspire', isReal: true, difficulty: 2 },
  { id: 'rs202', word: 'justice', isReal: true, difficulty: 2 },
  { id: 'rs203', word: 'maintain', isReal: true, difficulty: 2 },
  { id: 'rs204', word: 'observe', isReal: true, difficulty: 2 },
  { id: 'rs205', word: 'predict', isReal: true, difficulty: 2 },
  { id: 'rs206', word: 'recover', isReal: true, difficulty: 2 },
  { id: 'rs207', word: 'squeeze', isReal: true, difficulty: 2 },
  { id: 'rs208', word: 'whisper', isReal: true, difficulty: 2 },
  // Level 2 Fake (16 more)
  { id: 'rs209', word: 'achievent', isReal: false, difficulty: 2 },
  { id: 'rs210', word: 'benefitical', isReal: false, difficulty: 2 },
  { id: 'rs211', word: 'capturization', isReal: false, difficulty: 2 },
  { id: 'rs212', word: 'declinement', isReal: false, difficulty: 2 },
  { id: 'rs213', word: 'emergify', isReal: false, difficulty: 2 },
  { id: 'rs214', word: 'flexiblenessly', isReal: false, difficulty: 2 },
  { id: 'rs215', word: 'gradualment', isReal: false, difficulty: 2 },
  { id: 'rs216', word: 'harvestive', isReal: false, difficulty: 2 },
  { id: 'rs217', word: 'inspirate', isReal: false, difficulty: 2 },
  { id: 'rs218', word: 'justicely', isReal: false, difficulty: 2 },
  { id: 'rs219', word: 'maintaination', isReal: false, difficulty: 2 },
  { id: 'rs220', word: 'observify', isReal: false, difficulty: 2 },
  { id: 'rs221', word: 'predictory', isReal: false, difficulty: 2 },
  { id: 'rs222', word: 'recoverance', isReal: false, difficulty: 2 },
  { id: 'rs223', word: 'squeezation', isReal: false, difficulty: 2 },
  { id: 'rs224', word: 'whisperment', isReal: false, difficulty: 2 },

  // Level 3 Real (16 more)
  { id: 'rs225', word: 'compile', isReal: true, difficulty: 3 },
  { id: 'rs226', word: 'criteria', isReal: true, difficulty: 3 },
  { id: 'rs227', word: 'diagnose', isReal: true, difficulty: 3 },
  { id: 'rs228', word: 'elaborate', isReal: true, difficulty: 3 },
  { id: 'rs229', word: 'forecast', isReal: true, difficulty: 3 },
  { id: 'rs230', word: 'integrate', isReal: true, difficulty: 3 },
  { id: 'rs231', word: 'justify', isReal: true, difficulty: 3 },
  { id: 'rs232', word: 'neglect', isReal: true, difficulty: 3 },
  { id: 'rs233', word: 'outcome', isReal: true, difficulty: 3 },
  { id: 'rs234', word: 'priority', isReal: true, difficulty: 3 },
  { id: 'rs235', word: 'regulate', isReal: true, difficulty: 3 },
  { id: 'rs236', word: 'simulate', isReal: true, difficulty: 3 },
  { id: 'rs237', word: 'transmit', isReal: true, difficulty: 3 },
  { id: 'rs238', word: 'undergo', isReal: true, difficulty: 3 },
  { id: 'rs239', word: 'venture', isReal: true, difficulty: 3 },
  { id: 'rs240', word: 'withdraw', isReal: true, difficulty: 3 },
  // Level 3 Fake (16 more)
  { id: 'rs241', word: 'compilate', isReal: false, difficulty: 3 },
  { id: 'rs242', word: 'criterialize', isReal: false, difficulty: 3 },
  { id: 'rs243', word: 'diagnosify', isReal: false, difficulty: 3 },
  { id: 'rs244', word: 'elaboratious', isReal: false, difficulty: 3 },
  { id: 'rs245', word: 'forecastive', isReal: false, difficulty: 3 },
  { id: 'rs246', word: 'integratify', isReal: false, difficulty: 3 },
  { id: 'rs247', word: 'justificatious', isReal: false, difficulty: 3 },
  { id: 'rs248', word: 'neglectfuly', isReal: false, difficulty: 3 },
  { id: 'rs249', word: 'outcomish', isReal: false, difficulty: 3 },
  { id: 'rs250', word: 'prioritify', isReal: false, difficulty: 3 },
  { id: 'rs251', word: 'regulational', isReal: false, difficulty: 3 },
  { id: 'rs252', word: 'simulatious', isReal: false, difficulty: 3 },
  { id: 'rs253', word: 'transmittive', isReal: false, difficulty: 3 },
  { id: 'rs254', word: 'undergoment', isReal: false, difficulty: 3 },
  { id: 'rs255', word: 'venturize', isReal: false, difficulty: 3 },
  { id: 'rs256', word: 'withdrawment', isReal: false, difficulty: 3 },

  // Level 4 Real (16 more)
  { id: 'rs257', word: 'accomplish', isReal: true, difficulty: 4 },
  { id: 'rs258', word: 'bolster', isReal: true, difficulty: 4 },
  { id: 'rs259', word: 'constrain', isReal: true, difficulty: 4 },
  { id: 'rs260', word: 'deduce', isReal: true, difficulty: 4 },
  { id: 'rs261', word: 'elevate', isReal: true, difficulty: 4 },
  { id: 'rs262', word: 'facilitate', isReal: true, difficulty: 4 },
  { id: 'rs263', word: 'harmonize', isReal: true, difficulty: 4 },
  { id: 'rs264', word: 'immerse', isReal: true, difficulty: 4 },
  { id: 'rs265', word: 'jeopardize', isReal: true, difficulty: 4 },
  { id: 'rs266', word: 'manifest', isReal: true, difficulty: 4 },
  { id: 'rs267', word: 'nurture', isReal: true, difficulty: 4 },
  { id: 'rs268', word: 'perceive', isReal: true, difficulty: 4 },
  { id: 'rs269', word: 'reinforce', isReal: true, difficulty: 4 },
  { id: 'rs270', word: 'speculate', isReal: true, difficulty: 4 },
  { id: 'rs271', word: 'traverse', isReal: true, difficulty: 4 },
  { id: 'rs272', word: 'validate', isReal: true, difficulty: 4 },
  // Level 4 Fake (16 more)
  { id: 'rs273', word: 'accomplishify', isReal: false, difficulty: 4 },
  { id: 'rs274', word: 'bolsterize', isReal: false, difficulty: 4 },
  { id: 'rs275', word: 'constrainal', isReal: false, difficulty: 4 },
  { id: 'rs276', word: 'deducify', isReal: false, difficulty: 4 },
  { id: 'rs277', word: 'elevatious', isReal: false, difficulty: 4 },
  { id: 'rs278', word: 'facilitory', isReal: false, difficulty: 4 },
  { id: 'rs279', word: 'harmonizant', isReal: false, difficulty: 4 },
  { id: 'rs280', word: 'immersiveful', isReal: false, difficulty: 4 },
  { id: 'rs281', word: 'jeopardify', isReal: false, difficulty: 4 },
  { id: 'rs282', word: 'manifestory', isReal: false, difficulty: 4 },
  { id: 'rs283', word: 'nurturation', isReal: false, difficulty: 4 },
  { id: 'rs284', word: 'perceivious', isReal: false, difficulty: 4 },
  { id: 'rs285', word: 'reinforcive', isReal: false, difficulty: 4 },
  { id: 'rs286', word: 'speculational', isReal: false, difficulty: 4 },
  { id: 'rs287', word: 'traversify', isReal: false, difficulty: 4 },
  { id: 'rs288', word: 'validatize', isReal: false, difficulty: 4 },

  // Level 5 Real (16 more)
  { id: 'rs289', word: 'acumen', isReal: true, difficulty: 5 },
  { id: 'rs290', word: 'belligerent', isReal: true, difficulty: 5 },
  { id: 'rs291', word: 'clandestine', isReal: true, difficulty: 5 },
  { id: 'rs292', word: 'deleterious', isReal: true, difficulty: 5 },
  { id: 'rs293', word: 'eloquent', isReal: true, difficulty: 5 },
  { id: 'rs294', word: 'fastidious', isReal: true, difficulty: 5 },
  { id: 'rs295', word: 'gregarious', isReal: true, difficulty: 5 },
  { id: 'rs296', word: 'halcyon', isReal: true, difficulty: 5 },
  { id: 'rs297', word: 'impeccable', isReal: true, difficulty: 5 },
  { id: 'rs298', word: 'laconic', isReal: true, difficulty: 5 },
  { id: 'rs299', word: 'munificent', isReal: true, difficulty: 5 },
  { id: 'rs300', word: 'nefarious', isReal: true, difficulty: 5 },
  { id: 'rs301', word: 'ostentatious', isReal: true, difficulty: 5 },
  { id: 'rs302', word: 'pernicious', isReal: true, difficulty: 5 },
  { id: 'rs303', word: 'quixotic', isReal: true, difficulty: 5 },
  { id: 'rs304', word: 'sagacious', isReal: true, difficulty: 5 },
  // Level 5 Fake (16 more)
  { id: 'rs305', word: 'acumenize', isReal: false, difficulty: 5 },
  { id: 'rs306', word: 'belligerencyful', isReal: false, difficulty: 5 },
  { id: 'rs307', word: 'clandestinize', isReal: false, difficulty: 5 },
  { id: 'rs308', word: 'deleteriousity', isReal: false, difficulty: 5 },
  { id: 'rs309', word: 'eloquate', isReal: false, difficulty: 5 },
  { id: 'rs310', word: 'fastidial', isReal: false, difficulty: 5 },
  { id: 'rs311', word: 'gregariate', isReal: false, difficulty: 5 },
  { id: 'rs312', word: 'halcyonize', isReal: false, difficulty: 5 },
  { id: 'rs313', word: 'impeccablist', isReal: false, difficulty: 5 },
  { id: 'rs314', word: 'laconify', isReal: false, difficulty: 5 },
  { id: 'rs315', word: 'munificate', isReal: false, difficulty: 5 },
  { id: 'rs316', word: 'nefariate', isReal: false, difficulty: 5 },
  { id: 'rs317', word: 'ostentatify', isReal: false, difficulty: 5 },
  { id: 'rs318', word: 'perniciousity', isReal: false, difficulty: 5 },
  { id: 'rs319', word: 'quixotize', isReal: false, difficulty: 5 },
  { id: 'rs320', word: 'sagacify', isReal: false, difficulty: 5 }
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
  { id: 'lt3', difficulty: 1, sentence: 'Our morning bus usually arrives at the corner at seven thirty.' },
  { id: 'lt4', difficulty: 1, sentence: 'Did you remember to pack your umbrella before leaving the house?' },
  { id: 'lt5', difficulty: 1, sentence: 'The cafeteria serves hot soup and fresh fruit every afternoon.' },
  { id: 'lt6', difficulty: 1, sentence: 'She writes down new vocabulary words in a small blue notebook.' },
  { id: 'lt7', difficulty: 1, sentence: 'My cousin plans to visit the science museum this weekend.' },
  { id: 'lt8', difficulty: 1, sentence: 'We met outside the main entrance right after the concert ended.' },
  { id: 'lt9', difficulty: 2, sentence: 'Several trains were delayed this morning because of heavy fog.' },
  { id: 'lt10', difficulty: 2, sentence: 'Professor Miller asked everyone to submit their essays before Friday.' },
  { id: 'lt11', difficulty: 2, sentence: 'Our neighborhood café now offers reusable cups for regular customers.' },
  { id: 'lt12', difficulty: 2, sentence: 'Working with a study partner makes difficult homework seem much lighter.' },
  { id: 'lt13', difficulty: 2, sentence: 'The city opened two new bicycle paths along the quiet riverfront.' },
  { id: 'lt14', difficulty: 2, sentence: 'Before signing the apartment lease, read every page very carefully.' },
  { id: 'lt15', difficulty: 2, sentence: 'Solar panels on the roof generate enough power for daily lighting.' },
  { id: 'lt16', difficulty: 2, sentence: 'A short walk outdoors can refresh your mind between long lectures.' },
  { id: 'lt17', difficulty: 2, sentence: 'Local farmers sell fresh apples and honey at the Saturday market.' },
  { id: 'lt18', difficulty: 2, sentence: 'Heavy rain forced the tennis tournament to move indoors until noon.' },
  { id: 'lt19', difficulty: 3, sentence: 'Although the experiment took months to prepare, the results were remarkably clear.' },
  { id: 'lt20', difficulty: 3, sentence: 'Investing in public transportation reduces traffic congestion and lowers air pollution.' },
  { id: 'lt21', difficulty: 3, sentence: 'Volunteers planted over three hundred native trees along the riverbank.' },
  { id: 'lt22', difficulty: 3, sentence: 'Students who participate in study groups often retain new vocabulary longer.' },
  { id: 'lt23', difficulty: 3, sentence: 'Consistent sleep habits help the brain consolidate memories gathered during class.' },
  { id: 'lt24', difficulty: 3, sentence: 'Digital archives allow researchers worldwide to inspect rare historical letters.' },
  { id: 'lt25', difficulty: 3, sentence: 'When planning a long trip, comparing train routes can save both time and money.' },
  { id: 'lt26', difficulty: 3, sentence: 'Public libraries bridge educational gaps by providing free workshops and quiet desks.' },
  { id: 'lt27', difficulty: 3, sentence: 'Coral reefs shelter thousands of marine species and protect coastal villages from storms.' },
  { id: 'lt28', difficulty: 3, sentence: 'Clear feedback from mentors encourages young writers to revise their drafts thoughtfully.' },
  { id: 'lt29', difficulty: 3, sentence: 'Replacing bare concrete with shaded trees lowers summer temperatures across schoolyards.' },
  { id: 'lt30', difficulty: 3, sentence: 'Despite tight budgets, the community theater staged four original plays this season.' },
  { id: 'lt31', difficulty: 4, sentence: 'Economic analysts cautioned that energy prices could fluctuate throughout the winter.' },
  { id: 'lt32', difficulty: 4, sentence: 'The museum exhibition explores how ancient astronomers mapped seasonal stars.' },
  { id: 'lt33', difficulty: 4, sentence: 'Effective communication requires listening carefully before offering constructive feedback.' },
  { id: 'lt34', difficulty: 4, sentence: 'Restoring coastal wetlands helps mitigate the destructive effects of seasonal flooding.' },
  { id: 'lt35', difficulty: 4, sentence: 'Rapid urbanization has accelerated demand for dependable transit and affordable housing.' },
  { id: 'lt36', difficulty: 4, sentence: 'Marine biologists warned that warming ocean currents could disrupt whale migration routes.' },
  { id: 'lt37', difficulty: 4, sentence: 'Acoustic engineers combine computer simulations with curved wooden panels for concert clarity.' },
  { id: 'lt38', difficulty: 4, sentence: 'Independent bookshops continue to thrive by hosting author talks and local reading clubs.' },
  { id: 'lt39', difficulty: 4, sentence: 'Careful longitudinal studies are necessary to substantiate claims about dietary habits.' },
  { id: 'lt40', difficulty: 4, sentence: 'Preserving native wildflowers near farms strengthens wild pollinator populations each spring.' },
  { id: 'lt41', difficulty: 5, sentence: 'Despite initial skepticism, the interdisciplinary research team corroborated the earlier findings.' },
  { id: 'lt42', difficulty: 5, sentence: 'Municipal authorities implemented stringent conservation measures to mitigate seasonal droughts.' },
  { id: 'lt43', difficulty: 5, sentence: 'Behavioral psychologists demonstrate how overwhelming choices can inadvertently provoke buyer regret.' },
  { id: 'lt44', difficulty: 5, sentence: 'Microscopic synthetic fibers steadily accumulate in freshwater streams despite treatment filters.' },
  { id: 'lt45', difficulty: 5, sentence: 'Rather than issuing arbitrary decrees, pragmatic leaders cultivate consensus through dialogue.' },
  { id: 'lt46', difficulty: 5, sentence: 'Overreliance on narrow quantitative metrics can subtly distort university teaching evaluations.' },
  { id: 'lt47', difficulty: 5, sentence: 'Ecological rewilding allows regenerated forests and deep root systems to stabilize fragile soils.' },
  { id: 'lt48', difficulty: 5, sentence: 'Excessive technical jargon often obfuscates practical policy advice meant for everyday citizens.' }
];

const READ_ALOUD_BANK = [
  { id: 'ra1', difficulty: 1, sentence: 'My brother enjoys riding his bicycle through the park every Sunday morning.' },
  { id: 'ra2', difficulty: 1, sentence: 'Remember to bring a warm jacket because the evening breeze gets quite chilly.' },
  { id: 'ra3', difficulty: 1, sentence: 'Our local bakery opens at six and fills the street with the scent of fresh bread.' },
  { id: 'ra4', difficulty: 1, sentence: 'Reading twenty pages before bed helps me relax after a busy day at work.' },
  { id: 'ra5', difficulty: 1, sentence: 'The new subway line makes traveling from the airport to downtown much faster.' },
  { id: 'ra6', difficulty: 2, sentence: 'Learning a second language opens doors to new cultures and international friendships.' },
  { id: 'ra7', difficulty: 2, sentence: 'The university bookstore will offer discounted textbooks throughout the first week of classes.' },
  { id: 'ra8', difficulty: 2, sentence: 'Community gardens give city neighbors a welcoming place to grow healthy vegetables together.' },
  { id: 'ra9', difficulty: 2, sentence: 'Turning off unused lights is one simple habit that lowers monthly electricity bills.' },
  { id: 'ra10', difficulty: 2, sentence: 'Many students prefer studying near sunny windows rather than inside windowless basement rooms.' },
  { id: 'ra11', difficulty: 2, sentence: 'A well-organized schedule leaves enough time for both academic projects and proper rest.' },
  { id: 'ra12', difficulty: 3, sentence: 'Renewable energy technologies are rapidly transforming how coastal cities generate electricity.' },
  { id: 'ra13', difficulty: 3, sentence: 'Before drawing firm conclusions, scientists carefully examine whether their data can be replicated.' },
  { id: 'ra14', difficulty: 3, sentence: 'Public museums play an essential role in keeping regional history accessible to everyone.' },
  { id: 'ra15', difficulty: 3, sentence: 'Balanced journalism presents verified facts clearly while distinguishing news reporting from personal opinion.' },
  { id: 'ra16', difficulty: 3, sentence: 'Small improvements practiced consistently every day often produce greater results than sudden intense effort.' },
  { id: 'ra17', difficulty: 3, sentence: 'Expanding reliable passenger rail networks offers travelers an efficient alternative to crowded highways.' },
  { id: 'ra18', difficulty: 3, sentence: 'Teaching children how to manage a small budget builds practical financial confidence early.' },
  { id: 'ra19', difficulty: 4, sentence: 'Although digital archives make historical documents accessible worldwide, preserving original manuscripts remains vital.' },
  { id: 'ra20', difficulty: 4, sentence: 'Clear urban signage helps first-time visitors navigate crowded subway stations with confidence.' },
  { id: 'ra21', difficulty: 4, sentence: 'Urban planners increasingly combine reflective pavements with shade trees to counteract summer heat.' },
  { id: 'ra22', difficulty: 4, sentence: 'Collaborative research across continents accelerates discoveries in clean water filtration and medicine.' },
  { id: 'ra23', difficulty: 4, sentence: 'Even brief exposure to green spaces during lunch breaks measurably improves concentration afterward.' },
  { id: 'ra24', difficulty: 4, sentence: 'Maintaining transparent communication during public emergencies strengthens trust between citizens and institutions.' },
  { id: 'ra25', difficulty: 5, sentence: 'Longitudinal studies indicate that early childhood exposure to music enhances auditory processing.' },
  { id: 'ra26', difficulty: 5, sentence: 'Ocean currents act like a planetary conveyor belt distributing solar warmth toward polar latitudes.' },
  { id: 'ra27', difficulty: 5, sentence: 'Behavioral researchers observe that overwhelming product assortments can paradoxically reduce customer satisfaction.' },
  { id: 'ra28', difficulty: 5, sentence: 'Biodegradable textiles and advanced filtration membranes are crucial for curbing freshwater microplastic contamination.' },
  { id: 'ra29', difficulty: 5, sentence: 'Architectural preservationists balance structural modernization with faithful respect for historic craftsmanship.' },
  { id: 'ra30', difficulty: 5, sentence: 'Interdisciplinary dialogue encourages specialists to question hidden assumptions within their own methodology.' }
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
  },
  {
    id: 'ir3',
    difficulty: 3,
    title: 'Deep-Sea Hydrothermal Vents',
    stage1: {
      paragraphParts: [
        'For centuries, biologists assumed that all life on Earth depended directly on sunlight for energy. That assumption shattered in 1977 when oceanographers discovered thriving ecosystems around hydrothermal ',
        ' deep on the Pacific Ocean floor. Superheated water rich in dissolved minerals rises through cracks in the volcanic crust where sunlight never ',
        '. Specialized bacteria oxidize hydrogen sulfide chemicals to manufacture organic nutrients through a process called chemosynthesis instead of ',
        '. Giant tube worms and blind shrimp cluster tightly around these mineral chimneys to feed on the ',
        ' microbes. Consequently, deep-sea vents broadened scientific searches for life on icy moons ',
        ' our solar system.'
      ],
      blanks: [
        { options: ['vents', 'glaciers', 'valleys', 'deserts'], correct: 'vents' },
        { options: ['penetrates', 'evaporates', 'freezes', 'calculates'], correct: 'penetrates' },
        { options: ['photosynthesis', 'gravity', 'erosion', 'migration'], correct: 'photosynthesis' },
        { options: ['abundant', 'fragile', 'wooden', 'silent'], correct: 'abundant' },
        { options: ['beyond', 'underneath', 'inside', 'before'], correct: 'beyond' }
      ]
    },
    stage2: {
      before: 'For centuries, biologists assumed that all life on Earth depended directly on sunlight for energy. That assumption shattered in 1977 when oceanographers discovered thriving ecosystems around hydrothermal vents deep on the Pacific Ocean floor. Superheated water rich in dissolved minerals rises through cracks in the volcanic crust where sunlight never penetrates. Specialized bacteria oxidize hydrogen sulfide chemicals to manufacture organic nutrients through a process called chemosynthesis instead of photosynthesis. Giant tube worms and blind shrimp cluster tightly around these mineral chimneys to feed on the abundant microbes.',
      after: 'Consequently, deep-sea vents broadened scientific searches for life on icy moons beyond our solar system.',
      options: [
        'Even under crushing abyssal pressure and toxic water temperatures, these organisms survive without a single ray of daylight.',
        'Shallow coral reefs rely entirely on coastal fishermen for daily mineral supplies.',
        'Submarines rarely carry cameras when exploring freshwater rivers during summer.',
        'Most commercial cruise ships anchor directly beside active underwater volcanoes.'
      ],
      correct: 'Even under crushing abyssal pressure and toxic water temperatures, these organisms survive without a single ray of daylight.'
    },
    fullSentences: [
      'For centuries, biologists assumed that all life on Earth depended directly on sunlight for energy.',
      'That assumption shattered in 1977 when oceanographers discovered thriving ecosystems around hydrothermal vents deep on the Pacific Ocean floor.',
      'Superheated water rich in dissolved minerals rises through cracks in the volcanic crust where sunlight never penetrates.',
      'Specialized bacteria oxidize hydrogen sulfide chemicals to manufacture organic nutrients through a process called chemosynthesis instead of photosynthesis.',
      'Giant tube worms and blind shrimp cluster tightly around these mineral chimneys to feed on the abundant microbes.',
      'Even under crushing abyssal pressure and toxic water temperatures, these organisms survive without a single ray of daylight.',
      'Consequently, deep-sea vents broadened scientific searches for life on icy moons beyond our solar system.'
    ],
    stage3a: {
      question: 'Highlight the sentence explaining how bacteria produce food without sunlight.',
      correctSentenceIndex: 3
    },
    stage3b: {
      question: 'Highlight the sentence naming two larger animals that live near the vents.',
      correctSentenceIndex: 4
    },
    stage4: {
      question: 'What is the main idea of this passage?',
      options: [
        'Hydrothermal vent ecosystems thrive on chemical energy without sunlight, reshaping ideas about where life can exist.',
        'Submarine expeditions in 1977 failed to locate active underwater volcanoes.',
        'Giant tube worms require bright coastal sunshine during winter migration.',
        'Pacific shrimp swim upward to the surface every morning to eat algae.'
      ],
      correct: 'Hydrothermal vent ecosystems thrive on chemical energy without sunlight, reshaping ideas about where life can exist.'
    },
    stage5: {
      options: [
        'Life Without Sunlight at Deep-Sea Vents',
        'Building Submarines for Arctic Tourism',
        'Why Pacific Beaches Experience Summer Storms',
        'A Guide to Raising Freshwater Shrimp'
      ],
      correct: 'Life Without Sunlight at Deep-Sea Vents'
    }
  },
  {
    id: 'ir4',
    difficulty: 2,
    title: 'The Memory Palace Technique',
    stage1: {
      paragraphParts: [
        'Before printed notebooks became inexpensive, ancient Greek and Roman speakers relied on mental strategies to deliver long speeches smoothly. One famous method, known as the memory palace, links unfamiliar facts to familiar physical ',
        '. A learner begins by picturing a building they know well, such as their childhood home or daily ',
        ' route. Next, they place a vivid, unusual mental image for each key idea inside a specific ',
        ' along that path. During recall, the speaker simply imagines walking through the house in order and noticing each ',
        ' object waiting there. Modern memory champions still use this spatial approach to memorize hundreds of ',
        ' digits within minutes.'
      ],
      blanks: [
        { options: ['locations', 'recipes', 'seasons', 'salaries'], correct: 'locations' },
        { options: ['walking', 'cooking', 'sleeping', 'painting'], correct: 'walking' },
        { options: ['room', 'ocean', 'planet', 'cloud'], correct: 'room' },
        { options: ['memorable', 'invisible', 'silent', 'broken'], correct: 'memorable' },
        { options: ['random', 'heavy', 'liquid', 'wooden'], correct: 'random' }
      ]
    },
    stage2: {
      before: 'Before printed notebooks became inexpensive, ancient Greek and Roman speakers relied on mental strategies to deliver long speeches smoothly. One famous method, known as the memory palace, links unfamiliar facts to familiar physical locations. A learner begins by picturing a building they know well, such as their childhood home or daily walking route. Next, they place a vivid, unusual mental image for each key idea inside a specific room along that path. During recall, the speaker simply imagines walking through the house in order and noticing each memorable object waiting there.',
      after: 'Modern memory champions still use this spatial approach to memorize hundreds of random digits within minutes.',
      options: [
        'Brain scans reveal that the technique activates spatial navigation regions that humans naturally evolved to remember landmarks.',
        'Printed books vanished completely from ancient Roman libraries after paper was invented.',
        'Most architecture students avoid sketching floor plans before starting homework.',
        'Listening to loud music guarantees higher grades without reviewing lecture notes.'
      ],
      correct: 'Brain scans reveal that the technique activates spatial navigation regions that humans naturally evolved to remember landmarks.'
    },
    fullSentences: [
      'Before printed notebooks became inexpensive, ancient Greek and Roman speakers relied on mental strategies to deliver long speeches smoothly.',
      'One famous method, known as the memory palace, links unfamiliar facts to familiar physical locations.',
      'A learner begins by picturing a building they know well, such as their childhood home or daily walking route.',
      'Next, they place a vivid, unusual mental image for each key idea inside a specific room along that path.',
      'During recall, the speaker simply imagines walking through the house in order and noticing each memorable object waiting there.',
      'Brain scans reveal that the technique activates spatial navigation regions that humans naturally evolved to remember landmarks.',
      'Modern memory champions still use this spatial approach to memorize hundreds of random digits within minutes.'
    ],
    stage3a: {
      question: 'Highlight the sentence that explains the very first step a learner takes when building a memory palace.',
      correctSentenceIndex: 2
    },
    stage3b: {
      question: 'Highlight the sentence explaining what neuroimaging shows about how this method works.',
      correctSentenceIndex: 5
    },
    stage4: {
      question: 'What is the main idea of this passage?',
      options: [
        'Connecting information to familiar mental locations leverages spatial memory for reliable recall.',
        'Ancient Greek speakers preferred reading speeches directly from expensive stone tablets.',
        'Childhood homes should be redesigned to help students prepare for math exams.',
        'Modern competitions forbid participants from visualizing physical rooms.'
      ],
      correct: 'Connecting information to familiar mental locations leverages spatial memory for reliable recall.'
    },
    stage5: {
      options: [
        'Remembering More Using a Memory Palace',
        'Famous Palaces of Ancient Rome',
        'Why Notebooks Replaced Public Speaking',
        'Decorating Living Rooms for Better Sleep'
      ],
      correct: 'Remembering More Using a Memory Palace'
    }
  },
  {
    id: 'ir5',
    difficulty: 4,
    title: 'Microfinance in Rural Economies',
    stage1: {
      paragraphParts: [
        'Small-scale entrepreneurs in rural villages often possess practical skills yet lack access to traditional bank credit. Conventional lenders routinely demand formal land titles or high collateral that low-income households cannot easily ',
        '. Microfinance institutions address this gap by offering modest loans to groups of neighbors who support one another’s ',
        '. When one tailor purchases a sewing machine or a farmer buys drought-resistant seeds, steady daily earnings help repay the ',
        ' in small weekly installments. High repayment rates demonstrate that poor borrowers are reliable financial partners when terms fit their ',
        '. Nevertheless, economists emphasize that credit works best when paired with business training and reliable ',
        ' to regional markets.'
      ],
      blanks: [
        { options: ['provide', 'forget', 'ignore', 'decorate'], correct: 'provide' },
        { options: ['ventures', 'holidays', 'hobbies', 'storms'], correct: 'ventures' },
        { options: ['principal', 'museum', 'ticket', 'calendar'], correct: 'principal' },
        { options: ['realities', 'costumes', 'posters', 'fictions'], correct: 'realities' },
        { options: ['access', 'traffic', 'rumors', 'noise'], correct: 'access' }
      ]
    },
    stage2: {
      before: 'Small-scale entrepreneurs in rural villages often possess practical skills yet lack access to traditional bank credit. Conventional lenders routinely demand formal land titles or high collateral that low-income households cannot easily provide. Microfinance institutions address this gap by offering modest loans to groups of neighbors who support one another’s ventures. When one tailor purchases a sewing machine or a farmer buys drought-resistant seeds, steady daily earnings help repay the principal in small weekly installments. High repayment rates demonstrate that poor borrowers are reliable financial partners when terms fit their realities.',
      after: 'Nevertheless, economists emphasize that credit works best when paired with business training and reliable access to regional markets.',
      options: [
        'Group accountability also replaces expensive paperwork, lowering administrative fees for local lending cooperatives.',
        'Major stock exchanges forbid rural farmers from selling grain during autumn harvests.',
        'Tailors generally prefer borrowing tractors instead of repairing older sewing tools.',
        'Urban banks stopped issuing home mortgages across Europe during the last decade.'
      ],
      correct: 'Group accountability also replaces expensive paperwork, lowering administrative fees for local lending cooperatives.'
    },
    fullSentences: [
      'Small-scale entrepreneurs in rural villages often possess practical skills yet lack access to traditional bank credit.',
      'Conventional lenders routinely demand formal land titles or high collateral that low-income households cannot easily provide.',
      'Microfinance institutions address this gap by offering modest loans to groups of neighbors who support one another’s ventures.',
      'When one tailor purchases a sewing machine or a farmer buys drought-resistant seeds, steady daily earnings help repay the principal in small weekly installments.',
      'High repayment rates demonstrate that poor borrowers are reliable financial partners when terms fit their realities.',
      'Group accountability also replaces expensive paperwork, lowering administrative fees for local lending cooperatives.',
      'Nevertheless, economists emphasize that credit works best when paired with business training and reliable access to regional markets.'
    ],
    stage3a: {
      question: 'Highlight the sentence explaining why conventional banks often reject rural borrowers.',
      correctSentenceIndex: 1
    },
    stage3b: {
      question: 'Highlight the sentence noting additional factors needed for small loans to succeed.',
      correctSentenceIndex: 6
    },
    stage4: {
      question: 'What is the main idea of this passage?',
      options: [
        'Tailored small loans help rural entrepreneurs grow businesses when combined with training and market access.',
        'Traditional banks charge lower interest rates when borrowers lack land ownership documents.',
        'Microfinance cooperatives operate exclusively inside large coastal financial capitals.',
        'Weekly loan installments prevent farmers from buying seeds before spring planting.'
      ],
      correct: 'Tailored small loans help rural entrepreneurs grow businesses when combined with training and market access.'
    },
    stage5: {
      options: [
        'Empowering Rural Entrepreneurs Through Microfinance',
        'A Beginner’s Guide to Stock Market Trading',
        'Why Sewing Machines Cost More in Cities',
        'Building Paved Highways Across Mountains'
      ],
      correct: 'Empowering Rural Entrepreneurs Through Microfinance'
    }
  },
  {
    id: 'ir6',
    difficulty: 5,
    title: 'Bioluminescent Signaling in the Ocean',
    stage1: {
      paragraphParts: [
        'Beneath two hundred meters of ocean surface, sunlight fades into perpetual twilight, yet the water column glows with living light. Thousands of marine species generate bioluminescence through a chemical reaction between a pigment called luciferin and a specialized ',
        '. Unlike incandescent bulbs that waste most electrical energy as heat, biological reactions emit virtually pure cold ',
        '. Deep-water fish and squid deploy glowing patterns for strikingly opposite purposes: attracting unsuspecting prey, startling predators, or recognizing potential ',
        '. Some midwater hatchetfish even adjust light organs on their bellies to match faint overhead skylight, rendering their silhouettes nearly ',
        ' from below. Studying these luminous proteins has also transformed biomedical imaging by letting scientists ',
        ' live cells under microscopes.'
      ],
      blanks: [
        { options: ['enzyme', 'glacier', 'mineral', 'compass'], correct: 'enzyme' },
        { options: ['light', 'smoke', 'dust', 'sound'], correct: 'light' },
        { options: ['mates', 'bridges', 'seasons', 'islands'], correct: 'mates' },
        { options: ['invisible', 'colorful', 'heavy', 'noisy'], correct: 'invisible' },
        { options: ['track', 'freeze', 'delete', 'ignore'], correct: 'track' }
      ]
    },
    stage2: {
      before: 'Beneath two hundred meters of ocean surface, sunlight fades into perpetual twilight, yet the water column glows with living light. Thousands of marine species generate bioluminescence through a chemical reaction between a pigment called luciferin and a specialized enzyme. Unlike incandescent bulbs that waste most electrical energy as heat, biological reactions emit virtually pure cold light. Deep-water fish and squid deploy glowing patterns for strikingly opposite purposes: attracting unsuspecting prey, startling predators, or recognizing potential mates. Some midwater hatchetfish even adjust light organs on their bellies to match faint overhead skylight, rendering their silhouettes nearly invisible from below.',
      after: 'Studying these luminous proteins has also transformed biomedical imaging by letting scientists track live cells under microscopes.',
      options: [
        'This clever camouflage strategy, called counter-illumination, shields vulnerable swimmers from upward-gazing hunters.',
        'Solar panels installed on fishing boats harvest deep-sea bioluminescence for coastal cities.',
        'Tropical birds frequently mimic squid light displays during autumn courtship dances.',
        'Household flashlights rely on living marine enzymes instead of lithium batteries.'
      ],
      correct: 'This clever camouflage strategy, called counter-illumination, shields vulnerable swimmers from upward-gazing hunters.'
    },
    fullSentences: [
      'Beneath two hundred meters of ocean surface, sunlight fades into perpetual twilight, yet the water column glows with living light.',
      'Thousands of marine species generate bioluminescence through a chemical reaction between a pigment called luciferin and a specialized enzyme.',
      'Unlike incandescent bulbs that waste most electrical energy as heat, biological reactions emit virtually pure cold light.',
      'Deep-water fish and squid deploy glowing patterns for strikingly opposite purposes: attracting unsuspecting prey, startling predators, or recognizing potential mates.',
      'Some midwater hatchetfish even adjust light organs on their bellies to match faint overhead skylight, rendering their silhouettes nearly invisible from below.',
      'This clever camouflage strategy, called counter-illumination, shields vulnerable swimmers from upward-gazing hunters.',
      'Studying these luminous proteins has also transformed biomedical imaging by letting scientists track live cells under microscopes.'
    ],
    stage3a: {
      question: 'Highlight the sentence comparing the efficiency of bioluminescence to artificial light bulbs.',
      correctSentenceIndex: 2
    },
    stage3b: {
      question: 'Highlight the sentence explaining how bioluminescence research helps medical science.',
      correctSentenceIndex: 6
    },
    stage4: {
      question: 'What is the main idea of this passage?',
      options: [
        'Marine organisms produce efficient chemical light for survival and camouflage, inspiring advances in medical research.',
        'Hatchetfish prefer swimming near sunny coral reefs during daytime hours.',
        'Incandescent bulbs illuminate deep ocean trenches more effectively than luciferin.',
        'Biomedical laboratories no longer rely on microscopes to inspect cells.'
      ],
      correct: 'Marine organisms produce efficient chemical light for survival and camouflage, inspiring advances in medical research.'
    },
    stage5: {
      options: [
        'Living Light in the Deep Ocean',
        'How Commercial Trawlers Navigate Fog',
        'The Invention of Household Light Bulbs',
        'Why Coral Reefs Lose Color in Summer'
      ],
      correct: 'Living Light in the Deep Ocean'
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
  },
  {
    id: 'il3',
    difficulty: 3,
    scenario: 'You are speaking with a university librarian, Mr. Alvarez, to request access to rare historical newspapers for your term paper.',
    peerName: 'Mr. Alvarez (Librarian)',
    turns: [
      {
        audioText: 'Hello! Welcome to the special collections desk. How can I assist you with your research today?',
        options: [
          'Hi! I am writing a history paper on 1920s city transit and hoped to view the local newspaper archive.',
          'Can you help me order a pepperoni pizza for tonight?',
          'I want to return three broken basketballs to the gym.',
          'Actually, I am looking for the chemistry lab safety goggles.'
        ],
        correct: 'Hi! I am writing a history paper on 1920s city transit and hoped to view the local newspaper archive.'
      },
      {
        audioText: 'We do hold that archive on microfilm and in original bound volumes. Do you have specific dates in mind?',
        options: [
          'Yes, mainly issues from spring 1924 when the first streetcar line opened downtown.',
          'I prefer reading science fiction novels published next century.',
          'Spring weather is usually warmer than winter snow.',
          'No, I have no topic and no class this semester.'
        ],
        correct: 'Yes, mainly issues from spring 1924 when the first streetcar line opened downtown.'
      },
      {
        audioText: 'Great, the 1924 microfilm reels are ready immediately, and you can export high-resolution PDF scans right from the reader.',
        options: [
          'That is super convenient! Do I need to bring my own USB drive to save the scanned pages?',
          'So I should tear the original pages out of the book and take them home?',
          'Wait, can the microfilm machine brew espresso?',
          'I never use computers when writing papers.'
        ],
        correct: 'That is super convenient! Do I need to bring my own USB drive to save the scanned pages?'
      },
      {
        audioText: 'Yes, bring a USB drive or you can email the PDF files directly to your university account before our reading room closes at six.',
        options: [
          'Perfect, I will use the scanner now and email the articles to myself before six. Thanks so much!',
          'I will come back next year after I graduate.',
          'Please throw away the 1924 archive tomorrow.',
          'Thanks, I am going straight to the swimming pool instead.'
        ],
        correct: 'Perfect, I will use the scanner now and email the articles to myself before six. Thanks so much!'
      }
    ],
    summaryPrompt: 'Summarize your conversation with Mr. Alvarez, including what archive materials you needed and how you will save them.'
  },
  {
    id: 'il4',
    difficulty: 4,
    scenario: 'You are visiting the Study Abroad office to speak with an advisor, Claire, about a summer exchange fellowship.',
    peerName: 'Claire (Advisor)',
    turns: [
      {
        audioText: 'Hi there! Have a seat. Are you calling about the summer sustainability fellowship in Copenhagen?',
        options: [
          'Yes! I am an environmental science junior and wanted to confirm the eligibility rules before applying.',
          'No, I came to repair the building’s elevator.',
          'Copenhagen is famous for being a desert island.',
          'I forgot what major I enrolled in yesterday.'
        ],
        correct: 'Yes! I am an environmental science junior and wanted to confirm the eligibility rules before applying.'
      },
      {
        audioText: 'Wonderful! Applicants need at least a 3.3 GPA, two faculty recommendations, and one completed urban ecology course.',
        options: [
          'I meet the GPA requirement and finished urban ecology last fall, though one professor asked if she can submit her letter next Tuesday.',
          'Wait, does GPA stand for Grand Piano Association?',
          'I failed every science class on purpose.',
          'Can my pet cat write the faculty recommendation?'
        ],
        correct: 'I meet the GPA requirement and finished urban ecology last fall, though one professor asked if she can submit her letter next Tuesday.'
      },
      {
        audioText: 'That is completely fine — your personal essays are due Friday, while recommendation letters have a five-day grace period until next Wednesday.',
        options: [
          'What a relief! Should I also submit an official transcript, or can your office pull my records internally?',
          'Great, so I will wait until September to submit my essay.',
          'Let us cancel my application right now.',
          'Do I need to mail cash inside an envelope?'
        ],
        correct: 'What a relief! Should I also submit an official transcript, or can your office pull my records internally?'
      },
      {
        audioText: 'An unofficial PDF from the student portal is enough for the first review round; we only request official transcripts if you are nominated.',
        options: [
          'Got it, Claire. I will upload my essay and portal transcript by Friday and remind my professor before Tuesday.',
          'Okay, I will delete my student portal account tonight.',
          'I prefer applying without submitting any documents.',
          'Thank you for the free train ticket to Antarctica.'
        ],
        correct: 'Got it, Claire. I will upload my essay and portal transcript by Friday and remind my professor before Tuesday.'
      }
    ],
    summaryPrompt: 'Summarize your advising session with Claire, detailing the fellowship requirements, letter deadline, and transcript rules.'
  },
  {
    id: 'il5',
    difficulty: 3,
    scenario: 'You are the treasurer of the campus Robotics Club meeting the student activities coordinator, Jordan, to approve competition travel funding.',
    peerName: 'Jordan (Coordinator)',
    turns: [
      {
        audioText: 'Hey! Thanks for sending over the Robotics Club budget sheet. Walk me through what this funding covers.',
        options: [
          'Sure! Most of it covers regional train tickets for six team members and registration fees for the spring robotics contest.',
          'We want to buy fifty bicycles for a marathon.',
          'Actually, our club only meets to watch cooking shows.',
          'I lost the budget sheet at the grocery store.'
        ],
        correct: 'Sure! Most of it covers regional train tickets for six team members and registration fees for the spring robotics contest.'
      },
      {
        audioText: 'The travel and registration lines look reasonable, though our office cannot reimburse hotel meals unless receipts are itemized.',
        options: [
          'Understood — we will keep every itemized meal receipt and stay within the forty-dollar daily student allowance.',
          'Wait, so we should throw away all our receipts immediately?',
          'Robots usually eat three pizzas per day.',
          'We plan to stay in a five-star palace for three weeks.'
        ],
        correct: 'Understood — we will keep every itemized meal receipt and stay within the forty-dollar daily student allowance.'
      },
      {
        audioText: 'Perfect. One last thing: the student senate wants clubs receiving grants to host one open campus workshop afterward.',
        options: [
          'We would love to! In April we can run a beginner Arduino building workshop open to all students.',
          'No, our club refuses to let any other students enter our building.',
          'April is when winter snowstorms begin in July.',
          'Can we host the workshop in another country without telling anyone?'
        ],
        correct: 'We would love to! In April we can run a beginner Arduino building workshop open to all students.'
      },
      {
        audioText: 'An April Arduino workshop checks every box. Once you upload the workshop flyer draft, I will sign off on the transfer today.',
        options: [
          'Awesome, Jordan! I will email you the flyer draft this afternoon so we can book the train tickets.',
          'Wait, what is a robotics club again?',
          'I will wait until next semester to read your email.',
          'Please send the funding to my personal vacation account.'
        ],
        correct: 'Awesome, Jordan! I will email you the flyer draft this afternoon so we can book the train tickets.'
      }
    ],
    summaryPrompt: 'Summarize your budget meeting with Jordan, mentioning what expenses are covered and what your club agreed to do in return.'
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
  },
  {
    id: 'iw5',
    difficulty: 2,
    part1Prompt: 'Many schools have replaced printed textbooks with laptops or tablets. Do the advantages of digital devices outweigh the distractions they can cause in class?',
    part2Prompt: 'What rules should teachers set so laptops support active discussion rather than distracting students?'
  },
  {
    id: 'iw6',
    difficulty: 3,
    part1Prompt: 'Some governments require all university graduates to complete one year of community or environmental service. Would mandatory service benefit young adults and society?',
    part2Prompt: 'What financial or career challenges might graduates face during a year of service, and how could programs support them?'
  },
  {
    id: 'iw7',
    difficulty: 3,
    part1Prompt: 'Remote work has allowed millions of employees to move out of expensive major cities into smaller towns. How does this trend affect local small-town communities?',
    part2Prompt: 'What infrastructure improvements do smaller towns need to welcome remote workers sustainably?'
  },
  {
    id: 'iw8',
    difficulty: 4,
    part1Prompt: 'In many countries, museum admission is free for everyone, whereas others charge entrance fees to fund maintenance. Which approach is better for cultural preservation?',
    part2Prompt: 'If a museum decides to remain completely free, how else can it raise steady funds for new exhibitions?'
  },
  {
    id: 'iw9',
    difficulty: 4,
    part1Prompt: 'Fast fashion makes trendy clothing inexpensive, yet generates enormous textile waste worldwide. Should governments tax disposable clothing brands or focus on consumer education?',
    part2Prompt: 'What everyday habits can college students adopt to reduce clothing waste without spending much money?'
  },
  {
    id: 'iw10',
    difficulty: 5,
    part1Prompt: 'Space exploration agencies spend billions studying distant planets while urgent climate and poverty issues remain on Earth. Should space budgets be scaled back or maintained?',
    part2Prompt: 'Give an example of how space research technologies have directly solved practical problems back on Earth.'
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
  },
  {
    id: 'rts5',
    difficulty: 2,
    prompt: 'Describe a favorite public place in your city, such as a park, market, or library.',
    bullets: [
      'Where this place is located and what it looks like',
      'What activities people usually do there',
      'Why you enjoy spending time in that environment'
    ]
  },
  {
    id: 'rts6',
    difficulty: 3,
    prompt: 'Talk about a teacher, coach, or mentor who positively influenced your learning.',
    bullets: [
      'How you met this person and what they taught',
      'Specific advice or habits they helped you build',
      'How their influence still shapes your goals today'
    ]
  },
  {
    id: 'rts7',
    difficulty: 3,
    prompt: 'Discuss whether young people today spend too much time chasing online trends.',
    bullets: [
      'Why social media trends spread so rapidly among youth',
      'Positive or creative sides of online communities',
      'How to maintain healthy boundaries with screens'
    ]
  },
  {
    id: 'rts8',
    difficulty: 4,
    prompt: 'Evaluate the pros and cons of studying abroad for a university degree.',
    bullets: [
      'Academic and career advantages of international study',
      'Emotional or financial difficulties students may face',
      'How a student can prepare well before leaving home'
    ]
  },
  {
    id: 'rts9',
    difficulty: 4,
    prompt: 'Discuss how artificial intelligence might transform one specific profession over the next decade.',
    bullets: [
      'Which daily tasks in that field will become automated',
      'Which human skills will become even more valuable',
      'How students entering that field should prepare today'
    ]
  },
  {
    id: 'rts10',
    difficulty: 5,
    prompt: 'Should historic city centers ban private cars altogether to create pedestrian-only zones?',
    bullets: [
      'Effects on local shops, air quality, and tourism',
      'Challenges for elderly residents or delivery trucks',
      'Practical compromises city planners could adopt'
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
  },
  {
    id: 'ws4',
    difficulty: 2,
    prompt: 'Some people prefer following a strict daily schedule, while others thrive with spontaneous flexibility. Which approach works better for achieving long-term goals, and why?'
  },
  {
    id: 'ws5',
    difficulty: 3,
    prompt: 'Modern schools often emphasize standardized test scores in math and science over arts and physical education. Do you agree with this priority? Support your view with specific reasons.'
  },
  {
    id: 'ws6',
    difficulty: 4,
    prompt: 'As global tourism grows, many famous natural parks and historic towns suffer from overcrowding. How should local authorities balance economic benefits from visitors with environmental preservation?'
  },
  {
    id: 'ws7',
    difficulty: 4,
    prompt: 'Do celebrity endorsements and social media influencers genuinely help consumers make informed choices, or do they encourage unnecessary spending? Explain your position.'
  },
  {
    id: 'ws8',
    difficulty: 5,
    prompt: 'Rapid technological change has made lifelong learning essential for workers of every age. How should universities and employers redesign education to support adults returning to study mid-career?'
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
  },
  {
    id: 'ss4',
    difficulty: 2,
    prompt: 'Describe an invention from the past one hundred years that you think improved everyday life the most. Explain how daily routines looked before and after it existed.'
  },
  {
    id: 'ss5',
    difficulty: 3,
    prompt: 'Many people say you learn more from traveling to an unfamiliar place than from reading about it in books. Do you agree or disagree? Give examples from your own perspective.'
  },
  {
    id: 'ss6',
    difficulty: 4,
    prompt: 'Do you think competition motivates students and teams to perform at their best, or does it create unhealthy stress that harms cooperation? Explain your reasoning.'
  },
  {
    id: 'ss7',
    difficulty: 4,
    prompt: 'Imagine your city received a major grant to improve quality of life within five years. Would you invest it in public parks, clean transportation, or vocational training centers, and why?'
  },
  {
    id: 'ss8',
    difficulty: 5,
    prompt: 'In an era of short videos and instant headlines, how can individuals cultivate the patience required for deep reading, reflection, and long-term projects?'
  }
];

const INTERACTIVE_SPEAKING_BANK = [
  {
    id: 'is1',
    difficulty: 2,
    interviewerName: 'Maya',
    topicTitle: 'Study Habits & Digital Learning',
    scenario: 'A 6-question live conversation shifting from your daily study environment to technology in education.',
    turns: [
      { audioText: 'Hi! To start, where do you usually prefer to study or get focused work done, and why does that place suit you?' },
      { audioText: 'What small routine or habit helps you stay concentrated when you have an important deadline approaching?' },
      { audioText: 'Do you find it easier to study alone or with a small group of classmates? Tell me about a recent example.' },
      { audioText: 'Let’s switch slightly to technology. Which digital app or online tool has helped your learning the most this year?' },
      { audioText: 'On the other hand, what kind of distractions do phones or laptops create during study sessions, and how do you handle them?' },
      { audioText: 'Looking ahead, do you think online courses will ever completely replace traditional classrooms, or will students always need in-person classes?' }
    ]
  },
  {
    id: 'is2',
    difficulty: 3,
    interviewerName: 'Liam',
    topicTitle: 'Neighborhood Spaces & Urban Transport',
    scenario: 'A 6-question conversation starting with places in your city and moving into sustainable urban transportation.',
    turns: [
      { audioText: 'Hello! Can you describe a favorite park, café, or public space near where you live and what makes it welcoming?' },
      { audioText: 'How has your neighborhood or city changed over the past few years in terms of buildings, shops, or green spaces?' },
      { audioText: 'If a friend visited your city for just one afternoon, which local spot would you take them to first and why?' },
      { audioText: 'Now let’s talk about getting around. How do people in your area mostly travel to school or work each day?' },
      { audioText: 'What is one major challenge with traffic or public transportation in big cities, and how does it affect daily life?' },
      { audioText: 'If city leaders could invest in either expanding subway lines or building safer cycling lanes, which should they prioritize first?' }
    ]
  },
  {
    id: 'is3',
    difficulty: 3,
    interviewerName: 'Sophia',
    topicTitle: 'Personal Skills & Work-Life Balance',
    scenario: 'A 6-question interview exploring hobbies you enjoy and how people maintain balance during busy schedules.',
    turns: [
      { audioText: 'Hi there! What is a hobby or practical skill you enjoy practicing in your free time, and how did you get started?' },
      { audioText: 'What was the hardest part about improving at that activity when you were still a beginner?' },
      { audioText: 'Would you recommend this hobby to someone with a very busy schedule? Why or why not?' },
      { audioText: 'Speaking of busy schedules, how do you personally unwind and recharge after a demanding week of classes or work?' },
      { audioText: 'Why do you think so many students and young professionals struggle to set healthy boundaries around rest today?' },
      { audioText: 'Do you think schools and employers should actively encourage shorter workdays or longer breaks to boost creativity?' }
    ]
  },
  {
    id: 'is4',
    difficulty: 4,
    interviewerName: 'Daniel',
    topicTitle: 'Reading Habits & Artificial Intelligence',
    scenario: 'A 6-question conversation moving from how you stay informed to the impact of artificial intelligence on everyday work.',
    turns: [
      { audioText: 'Good to meet you! How do you usually stay up to date with current events or topics that interest you?' },
      { audioText: 'When you read an article or watch a short video online, how do you decide whether the information is reliable?' },
      { audioText: 'Can you share a book, podcast, or documentary that genuinely changed how you think about a topic?' },
      { audioText: 'Let’s shift to a related trend: artificial intelligence. In what ways have you seen AI tools change how people write or research?' },
      { audioText: 'What risks do you worry about if students rely too heavily on automated tools instead of practicing skills themselves?' },
      { audioText: 'Which human abilities do you think will become even more valuable as AI continues to advance over the next decade?' }
    ]
  },
  {
    id: 'is5',
    difficulty: 4,
    interviewerName: 'Priya',
    topicTitle: 'Cultural Exchange & Global Careers',
    scenario: 'A 6-question interview moving from travel and language learning to working in international teams.',
    turns: [
      { audioText: 'Welcome! Tell me about a place—either in your own country or abroad—that you would love to visit and what draws you there.' },
      { audioText: 'What is one cultural tradition or food from your home region that visitors are always surprised or delighted by?' },
      { audioText: 'How has learning English opened up new perspectives, media, or friendships for you personally?' },
      { audioText: 'Now thinking about future careers, what are the biggest advantages of studying or working in an international environment?' },
      { audioText: 'What misunderstandings or challenges can happen when teammates come from very different cultural backgrounds?' },
      { audioText: 'What advice would you give to someone preparing to move abroad for university or their first job?' }
    ]
  },
  {
    id: 'is6',
    difficulty: 5,
    interviewerName: 'Marcus',
    topicTitle: 'Community Action & Future Cities',
    scenario: 'A 6-question advanced conversation progressing from local community initiatives to long-term public policy choices.',
    turns: [
      { audioText: 'Hello! Can you tell me about a community event, volunteer project, or group effort you have participated in or admired?' },
      { audioText: 'What motivates everyday citizens to give their free time to help neighbors or protect local spaces?' },
      { audioText: 'Do you think young people today are more socially engaged than previous generations, or simply engaged in different ways?' },
      { audioText: 'Looking at a broader scale, what environmental challenge in your country requires the most urgent attention right now?' },
      { audioText: 'When environmental regulations make everyday products slightly more expensive, how can governments keep policies fair for families?' },
      { audioText: 'Imagine your city fifty years from now: what single change in housing, energy, or education would make the biggest difference?' }
    ]
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
    case 'interactive_speaking': return INTERACTIVE_SPEAKING_BANK.map((q) => ({ ...q, type }));
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

export function getBankCapacity(type) {
  if (type === 'fill_blanks') return getDynamicFillCount();
  if (type === 'read_complete') return getDynamicCTestCount();
  return getBankForType(type).length;
}

export function pickQuestionFromBank(type, difficulty = 3, usedIds = new Set(), options = {}) {
  const seenIds = options.seenIds instanceof Set ? options.seenIds : new Set();

  if (type === 'fill_blanks') {
    return generateDynamicFillBlanks({ difficulty, seenIds, usedIds });
  }
  if (type === 'read_complete') {
    return generateDynamicReadComplete({ difficulty, seenIds, usedIds });
  }

  const all = getBankForType(type);
  if (!all.length) return null;

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
