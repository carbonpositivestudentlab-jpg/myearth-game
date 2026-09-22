import type { AnyCard } from './types';
import { createCardByName } from './cardPool';

export const createMuroranBlueDeck = (): AnyCard[] => {
  // 初期デッキ構成（カード名と投入枚数）
  const deckConfig: { name: string; count: number }[] = [
    // リソース（みなもと）
    { name: '海のみなもと', count: 6 },
    { name: '室蘭版の人のみなもと', count: 4 },
    // 生態系カード（下位・中位・上位）
    { name: 'オキアミのなかま', count: 2 },
    { name: 'ニシン', count: 2 },
    { name: 'スケトウダラ', count: 1 },
    { name: 'ホッケ', count: 1 },
    { name: 'ミズダコ', count: 1 },
    { name: 'キタオットセイ', count: 1 },
    // サポートカード
    { name: 'ムロぴょんと未来を拓こう！', count: 1 },
    { name: 'CarbonPositive学生Labと地球を守る', count: 1 },
  ];

  const deck: AnyCard[] = [];

  for (const item of deckConfig) {
    for (let i = 0; i < item.count; i++) {
      const card = createCardByName(item.name, 'blue');
      if (card) {
        deck.push(card);
      } else {
        console.error(`カード「${item.name}」が青い地球のカードプールに見つかりません。`);
      }
    }
  }

  // シャッフルして返却
  return deck.sort(() => Math.random() - 0.5);
};