import type { AnyCardDef } from '../types';

export const BLUE_SUPPORT_DEFS: AnyCardDef[] = [
  {
    name: 'HAGANE MIRAI(鋼から未来を考える)',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 2,
    image: '/cards/mitubisiseikou.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】を1枚選び、その強さを-2する。自分の場に「人」が3枚以上ある場合、その強さをさらに-1する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      const myHumanCount = context.mySources.filter((s) => s.sourceKind === 'human').length;
      const debuff = myHumanCount >= 3 ? 3 : 2;
      targetGroup.debuffPower += debuff;
      context.log(`【効果発動】${targetGroup.cards[0]?.name || '相手グループ'}の強さを -${debuff} しました！${myHumanCount >= 3 ? '（人のみなもと3枚以上ボーナス発動）' : ''}`);
    },
  },
  {
    name: 'e-methane',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 3,
    image: '/cards/murogasu.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】を1枚選び、その強さを-2する。相手の場に「二酸化炭素」が3枚以上ある場合、その強さをさらに-1する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      const oppCo2Count = context.oppSources.filter((s) => s.sourceKind === 'co2').length;
      const debuff = oppCo2Count >= 3 ? 3 : 2;
      targetGroup.debuffPower += debuff;
      context.log(`【効果発動】${targetGroup.cards[0]?.name || '相手グループ'}の強さを -${debuff} しました！${oppCo2Count >= 3 ? '（相手CO2 3枚以上ボーナス発動）' : ''}`);
    },
  },
  {
    name: '道内最古の水族館、話題尽きず',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'my_group',
    requiredHumanSources: 2,
    image: '/cards/muroranminpou.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【海の生き物】を1枚選ぶ。その強さを+2する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      targetGroup.buffPower += 2;
      context.log(`【効果発動】指定した生き物グループの強さを +2 強化しました！`);
    },
  },
  {
    name: '地球環境を大切にする物流企業',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 2,
    image: '/cards/narasuta.jpg',
    pack: '室蘭パッケージ海',
    description: '自分の捨て場のサポートカードを1枚選び山札にもどす。場の【地球温暖化】を1枚選ぶ。その強さを-1する。',
    execute: (context, targetGroup) => {
      if (targetGroup) {
        targetGroup.debuffPower += 1;
      }
      const candidates = context.myGraveyard.filter((c) => c.type === 'support');
      if (candidates.length > 0 && context.openCardSelector) {
        context.openCardSelector({
          title: '【物流企業】捨て場から山札に戻すサポートカードを1枚選んでください',
          candidates,
          maxCount: 1,
          onConfirm: (selected) => {
            if (selected.length > 0) {
              const cardToReturn = selected[0];
              context.myGraveyard = context.myGraveyard.filter((c) => c.id !== cardToReturn.id);
              context.myDeck = [...context.myDeck, cardToReturn].sort(() => Math.random() - 0.5);
              context.log(`【効果発動】相手の強さを -1 し、捨て場から「${cardToReturn.name}」を山札に戻しました！`);
            }
          },
        });
      } else {
        context.log(`【効果発動】相手の強さを -1 しました。（捨て場に対象のサポートカードはありません）`);
      }
    },
  },
  {
    name: '「機械部品のリユース」でCO2を削減',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 1,
    image: '/cards/nisinoseisakuzyo.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】を1枚選ぶ。その強さを-2する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      targetGroup.debuffPower += 2;
      context.log(`【効果発動】${targetGroup.cards[0]?.name || '相手グループ'}の強さを -2 弱体化させました！`);
    },
  },
  {
    name: 'ごみから電気を生み出す「西いぶりエコファクトリー」',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 2,
    image: '/cards/nittetuennzi.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】を1枚選ぶ。その強さを-1する。自分の捨て場のサポートカードを1枚選び山札にもどす。',
    execute: (context, targetGroup) => {
      if (targetGroup) {
        targetGroup.debuffPower += 1;
      }
      const candidates = context.myGraveyard.filter((c) => c.type === 'support');
      if (candidates.length > 0 && context.openCardSelector) {
        context.openCardSelector({
          title: '【西いぶりエコファクトリー】捨て場から山札に戻すサポートカードを1枚選んでください',
          candidates,
          maxCount: 1,
          onConfirm: (selected) => {
            if (selected.length > 0) {
              const cardToReturn = selected[0];
              context.myGraveyard = context.myGraveyard.filter((c) => c.id !== cardToReturn.id);
              context.myDeck = [...context.myDeck, cardToReturn].sort(() => Math.random() - 0.5);
              context.log(`【効果発動】相手の強さを -1 し、捨て場から「${cardToReturn.name}」を山札に戻しました！`);
            }
          },
        });
      } else {
        context.log(`【効果発動】相手の強さを -1 しました。`);
      }
    },
  },
  {
    name: 'テツゲンの「想い」から生まれた仲間『くるーん』',
    side: 'blue',
    type: 'support',
    timing: 'main',
    target: 'none',
    requiredHumanSources: 2,
    image: '/cards/tetugen.jpg',
    pack: '室蘭パッケージ海',
    description: '山札からサポートカードを1枚選び、手札に加える。（山札をきり直す）',
    execute: (context) => {
      const candidates = context.myDeck.filter((c) => c.type === 'support');
      if (candidates.length > 0 && context.openCardSelector) {
        context.openCardSelector({
          title: '【くるーん】山札から手札に加えるサポートカードを1枚選んでください',
          candidates,
          maxCount: 1,
          onConfirm: (selected) => {
            if (selected.length > 0) {
              const cardToAdd = selected[0];
              context.myDeck = context.myDeck.filter((c) => c.id !== cardToAdd.id).sort(() => Math.random() - 0.5);
              context.myHand = [...context.myHand, cardToAdd];
              context.log(`【効果発動】山札から「${cardToAdd.name}」を手札に加えました！`);
            }
          },
        });
      } else {
        context.log('【効果発動】山札にサポートカードがありませんでした。');
      }
    },
  },
  {
    name: '廃石こうボードを未来の資源へ',
    side: 'blue',
    type: 'support',
    timing: 'main',
    target: 'none',
    requiredHumanSources: 2,
    image: '/cards/tokuyamatiyodazipusamu.jpg',
    pack: '室蘭パッケージ海',
    description: '自分の捨て場のサポートカードを2枚選び、山札にもどす。（山札をきり直す）',
    execute: (context) => {
      const candidates = context.myGraveyard.filter((c) => c.type === 'support');
      if (candidates.length > 0 && context.openCardSelector) {
        context.openCardSelector({
          title: '【廃石こうボード】捨て場から山札に戻すサポートカードを最大2枚選んでください',
          candidates,
          maxCount: 2,
          onConfirm: (selected) => {
            if (selected.length > 0) {
              const selectedIds = selected.map((s) => s.id);
              context.myGraveyard = context.myGraveyard.filter((c) => !selectedIds.includes(c.id));
              context.myDeck = [...context.myDeck, ...selected].sort(() => Math.random() - 0.5);
              context.log(`【効果発動】捨て場からサポートカードを ${selected.length} 枚山札に戻してシャッフルしました！`);
            }
          },
        });
      } else {
        context.log('【効果発動】捨て場に対象のサポートカードがありませんでした。');
      }
    },
  },
  {
    name: 'CarbonPositive学生Labと地球を守る',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 1,
    image: '/cards/ka-bonPositivegakuseiLab.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】を1枚選ぶ。その強さを-2する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      targetGroup.debuffPower += 2;
      context.log(`【効果発動】${targetGroup.cards[0]?.name || '相手グループ'}の強さを -2 弱体化させました！`);
    },
  },
  {
    name: '電気炉での鉄づくり',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 1,
    image: '/cards/kousei.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】を1枚選ぶ。その強さを-2する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      targetGroup.debuffPower += 2;
      context.log(`【効果発動】${targetGroup.cards[0]?.name || '相手グループ'}の強さを -2 弱体化させました！`);
    },
  },
  {
    name: '天然ガスから生まれた「生石灰くん」',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'opp_group',
    requiredHumanSources: 2,
    image: '/cards/yabasikougyou.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【地球温暖化】を1枚選ぶ。その強さを-3する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      targetGroup.debuffPower += 3;
      context.log(`【効果発動】${targetGroup.cards[0]?.name || '相手グループ'}の強さを -3 弱体化させました！`);
    },
  },
  {
    name: '鉄造りをささえる',
    side: 'blue',
    type: 'support',
    timing: 'main',
    target: 'none',
    requiredHumanSources: 2,
    image: '/cards/yamatokougyou.jpg',
    pack: '室蘭パッケージ海',
    description: '自分の捨て場のサポートカードを1枚選び、山札にもどす。（山札をきり直す）',
    execute: (context) => {
      const candidates = context.myGraveyard.filter((c) => c.type === 'support');
      if (candidates.length > 0 && context.openCardSelector) {
        context.openCardSelector({
          title: '【鉄造りをささえる】捨て場から山札に戻すサポートカードを1枚選んでください',
          candidates,
          maxCount: 1,
          onConfirm: (selected) => {
            if (selected.length > 0) {
              const cardToReturn = selected[0];
              context.myGraveyard = context.myGraveyard.filter((c) => c.id !== cardToReturn.id);
              context.myDeck = [...context.myDeck, cardToReturn].sort(() => Math.random() - 0.5);
              context.log(`【効果発動】捨て場から「${cardToReturn.name}」を山札に戻してシャッフルしました！`);
            }
          },
        });
      } else {
        context.log('【効果発動】捨て場に対象のサポートカードがありませんでした。');
      }
    },
  },
  {
    name: '持続可能な海を作ろう',
    side: 'blue',
    type: 'support',
    timing: 'battle',
    target: 'my_group',
    requiredHumanSources: 2,
    image: '/cards/zizokukanounaumiwotukurou.jpg',
    pack: '室蘭パッケージ海',
    description: '場の【海の生き物】を1枚選ぶ。その強さを+3する。',
    execute: (context, targetGroup) => {
      if (!targetGroup) return;
      targetGroup.buffPower += 3;
      context.log(`【効果発動】指定した生き物グループの強さを +3 強化しました！`);
    },
  },
  {
    name: 'ムロぴょんと未来を拓こう！',
    side: 'blue',
    type: 'support',
    timing: 'main',
    target: 'none',
    requiredHumanSources: 2,
    image: '/cards/muropyon.jpg',
    pack: 'プロモカード',
    description: '山札にある【みなもと】を2枚まで選ぶ。それを場に出す。（山札をきり直す）',
    execute: (context) => {
      const candidates = context.myDeck.filter((c) => c.type === 'source');
      if (candidates.length > 0 && context.openCardSelector) {
        context.openCardSelector({
          title: '【ムロぴょん】山札から場に出すみなもとカードを最大2枚選んでください',
          candidates,
          maxCount: 2,
          onConfirm: (selected) => {
            if (selected.length > 0) {
              const selectedIds = selected.map((s) => s.id);
              context.myDeck = context.myDeck.filter((c) => !selectedIds.includes(c.id)).sort(() => Math.random() - 0.5);
              context.mySources = [...context.mySources, ...(selected as any)];
              context.log(`【効果発動】山札からみなもとカードを ${selected.length} 枚場に展開しました！`);
            }
          },
        });
      } else {
        context.log('【効果発動】山札にみなもとカードがありませんでした。');
      }
    },
  },
];