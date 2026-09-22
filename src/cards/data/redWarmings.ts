import type { AnyCardDef, CardGroup } from '../types';

export const RED_WARMING_DEFS: AnyCardDef[] = [
  {
    name: '温暖化する地球 Lv.1',
    side: 'red',
    type: 'battle',
    power: 3,
    tier: 1,
    requiredCost: 1,
    category: '地球温暖化',
    chainableCardNames: ['メタンガスの放出'],
    image: '/cards/tikyuuonndankaLv1.jpg',
    pack: '室蘭パッケージ海',
    description: '産業革命以来、人類は化石燃料を燃やしてエネルギーを取り出すことで経済を成長させてきた。その代償として大気中のCO2濃度は産業革命前より40%も増加した。',
  },
  {
    name: '温暖化する地球 Lv.5',
    side: 'red',
    type: 'battle',
    power: 7,
    tier: 5,
    requiredCost: 5,
    category: '地球温暖化',
    chainableCardNames: ['メタンガスの放出'],
    image: '/cards/tikyuuonndannkaLv5.jpg',
    pack: '室蘭パッケージ海',
    description: '地球温暖化は農林水産物にも影響を与えている。主要穀物の収穫量の低下、果樹の着色不良、日焼けなどの悪影響が確認されている。',
  },
  {
    name: '磯焼け',
    side: 'red',
    type: 'battle',
    power: 1,
    tier: 1,
    requiredCost: 3,
    category: '地球温暖化',
    chainableCardNames: ['メタンガスの放出'],
    image: '/cards/isoyake.jpg',
    pack: '室蘭パッケージ海',
    description: '場に出したときに、場の【海の生き物】を1グループ選ぶ。それを捨て場に置く。',
    onPlay: (context) => {
      const targets = context.oppGroups.filter((g) =>
        g.cards.some((c) => c.category === '海の生き物')
      );
      if (targets.length === 0) {
        context.log('【磯焼け効果】相手の場に対象となる【海の生き物】グループがありませんでした。');
        return;
      }
      if (context.openGroupSelector) {
        context.openGroupSelector({
          title: '【磯焼け】捨て場に置く相手の【海の生き物】グループを選んでください',
          targetSide: 'blue',
          onSelect: (selectedGroup) => {
            if (context.discardGroup) {
              context.discardGroup(selectedGroup, 'blue');
              context.log(`【磯焼け効果】相手の「${selectedGroup.cards[0]?.name}」グループを捨て場に置きました！`);
            }
          },
        });
      }
    },
  },
  {
    name: '感染症が広がる',
    side: 'red',
    type: 'battle',
    power: 2,
    tier: 1,
    requiredCost: 2,
    category: '地球温暖化',
    chainableCardNames: ['メタンガスの放出'],
    image: '/cards/kannsennsyou.jpg',
    pack: '室蘭パッケージ海',
    description: '場に出したときに、場の【サポート】を全て捨て場に置く。（自分の【サポート】も含む）',
    onPlay: (context) => {
      let removedCount = 0;
      const cleanSupports = (groups: CardGroup[]) => {
        groups.forEach((g) => {
          g.attachedSupports.forEach((att) => {
            removedCount++;
            if (att.card.side === 'blue') {
              context.oppGraveyard.push(att.card);
              context.oppSources.push(...att.attachedHumanSources);
            } else {
              context.myGraveyard.push(att.card);
              context.mySources.push(...att.attachedHumanSources);
            }
          });
          g.attachedSupports = [];
        });
      };
      cleanSupports(context.myGroups);
      cleanSupports(context.oppGroups);
      context.log(`【感染症が広がる効果】場のサポートカード（計 ${removedCount} 枚）を全て捨て場に置きました！`);
    },
  },
  {
    name: 'メタンガスの放出',
    side: 'red',
    type: 'battle',
    power: 4,
    tier: 2,
    requiredCost: 5,
    category: '地球温暖化',
    chainableCardNames: ['【地球温暖化】', 'メタンガスの放出'],
    image: '/cards/metangas.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】と、合体できる。（コストは、1番大きいものに合わせる）',
  },
];