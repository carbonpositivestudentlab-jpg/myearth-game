import type { AnyCardDef, AnyCard, Side } from './types';
import { BLUE_SOURCE_DEFS, RED_SOURCE_DEFS } from './data/sources';
import { BLUE_CREATURE_DEFS } from './data/blueCreatures';
import { BLUE_SUPPORT_DEFS } from './data/blueSupports';
import { RED_WARMING_DEFS } from './data/redWarmings';
import { RED_SUPPORT_DEFS } from './data/redSupports';

// マスターカードプール（青い地球）
export const BLUE_CARD_POOL_DEFS: AnyCardDef[] = [
  ...BLUE_SOURCE_DEFS,
  ...BLUE_CREATURE_DEFS,
  ...BLUE_SUPPORT_DEFS,
];

// マスターカードプール（赤い地球）
export const RED_CARD_POOL_DEFS: AnyCardDef[] = [
  ...RED_SOURCE_DEFS,
  ...RED_WARMING_DEFS,
  ...RED_SUPPORT_DEFS,
];

let cardInstanceSequence = 0;

export const instantiateCard = (cardDef: AnyCardDef): AnyCard => {
  cardInstanceSequence += 1;
  return {
    ...cardDef,
    id: `${cardDef.name}_${Date.now()}_${cardInstanceSequence}`,
  } as AnyCard;
};

export const BLUE_CARD_POOL: AnyCard[] = BLUE_CARD_POOL_DEFS.map((def) => instantiateCard(def));
export const RED_CARD_POOL: AnyCard[] = RED_CARD_POOL_DEFS.map((def) => instantiateCard(def));

export const createCardByName = (name: string, side: Side): AnyCard | null => {
  const poolDefs = side === 'blue' ? BLUE_CARD_POOL_DEFS : RED_CARD_POOL_DEFS;
  const def = poolDefs.find((c) => c.name === name);
  if (!def) return null;
  return instantiateCard(def);
};

export const exportDeckCode = (deck: AnyCard[]): string => {
  const cardNames = deck.map((c) => c.name);
  return btoa(encodeURIComponent(JSON.stringify(cardNames)));
};

export const importDeckCode = (code: string, side: Side): AnyCard[] | null => {
  try {
    const cleanCode = code.trim();
    if (!cleanCode) return null;

    const decodedJson = decodeURIComponent(atob(cleanCode));
    const cardNames: string[] = JSON.parse(decodedJson);

    if (!Array.isArray(cardNames) || cardNames.length !== 20) {
      return null;
    }

    const reconstructed: AnyCard[] = [];
    for (const name of cardNames) {
      const card = createCardByName(name, side);
      if (!card) return null;
      reconstructed.push(card);
    }

    return reconstructed;
  } catch (err) {
    console.error('デッキ復元エラー:', err);
    return null;
  }
};