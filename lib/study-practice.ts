import { HACKERS_750_CARDS } from '@/lib/hackers-vocab-750';

export interface PracticeCard {
  id: string;
  word: string;
  phonetic?: string;
  definition: string;
  day: number;
  number: number;
}

export type TestDirection = 'word-to-meaning' | 'meaning-to-word';

export interface TestQuestion {
  id: string;
  prompt: string;
  answer: string;
  direction: TestDirection;
  options: string[];
  card: PracticeCard;
}

const DAY_PATTERN = /^Day (\d+) #(\d+)$/;

export function getPracticeCards(studyDay?: number): PracticeCard[] {
  return HACKERS_750_CARDS.map((card, index) => {
    const match = card.backExample?.match(DAY_PATTERN);
    const day = match ? Number(match[1]) : Math.floor(index / 50) + 1;
    const number = match ? Number(match[2]) : (index % 50) + 1;

    return {
      id: card.id ?? `hackers-750-${index + 1}`,
      word: card.frontWord,
      phonetic: card.frontPhonetic,
      definition: card.backDefinition,
      day,
      number,
    };
  }).filter((card) => !studyDay || card.day === studyDay);
}

export function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function buildOptions(
  cards: PracticeCard[],
  answer: string,
  field: 'word' | 'definition',
  optionCount = 4
): string[] {
  const distractors = shuffleItems(
    cards
      .map((card) => card[field])
      .filter((value) => value !== answer)
  );

  return shuffleItems([answer, ...distractors.slice(0, optionCount - 1)]);
}

export function buildTestQuestions(
  cards: PracticeCard[],
  count = 20
): TestQuestion[] {
  return shuffleItems(cards)
    .slice(0, Math.min(count, cards.length))
    .map((card, index) => {
      const direction: TestDirection = index % 2 === 0 ? 'word-to-meaning' : 'meaning-to-word';
      const answer = direction === 'word-to-meaning' ? card.definition : card.word;

      return {
        id: `${card.id}-${direction}`,
        prompt: direction === 'word-to-meaning' ? card.word : card.definition,
        answer,
        direction,
        options: buildOptions(cards, answer, direction === 'word-to-meaning' ? 'definition' : 'word'),
        card,
      };
    });
}

export function getCardAudioId(card: PracticeCard): string {
  return card.id;
}
