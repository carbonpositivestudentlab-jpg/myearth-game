// カード種別と属性
export type CardType = 'battle' | 'support' | 'source';
export type Side = 'blue' | 'red';
export type SourceKind = 'sea' | 'human' | 'co2';

// カードマスター定義（新規カード追加時の基本情報。id は不要）
export interface CardDefinition {
  name: string;
  side: Side;
  type: CardType;
  image: string;
  description?: string;
  pack?: string;
}

// みなもとカード定義
export interface SourceCardDef extends CardDefinition {
  type: 'source';
  sourceKind: SourceKind;
}
export interface SourceCard extends SourceCardDef {
  id: string;
}

// 対戦カード定義（属性タグ category と 召喚時効果 onPlay を含む）
export interface BattleCardDef extends CardDefinition {
  type: 'battle';
  power: number;
  requiredCost: number;
  chainableCardNames: string[];
  tier: number;
  category?: string; // 例: '海の生き物', '地球温暖化'
  onPlay?: (context: EffectContext, myGroup: CardGroup) => void;
}
export interface BattleCard extends BattleCardDef {
  id: string;
}

// サポートカード定義
export interface SupportCardDef extends CardDefinition {
  type: 'support';
  timing: 'main' | 'battle';
  target: 'none' | 'my_group' | 'opp_group';
  requiredHumanSources: number;
  execute: (context: EffectContext, targetGroup?: CardGroup) => void;
}
export interface SupportCard extends SupportCardDef {
  id: string;
}

// 永続サポートと占有された人のみなもと
export interface AttachedSupport {
  card: SupportCard;
  attachedHumanSources: SourceCard[];
}

// 連鎖グループ
export interface CardGroup {
  groupId: string;
  cards: BattleCard[];
  attachedSources: SourceCard[];
  attachedSupports: AttachedSupport[];
  buffPower: number;
  debuffPower: number;
}

// カード選択モーダル設定
export interface CardSelectorConfig {
  title: string;
  candidates: AnyCard[];
  maxCount: number;
  onConfirm: (selectedCards: AnyCard[]) => void;
}

// ターゲットグループ選択設定
export interface TargetGroupSelectorConfig {
  title: string;
  targetSide: Side;
  onSelect: (group: CardGroup) => void;
}

// カード効果がアクセスできる盤面のコンテキスト
export interface EffectContext {
  mySide: Side;
  myDeck: AnyCard[];
  myHand: AnyCard[];
  mySources: SourceCard[];
  myGroups: CardGroup[];
  myGraveyard: AnyCard[];
  oppDeck: AnyCard[];
  oppHand: AnyCard[];
  oppSources: SourceCard[];
  oppGroups: CardGroup[];
  oppGraveyard: AnyCard[];
  log: (msg: string) => void;
  openCardSelector?: (config: CardSelectorConfig) => void;
  openGroupSelector?: (config: TargetGroupSelectorConfig) => void;
  discardGroup?: (group: CardGroup, ownerSide: Side) => void;
}

// バトルログの型定義
export type LogCategory = 'system' | 'draw' | 'summon' | 'chain' | 'support' | 'battle' | 'damage';

export interface BattleLogEntry {
  id: string;
  turnNumber: number;
  side?: Side;
  category: LogCategory;
  message: string;
  timestamp: Date;
}

export type AnyCardDef = SourceCardDef | BattleCardDef | SupportCardDef;
export type AnyCard = SourceCard | BattleCard | SupportCard;