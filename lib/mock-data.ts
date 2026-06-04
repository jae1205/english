import type { Deck } from '@/components/deck';
import type { FlashcardBackProps } from '@/components/flashcard/FlashcardBack';
import type { FlashcardFrontProps } from '@/components/flashcard/FlashcardFront';

export interface MockCard {
  id: string;
  front: FlashcardFrontProps;
  back: FlashcardBackProps;
}

export const mockDecks: Deck[] = [
  {
    id: '1',
    title: 'TOEIC Advanced',
    stats: { review: 0, learning: 0, young: 0, new: 0 },
    detailedStats: { total: 1200, mature: 1200, young: 0, learning: 0 },
    progress: 100,
    learningProgress: 0,
    isCompleted: true,
  },
  {
    id: '2',
    title: 'TOEIC Essential 2000',
    stats: { review: 12, learning: 5, young: 0, new: 0 },
    detailedStats: { total: 2000, mature: 1440, young: 320, learning: 240 },
    progress: 72,
    learningProgress: 12,
  },
  {
    id: '3',
    title: 'Travel English',
    stats: { review: 0, learning: 0, young: 0, new: 50 },
    detailedStats: { total: 500, mature: 0, young: 0, learning: 0 },
    progress: 0,
    learningProgress: 0,
  },
  {
    id: '4',
    title: 'Daily Conversational',
    stats: { review: 34, learning: 18, young: 20, new: 20 },
    detailedStats: { total: 850, mature: 272, young: 170, learning: 153 },
    progress: 32,
    learningProgress: 18,
  },
  {
    id: '5',
    title: 'Advanced GRE Vocab',
    stats: { review: 0, learning: 0, young: 0, new: 50 },
    detailedStats: { total: 1500, mature: 1425, young: 45, learning: 30 },
    progress: 95,
    learningProgress: 2,
  },
];

export interface MockCardStats {
  reviews: number;
  interval: string;
  ease: number;
  type: 'new' | 'learning' | 'review';
}

export interface MockCardWithStats extends MockCard {
  stats: MockCardStats;
}

export const mockCards: MockCardWithStats[] = [
  {
    id: '1',
    front: {
      word: 'Resilient',
      phonetic: '/rɪˈzɪliənt/',
    },
    back: {
      definition: '회복력 있는, 탄력 있는',
      examples: [
        'She is a resilient person who overcomes any obstacle.',
        'The local economy is remarkably resilient.',
      ],
      synonyms: ['flexible', 'strong', 'tough', 'buoyant'],
    },
    stats: {
      reviews: 14,
      interval: '4 days',
      ease: 250,
      type: 'review',
    },
  },
  {
    id: '2',
    front: {
      word: 'Ubiquitous',
      phonetic: '/juːˈbɪkwɪtəs/',
    },
    back: {
      definition: '어디에나 있는, 편재하는',
      examples: [
        'Smartphones have become ubiquitous in modern society.',
        'Coffee shops are ubiquitous in the city center.',
      ],
      synonyms: ['omnipresent', 'everywhere', 'universal'],
    },
    stats: {
      reviews: 8,
      interval: '2 days',
      ease: 230,
      type: 'learning',
    },
  },
  {
    id: '3',
    front: {
      word: 'Ephemeral',
      phonetic: '/ɪˈfemərəl/',
    },
    back: {
      definition: '일시적인, 순간적인',
      examples: [
        'The ephemeral beauty of cherry blossoms.',
        'Fame can be ephemeral in the entertainment industry.',
      ],
      synonyms: ['fleeting', 'transient', 'momentary'],
    },
    stats: {
      reviews: 0,
      interval: '1 min',
      ease: 250,
      type: 'new',
    },
  },
  {
    id: '4',
    front: {
      word: 'Pragmatic',
      phonetic: '/præɡˈmætɪk/',
    },
    back: {
      definition: '실용적인, 현실적인',
      examples: [
        'We need a pragmatic approach to solve this problem.',
        'She is known for her pragmatic decision-making style.',
      ],
      synonyms: ['practical', 'realistic', 'sensible'],
    },
    stats: {
      reviews: 21,
      interval: '7 days',
      ease: 280,
      type: 'review',
    },
  },
  {
    id: '5',
    front: {
      word: 'Eloquent',
      phonetic: '/ˈeləkwənt/',
    },
    back: {
      definition: '웅변의, 유창한',
      examples: [
        'She gave an eloquent speech that moved the audience.',
        'His eloquent writing style captivated readers worldwide.',
      ],
      synonyms: ['articulate', 'fluent', 'expressive'],
    },
    stats: {
      reviews: 5,
      interval: '1 day',
      ease: 220,
      type: 'learning',
    },
  },
];

export const mockSessionStats = {
  studied: 25,
  correct: 20,
  timeSpent: 480,
  newLearned: 8,
};
