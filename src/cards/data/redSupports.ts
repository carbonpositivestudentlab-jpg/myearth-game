import type { AnyCardDef } from '../types';

export const RED_SUPPORT_DEFS: AnyCardDef[] = [
  {
    name: '夜更かしをする',
    side: 'red',
    type: 'support',
    timing: 'battle',
    target: 'my_group',
    requiredHumanSources: 1,
    image: '/cards/yohukasiwosuru.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】を1枚選ぶ。その強さを+2する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      targetGroup.buffPower += 2;
      context.log(`【効果発動】${targetGroup.cards[0]?.name || '味方グループ'}の強さを +2 強化しました！`);
    },
  },
  {
    name: '実は密漁？！',
    side: 'red',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 2,
    image: '/cards/zituhamituryou.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【生き物】を1枚選ぶ。その強さを-4する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      targetGroup.debuffPower += 4;
      context.log(`【効果発動】${targetGroup.cards[0]?.name || '相手グループ'}の強さを -4 弱体化させました！`);
    },
  },
];