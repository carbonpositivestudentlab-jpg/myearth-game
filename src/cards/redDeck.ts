import type { AnyCard } from './types';
import { createCardByName } from './cardPool';

export const createMuroranRedDeck = (): AnyCard[] => {
  // 初期デッキ構成（カード名と投入枚数）
  const deckConfig: { name: string; count: number }[] = [
    // リソース（みなもと）
    { name: '二酸化炭素', count: 7 },
    { name: '室蘭版の人のみなもと', count: 4 },
    // 温暖化カード（下位・中位・上位）
    { name: '温暖化する地球 Lv.1', count: 2 },
    { name: '温暖化する地球 Lv.5', count: 2 },
    { name: '磯焼け', count: 1 },
    { name: '感染症が広がる', count: 1 },
    { name: 'メタンガスの放出', count: 1 },
    // サポートカード
    { name: '夜更かしをする', count: 1 },
    { name: '実は密漁？！', count: 1 },
  ];

  const deck: AnyCard[] = [];

  for (const item of deckConfig) {
    for (let i = 0; i < item.count; i++) {
      const card = createCardByName(item.name, 'red');
      if (card) {
        deck.push(card);
      } else {
        console.error(`カード「${item.name}」が赤い地球のカードプールに見つかりません。`);
      }
    }
  }

  // シャッフルして返却
  return deck.sort(() => Math.random() - 0.5);
};