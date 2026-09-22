import type { AnyCardDef } from '../types';

export const BLUE_SOURCE_DEFS: AnyCardDef[] = [
  {
    name: '海のみなもと',
    side: 'blue',
    type: 'source',
    sourceKind: 'sea',
    image: 'cards/uminominamoto.jpg',
    pack: '室蘭パッケージ海',
    description: '海の生き物の召喚・維持に必要なエネルギー。',
  },
  {
    name: '室蘭版の人のみなもと',
    side: 'blue',
    type: 'source',
    sourceKind: 'human',
    image: '/cards/hitonominammotomuroran.jpg',
    pack: '室蘭パッケージ海',
    description: '人の活動によるサポートカード発動に必要なエネルギー。',
  },
];

export const RED_SOURCE_DEFS: AnyCardDef[] = [
  {
    name: '二酸化炭素',
    side: 'red',
    type: 'source',
    sourceKind: 'co2',
    image: '/cards/nisannkatannso.jpg',
    pack: '室蘭パッケージ海',
    description: '地球温暖化現象を進行させる温室効果ガス。',
  },
  {
    name: '室蘭版の人のみなもと',
    side: 'red',
    type: 'source',
    sourceKind: 'human',
    image: '/cards/hitonominammotomuroran.jpg',
    pack: '室蘭パッケージ海',
    description: '環境破壊や開発を推進する人為的要因のコスト。',
  },
];