// カード種別と属性の定義
export type CardType = 'battle' | 'support' | 'source';
export type Side = 'blue' | 'red';
export type SourceKind = 'sea' | 'human' | 'co2';

export interface BaseCard {
  id: string;
  name: string;
  side: Side;
  type: CardType;
  image: string;
}

// みなもとカード
export interface SourceCard extends BaseCard {
  type: 'source';
  sourceKind: SourceKind;
}

// 対戦カード（生き物・地球温暖化）
export interface BattleCard extends BaseCard {
  type: 'battle';
  power: number; // 左上の数値
  requiredSources: { kind: SourceKind; count: number }[]; // 召喚コスト
  chainableCardIds: string[]; // 連鎖対象となるカードID一覧
  tier: number; // 階層 (下位: 1, 中位: 2, 上位: 3)
}

// サポートカード（人の活動など）
export interface SupportCard extends BaseCard {
  type: 'support';
  requiredHumanSources: number; // 必要な「人」の数
  buffValue: number; // 数値の増減
}

// 【重要】すべてのカード型をまとめた定義
export type AnyCard = SourceCard | BattleCard | SupportCard;

// 連鎖によって重なった1つの「グループ」
export interface CardGroup {
  groupId: string;
  cards: BattleCard[]; // 階層順（tier順）に並ぶ
  attachedSources: SourceCard[]; // 下に敷かれたみなもとカード
}

// 室蘭版 初期デッキサンプル
export const MURORAN_BLUE_DECK: AnyCard[] = [
  // みなもとカード
  { id: 'src_sea_1', name: '海のみなもと', side: 'blue', type: 'source', sourceKind: 'sea', image: '/cards/card1.png' },
  { id: 'src_sea_2', name: '海のみなもと', side: 'blue', type: 'source', sourceKind: 'sea', image: '/cards/card1.png' },
  { id: 'src_sea_3', name: '海のみなもと', side: 'blue', type: 'source', sourceKind: 'sea', image: '/cards/card1.png' },
  { id: 'src_hum_1', name: '人のみなもと', side: 'blue', type: 'source', sourceKind: 'human', image: '/cards/card1.png' },
  // 対戦カード（生き物）
  {
    id: 'bio_krill',
    name: 'オキアミ（下位）',
    side: 'blue',
    type: 'battle',
    power: 2,
    tier: 1,
    requiredSources: [{ kind: 'sea', count: 1 }],
    chainableCardIds: ['bio_sardine'],
    image: '/cards/card1.png',
  },
  {
    id: 'bio_sardine',
    name: 'イワシ等の小魚（中位）',
    side: 'blue',
    type: 'battle',
    power: 4,
    tier: 2,
    requiredSources: [{ kind: 'sea', count: 2 }],
    chainableCardIds: ['bio_krill', 'bio_fish'],
    image: '/cards/card2.png',
  },
  {
    id: 'bio_fish',
    name: '大型魚（上位捕食者）',
    side: 'blue',
    type: 'battle',
    power: 7,
    tier: 3,
    requiredSources: [{ kind: 'sea', count: 3 }],
    chainableCardIds: ['bio_sardine'],
    image: '/cards/card3.png',
  },
];