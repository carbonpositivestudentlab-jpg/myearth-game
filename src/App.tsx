import { useState, useRef, useEffect } from 'react';
import type {
  Side,
  SourceCard,
  BattleCard,
  SupportCard,
  AnyCard,
  CardGroup,
  EffectContext,
  BattleLogEntry,
  LogCategory,
  AttachedSupport,
  CardSelectorConfig,
  TargetGroupSelectorConfig,
} from './cards/types';
import { createMuroranBlueDeck } from './cards/blueDeck';
import { createMuroranRedDeck } from './cards/redDeck';
import {
  BLUE_CARD_POOL,
  RED_CARD_POOL,
  instantiateCard,
  exportDeckCode,
  importDeckCode,
} from './cards/cardPool';

export default function App() {
  const [currentMode, setCurrentMode] = useState<'battle' | 'deck_builder'>('battle');

  // --- デッキビルダー用ステート ---
  const [builderSide, setBuilderSide] = useState<Side>('blue');
  const [blueEditDeck, setBlueEditDeck] = useState<AnyCard[]>([]);
  const [redEditDeck, setRedEditDeck] = useState<AnyCard[]>([]);

  const [snapshotBlueDeck, setSnapshotBlueDeck] = useState<AnyCard[]>([]);
  const [snapshotRedDeck, setSnapshotRedDeck] = useState<AnyCard[]>([]);

  const [filterPack, setFilterPack] = useState<string>('all');
  const [filterSourceKind, setFilterSourceKind] = useState<string>('all');
  const [filterCost, setFilterCost] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'default' | 'power_desc' | 'power_asc'>('default');

  const [jumonInput, setJumonInput] = useState<string>('');
  const [jumonMessage, setJumonMessage] = useState<string>('');

  // --- 対戦用ステート ---
  const [blueLife, setBlueLife] = useState<number>(15);
  const [blueDeck, setBlueDeck] = useState<AnyCard[]>([]);
  const [blueHand, setBlueHand] = useState<AnyCard[]>([]);
  const [blueSources, setBlueSources] = useState<SourceCard[]>([]);
  const [blueGroups, setBlueGroups] = useState<CardGroup[]>([]);
  const [blueGraveyard, setBlueGraveyard] = useState<AnyCard[]>([]);

  const [redLife, setRedLife] = useState<number>(15);
  const [redDeck, setRedDeck] = useState<AnyCard[]>([]);
  const [redHand, setRedHand] = useState<AnyCard[]>([]);
  const [redSources, setRedSources] = useState<SourceCard[]>([]);
  const [redGroups, setRedGroups] = useState<CardGroup[]>([]);
  const [redGraveyard, setRedGraveyard] = useState<AnyCard[]>([]);

  // 捨て札確認モーダル用ステート
  const [viewingGraveyardSide, setViewingGraveyardSide] = useState<Side | null>(null);

  // ゲームセット用ステート
  const [gameWinner, setGameWinner] = useState<{
    winner: Side;
    reason: string;
  } | null>(null);

  // 先攻抽選モーダル用ステート
  const [lotteryResult, setLotteryResult] = useState<{
    firstSide: Side;
    rolling: boolean;
  } | null>(null);

  // ターン進行
  const [turnCount, setTurnCount] = useState<number>(1);
  const [activeTurn, setActiveTurn] = useState<'blue_start' | 'blue_main' | 'red_start' | 'red_main' | 'battle'>('blue_start');
  const [currentTurnOrder, setCurrentTurnOrder] = useState<{ first: Side; second: Side }>({ first: 'blue', second: 'red' });
  const [navMessage, setNavMessage] = useState<string>('先攻を決定しています...');
  const [shieldNextPlayer, setShieldNextPlayer] = useState<Side | null>(null);

  // 対戦ログ（履歴）用ステート
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState<boolean>(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // 視覚エフェクト用トリガーステート
  const [damagedSide, setDamagedSide] = useState<Side | null>(null);
  const [recentSummonGroupId, setRecentSummonGroupId] = useState<string | null>(null);
  const [recentChainGroupId, setRecentChainGroupId] = useState<string | null>(null);
  const [recentSupportTargetGroupId, setRecentSupportTargetGroupId] = useState<string | null>(null);
  const [chargedSourceSide, setChargedSourceSide] = useState<Side | null>(null);

  // カード選択モーダル（山札・墓地用）
  const [selectorConfig, setSelectorConfig] = useState<CardSelectorConfig | null>(null);
  const [selectedCardsInModal, setSelectedCardsInModal] = useState<AnyCard[]>([]);

  // 相手グループ選択モーダル（磯焼け等の除去用）
  const [groupSelectorConfig, setGroupSelectorConfig] = useState<TargetGroupSelectorConfig | null>(null);

  // 操作用ステート（PCドラッグ ＆ モバイルタップ選択ハイブリッド）
  const [draggedCard, setDraggedCard] = useState<AnyCard | null>(null);
  const [selectedBattleCard, setSelectedBattleCard] = useState<BattleCard | null>(null);
  const [selectedSupport, setSelectedSupport] = useState<SupportCard | null>(null);

  // 横画面案内非表示フラグ
  const [dismissRotateTip, setDismissRotateTip] = useState<boolean>(false);

  // 長押しプレビュー
  const [previewCard, setPreviewCard] = useState<AnyCard | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // バトルフェイズ内部状態
  const [battleStep, setBattleStep] = useState<'initial' | 'supporting' | 'result' | null>(null);
  const [consecutivePasses, setConsecutivePasses] = useState<number>(0);
  const [initialBattleInfo, setInitialBattleInfo] = useState<{
    bluePower: number;
    redPower: number;
    disadvantagedSide: Side;
  } | null>(null);
  const [supportTurnSide, setSupportTurnSide] = useState<Side | null>(null);
  const [battleResultInfo, setBattleResultInfo] = useState<{
    bluePower: number;
    redPower: number;
    winner: 'blue' | 'red' | 'draw';
    diff: number;
  } | null>(null);

  // みなもと管理
  const blueSeaSources = blueSources.filter((s) => s.sourceKind === 'sea');
  const blueHumanSources = blueSources.filter((s) => s.sourceKind === 'human');
  const redCo2Sources = redSources.filter((s) => s.sourceKind === 'co2');
  const redHumanSources = redSources.filter((s) => s.sourceKind === 'human');

  const addLog = (message: string, category: LogCategory = 'system', side?: Side) => {
    setNavMessage(message);
    const newEntry: BattleLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      turnNumber: turnCount,
      side,
      category,
      message,
      timestamp: new Date(),
    };
    setBattleLogs((prev) => [...prev, newEntry]);
  };

  useEffect(() => {
    if (isLogPanelOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [battleLogs, isLogPanelOpen]);

  const runFirstTurnLottery = () => {
    const picked: Side = Math.random() < 0.5 ? 'blue' : 'red';
    setLotteryResult({ firstSide: picked, rolling: true });
    setTimeout(() => {
      setLotteryResult({ firstSide: picked, rolling: false });
    }, 600);
  };

  const handleConfirmLottery = () => {
    if (!lotteryResult) return;
    const first = lotteryResult.firstSide;
    const second: Side = first === 'blue' ? 'red' : 'blue';

    setCurrentTurnOrder({ first, second });
    setLotteryResult(null);

    const firstSideName = first === 'blue' ? '青い地球' : '赤い地球';
    addLog(`コイントスの結果、【${firstSideName}】が先攻に決定しました。`, 'system', first);

    if (first === 'blue') {
      setActiveTurn('blue_start');
      setShieldNextPlayer(null);
      setNavMessage('【青い地球】が先攻です！「ドロー」を押してスタートフェイズを開始してください。');
    } else {
      setActiveTurn('red_start');
      setShieldNextPlayer('red');
      setNavMessage('【赤い地球】が先攻です！端末を赤い地球プレイヤーに渡してください。');
    }
  };

  // 単一グループの墓地送り処理（みなもとは場に返却）
  const discardSingleGroup = (targetGroup: CardGroup, ownerSide: Side) => {
    const isOwnerBlue = ownerSide === 'blue';
    const battleCards = targetGroup.cards;
    const attachedSources = targetGroup.attachedSources;
    const attachedSupports = targetGroup.attachedSupports;

    if (isOwnerBlue) {
      setBlueGroups((prev) => prev.filter((g) => g.groupId !== targetGroup.groupId));
      setBlueGraveyard((prev) => [...battleCards, ...prev]);
      setBlueSources((prev) => [...prev, ...attachedSources]);

      attachedSupports.forEach((att) => {
        if (att.card.side === 'blue') {
          setBlueGraveyard((prev) => [att.card, ...prev]);
          setBlueSources((prev) => [...prev, ...att.attachedHumanSources]);
        } else {
          setRedGraveyard((prev) => [att.card, ...prev]);
          setRedSources((prev) => [...prev, ...att.attachedHumanSources]);
        }
      });
    } else {
      setRedGroups((prev) => prev.filter((g) => g.groupId !== targetGroup.groupId));
      setRedGraveyard((prev) => [...battleCards, ...prev]);
      setRedSources((prev) => [...prev, ...attachedSources]);

      attachedSupports.forEach((att) => {
        if (att.card.side === 'red') {
          setRedGraveyard((prev) => [att.card, ...prev]);
          setRedSources((prev) => [...prev, ...att.attachedHumanSources]);
        } else {
          setBlueGraveyard((prev) => [att.card, ...prev]);
          setBlueSources((prev) => [...prev, ...att.attachedHumanSources]);
        }
      });
    }
  };

  const resetGame = () => {
    setBlueLife(15);
    setBlueDeck([...blueEditDeck].sort(() => Math.random() - 0.5));
    setBlueHand([]);
    setBlueSources([]);
    setBlueGroups([]);
    setBlueGraveyard([]);

    setRedLife(15);
    setRedDeck([...redEditDeck].sort(() => Math.random() - 0.5));
    setRedHand([]);
    setRedSources([]);
    setRedGroups([]);
    setRedGraveyard([]);

    setDraggedCard(null);
    setSelectedBattleCard(null);
    setSelectedSupport(null);
    setBattleStep(null);
    setInitialBattleInfo(null);
    setBattleResultInfo(null);
    setSupportTurnSide(null);
    setConsecutivePasses(0);
    setPreviewCard(null);
    setViewingGraveyardSide(null);
    setGameWinner(null);
    setShieldNextPlayer(null);
    setTurnCount(1);
    setBattleLogs([]);
    setDamagedSide(null);
    setRecentSummonGroupId(null);
    setRecentChainGroupId(null);
    setRecentSupportTargetGroupId(null);
    setChargedSourceSide(null);
    setSelectorConfig(null);
    setSelectedCardsInModal([]);
    setGroupSelectorConfig(null);
    addLog('ゲームをリセットしました。', 'system');
    runFirstTurnLottery();
  };

  useEffect(() => {
    const initialBlue = createMuroranBlueDeck();
    const initialRed = createMuroranRedDeck();
    setBlueDeck(initialBlue);
    setRedDeck(initialRed);
    setBlueEditDeck(initialBlue);
    setRedEditDeck(initialRed);
    setSnapshotBlueDeck(initialBlue);
    setSnapshotRedDeck(initialRed);

    addLog('ゲームが初期化されました。', 'system');
    runFirstTurnLottery();
  }, []);

  const handleCardPressStart = (card: AnyCard) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setPreviewCard(card);
    }, 400);
  };

  const handleCardPressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const checkVictoryConditions = (bLife: number, rLife: number) => {
    if (bLife <= 0 && rLife <= 0) {
      setGameWinner({ winner: 'blue', reason: '両者のライフが同時に0になりました（引き分け判定）' });
      addLog('両者のライフが0になり引き分け決着となりました。', 'damage');
      return true;
    }
    if (bLife <= 0) {
      setGameWinner({ winner: 'red', reason: '青い地球のライフが0になりました！' });
      addLog('青い地球のライフが0になり、赤い地球の完全勝利となりました！', 'damage', 'red');
      return true;
    }
    if (rLife <= 0) {
      setGameWinner({ winner: 'blue', reason: '赤い地球のライフが0になりました！' });
      addLog('赤い地球のライフが0になり、青い地球の完全勝利となりました！', 'damage', 'blue');
      return true;
    }

    const blueBattleCount =
      blueDeck.filter((c) => c.type === 'battle').length +
      blueHand.filter((c) => c.type === 'battle').length +
      blueGroups.reduce((sum, g) => sum + g.cards.length, 0);

    const redBattleCount =
      redDeck.filter((c) => c.type === 'battle').length +
      redHand.filter((c) => c.type === 'battle').length +
      redGroups.reduce((sum, g) => sum + g.cards.length, 0);

    if (blueDeck.length + blueHand.length > 0 && blueBattleCount === 0) {
      setGameWinner({ winner: 'red', reason: '青い地球の戦える生物カードがすべて力尽きました！' });
      addLog('青い地球の戦える生物カードがすべて消滅し、戦力枯渇により敗北しました。', 'damage', 'red');
      return true;
    }
    if (redDeck.length + redHand.length > 0 && redBattleCount === 0) {
      setGameWinner({ winner: 'blue', reason: '赤い地球の地球温暖化カードがすべて消滅しました！' });
      addLog('赤い地球の地球温暖化カードがすべて消滅し、戦力枯渇により敗北しました。', 'damage', 'blue');
      return true;
    }

    return false;
  };

  const currentEditDeck = builderSide === 'blue' ? blueEditDeck : redEditDeck;
  const setCurrentEditDeck = (newDeck: AnyCard[]) => {
    if (builderSide === 'blue') setBlueEditDeck(newDeck);
    else setRedEditDeck(newDeck);
  };

  const openDeckBuilder = () => {
    setSnapshotBlueDeck([...blueEditDeck]);
    setSnapshotRedDeck([...redEditDeck]);
    setCurrentMode('deck_builder');
  };

  const handleRevertChanges = () => {
    if (builderSide === 'blue') setBlueEditDeck([...snapshotBlueDeck]);
    else setRedEditDeck([...snapshotRedDeck]);
    setJumonMessage('↺ 編集内容を元の状態に戻しました。');
    setTimeout(() => setJumonMessage(''), 3000);
  };

  const handleSortDeckByCost = () => {
    const battleCards = currentEditDeck
      .filter((c): c is BattleCard => c.type === 'battle')
      .sort((a, b) => a.requiredCost - b.requiredCost || a.power - b.power);

    const supportCards = currentEditDeck
      .filter((c): c is SupportCard => c.type === 'support')
      .sort((a, b) => a.requiredHumanSources - b.requiredHumanSources);

    const sourceCards = currentEditDeck
      .filter((c): c is SourceCard => c.type === 'source')
      .sort((a, b) => a.name.localeCompare(b.name));

    setCurrentEditDeck([...battleCards, ...supportCards, ...sourceCards]);
    setJumonMessage('⚡ デッキをコスト順に整列しました！');
    setTimeout(() => setJumonMessage(''), 3000);
  };

  const handleAddCardToDeck = (baseCard: AnyCard) => {
    if (currentEditDeck.length >= 20) {
      alert('デッキ枚数は20枚固定です。不要なカードを外してから追加してください。');
      return;
    }
    const isSource = baseCard.type === 'source';
    if (!isSource) {
      const sameNameCount = currentEditDeck.filter((c) => c.name === baseCard.name).length;
      if (sameNameCount >= 2) {
        alert(`同名カード「${baseCard.name}」はデッキに2枚までしか入れられません。`);
        return;
      }
    }
    const newCardInstance = instantiateCard(baseCard);
    setCurrentEditDeck([...currentEditDeck, newCardInstance]);
  };

  const handleRemoveCardFromDeck = (indexToRemove: number) => {
    setCurrentEditDeck(currentEditDeck.filter((_, idx) => idx !== indexToRemove));
  };

  const analyzeDeckWarnings = (deck: AnyCard[], side: Side): string[] => {
    const warnings: string[] = [];
    const battleCards = deck.filter((c): c is BattleCard => c.type === 'battle');
    const maxBattleCost = battleCards.length > 0 ? Math.max(...battleCards.map((c) => c.requiredCost)) : 0;

    const sourceCards = deck.filter((c): c is SourceCard => c.type === 'source');
    const primarySourceCount = sourceCards.filter((s) => (side === 'blue' ? s.sourceKind === 'sea' : s.sourceKind === 'co2')).length;
    const humanSourceCount = sourceCards.filter((s) => s.sourceKind === 'human').length;

    const targetSourceName = side === 'blue' ? '海のみなもと' : '二酸化炭素';

    if (maxBattleCost > 0 && primarySourceCount < maxBattleCost) {
      warnings.push(
        `⚠ 警告: 最大コスト（${maxBattleCost}）に対して、${targetSourceName}が「${primarySourceCount}枚」しか入っていません！`
      );
    }

    const supportCards = deck.filter((c): c is SupportCard => c.type === 'support');
    const maxHumanCost = supportCards.length > 0 ? Math.max(...supportCards.map((c) => c.requiredHumanSources)) : 0;

    if (maxHumanCost > 0 && humanSourceCount < maxHumanCost) {
      warnings.push(
        `⚠ 警告: サポートカードの最大必要枚数（${maxHumanCost}）に対して、人のみなもとが「${humanSourceCount}枚」不足しています！`
      );
    }

    return warnings;
  };

  const deckWarnings = analyzeDeckWarnings(currentEditDeck, builderSide);

  const handleExportJumon = () => {
    if (currentEditDeck.length !== 20) {
      alert('デッキが20枚揃っていません。');
      return;
    }
    const code = exportDeckCode(currentEditDeck);
    navigator.clipboard.writeText(code);
    setJumonMessage('📜 復活の呪文（デッキコード）を記録しました！');
    setTimeout(() => setJumonMessage(''), 4000);
  };

  const handleImportJumon = () => {
    if (!jumonInput.trim()) return;
    const imported = importDeckCode(jumonInput, builderSide);
    if (!imported) {
      alert('じゅもんが ちがいます！ 正しいデッキコードを入力してください。');
      return;
    }
    setCurrentEditDeck(imported);
    setJumonInput('');
    setJumonMessage('✨ じゅもんにより デッキが よみがえった！');
    setTimeout(() => setJumonMessage(''), 4000);
  };

  const handleApplyDeckAndReturn = () => {
    if (blueEditDeck.length !== 20 || redEditDeck.length !== 20) {
      alert('青い地球・赤い地球の両方のデッキを20枚ぴったりに調整してください。');
      return;
    }
    setBlueDeck([...blueEditDeck].sort(() => Math.random() - 0.5));
    setRedDeck([...redEditDeck].sort(() => Math.random() - 0.5));
    setBlueLife(15);
    setBlueHand([]);
    setBlueSources([]);
    setBlueGroups([]);
    setBlueGraveyard([]);
    setRedLife(15);
    setRedHand([]);
    setRedSources([]);
    setRedGroups([]);
    setRedGraveyard([]);
    setBattleStep(null);
    setGameWinner(null);
    setTurnCount(1);
    setBattleLogs([]);
    setCurrentMode('battle');
    addLog('新しいデッキで対戦を開始します。', 'system');
    runFirstTurnLottery();
  };

  const rawPool = builderSide === 'blue' ? BLUE_CARD_POOL : RED_CARD_POOL;
  const availablePacks = Array.from(new Set(rawPool.map((c) => c.pack).filter(Boolean)));

  const filteredPool = rawPool.filter((card) => {
    if (filterPack !== 'all' && card.pack !== filterPack) return false;
    if (filterSourceKind !== 'all') {
      if (filterSourceKind === 'sea' && !(card.type === 'source' && card.sourceKind === 'sea')) return false;
      if (filterSourceKind === 'co2' && !(card.type === 'source' && card.sourceKind === 'co2')) return false;
      if (filterSourceKind === 'human' && !(card.type === 'source' && card.sourceKind === 'human')) return false;
      if (filterSourceKind === 'none' && card.type === 'source') return false;
    }
    if (filterCost !== 'all') {
      const targetCost = parseInt(filterCost, 10);
      if (card.type === 'battle' && card.requiredCost !== targetCost) return false;
      if (card.type === 'support' && card.requiredHumanSources !== targetCost) return false;
      if (card.type === 'source' && targetCost !== 0) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'power_desc') {
      const pA = a.type === 'battle' ? a.power : 0;
      const pB = b.type === 'battle' ? b.power : 0;
      return pB - pA;
    }
    if (sortOrder === 'power_asc') {
      const pA = a.type === 'battle' ? a.power : 0;
      const pB = b.type === 'battle' ? b.power : 0;
      return pA - pB;
    }
    return 0;
  });

  const calculateGroupPower = (group: CardGroup) => {
    const base = group.cards.reduce((sum, c) => sum + c.power, 0);
    return Math.max(0, base + group.buffPower - group.debuffPower);
  };

  const blueTotalPower = blueGroups.reduce((sum, g) => sum + calculateGroupPower(g), 0);
  const redTotalPower = redGroups.reduce((sum, g) => sum + calculateGroupPower(g), 0);

  const handleStartPhase = (side: Side) => {
    setSelectedBattleCard(null);
    setSelectedSupport(null);
    const isBlue = side === 'blue';
    const sideName = isBlue ? '青い地球' : '赤い地球';
    let currentDeck = isBlue ? [...blueDeck] : [...redDeck];
    let currentHand = isBlue ? [...blueHand] : [...redHand];
    
    const needed = Math.max(0, 5 - currentHand.length);
    const drawCount = Math.min(needed, currentDeck.length);

    const drawnCards = currentDeck.slice(0, drawCount);
    currentDeck = currentDeck.slice(drawCount);
    const combinedHand = [...currentHand, ...drawnCards];

    const newSources: SourceCard[] = [];
    const remainingHand: AnyCard[] = [];

    combinedHand.forEach((card) => {
      if (card.type === 'source') newSources.push(card as SourceCard);
      else remainingHand.push(card);
    });

    if (newSources.length > 0) {
      setChargedSourceSide(side);
      setTimeout(() => setChargedSourceSide(null), 800);
    }

    if (drawCount > 0) {
      const sourceCount = newSources.length;
      const logText = sourceCount > 0
        ? `【${sideName}】カードを${drawCount}枚ドロー（うち ${sourceCount} 枚のみなもとをチャージ！）`
        : `【${sideName}】カードを${drawCount}枚ドローしました。`;
      addLog(logText, 'draw', side);
    } else {
      addLog(`【${sideName}】山札が0枚のためドローなしでメインフェイズへ進行します。`, 'draw', side);
    }

    if (isBlue) {
      setBlueDeck(currentDeck);
      setBlueHand(remainingHand);
      setBlueSources((prev) => [...prev, ...newSources]);
      setActiveTurn('blue_main');
      setNavMessage('【青い地球】メインフェイズです。カードをタップして召喚先を選ぶか、ドラッグして出せます。');
    } else {
      setRedDeck(currentDeck);
      setRedHand(remainingHand);
      setRedSources((prev) => [...prev, ...newSources]);
      setActiveTurn('red_main');
      setNavMessage('【赤い地球】メインフェイズです。カードをタップして召喚先を選ぶか、ドラッグして出せます。');
    }
  };

  const handleEndTurn = (side: Side) => {
    setDraggedCard(null);
    setSelectedBattleCard(null);
    setSelectedSupport(null);
    const sideName = side === 'blue' ? '青い地球' : '赤い地球';
    addLog(`【${sideName}】メインフェイズを終了しました。`, 'system', side);

    if (side === currentTurnOrder.first) {
      setShieldNextPlayer(currentTurnOrder.second);
    } else {
      startBattlePhase();
    }
  };

  const handleConfirmSwitch = () => {
    setSelectedBattleCard(null);
    setSelectedSupport(null);
    if (shieldNextPlayer === 'red') {
      setActiveTurn('red_start');
      setNavMessage('【赤い地球】のターンです。「ドロー」を押してスタートフェイズを開始してください。');
    } else if (shieldNextPlayer === 'blue') {
      setActiveTurn('blue_start');
      setNavMessage('【青い地球】のターンです。「ドロー」を押してスタートフェイズを開始してください。');
    }
    setShieldNextPlayer(null);
  };

  const executeCardEffect = (card: SupportCard, targetGroup?: CardGroup) => {
    const isBlue = card.side === 'blue';
    const sideName = isBlue ? '青い地球' : '赤い地球';

    if (targetGroup) {
      setRecentSupportTargetGroupId(targetGroup.groupId);
      setTimeout(() => setRecentSupportTargetGroupId(null), 950);
    }

    let mySources = isBlue ? [...blueSources] : [...redSources];
    const availableHumans = mySources.filter((s) => s.sourceKind === 'human');
    const usedHumans = availableHumans.slice(0, card.requiredHumanSources);
    const remainingSources = mySources.filter((s) => !usedHumans.includes(s));

    const currentHand = isBlue ? blueHand : redHand;
    const remainingHand = currentHand.filter((c) => c.id !== card.id);

    const isPermanent = card.target !== 'none';
    const attachedSupport: AttachedSupport | null = isPermanent
      ? { card, attachedHumanSources: usedHumans }
      : null;

    let currentMyGroups = isBlue ? [...blueGroups] : [...redGroups];
    let currentOppGroups = isBlue ? [...redGroups] : [...blueGroups];
    let currentMyGraveyard = isBlue ? [...blueGraveyard] : [...redGraveyard];

    let selectorWasOpened = false;

    const context: EffectContext = {
      mySide: card.side,
      myDeck: isBlue ? [...blueDeck] : [...redDeck],
      myHand: remainingHand,
      mySources: remainingSources,
      myGroups: currentMyGroups,
      myGraveyard: currentMyGraveyard,
      oppDeck: isBlue ? [...redDeck] : [...blueDeck],
      oppHand: isBlue ? [...redHand] : [...blueHand],
      oppSources: isBlue ? [...redSources] : [...blueSources],
      oppGroups: currentOppGroups,
      oppGraveyard: isBlue ? [...redGraveyard] : [...blueGraveyard],
      log: (msg) => addLog(msg, 'support', card.side),
      openCardSelector: (config) => {
        selectorWasOpened = true;
        setSelectedCardsInModal([]);
        setSelectorConfig({
          ...config,
          onConfirm: (selected) => {
            config.onConfirm(selected);

            if (isBlue) {
              setBlueDeck([...context.myDeck]);
              setBlueHand([...context.myHand]);
              setBlueSources([...context.mySources]);
              setBlueGroups([...context.myGroups]);
              if (!isPermanent) {
                setBlueGraveyard([card, ...context.myGraveyard]);
              } else {
                setBlueGraveyard([...context.myGraveyard]);
              }

              setRedDeck([...context.oppDeck]);
              setRedHand([...context.oppHand]);
              setRedSources([...context.oppSources]);
              setRedGroups([...context.oppGroups]);
              setRedGraveyard([...context.oppGraveyard]);
            } else {
              setRedDeck([...context.myDeck]);
              setRedHand([...context.myHand]);
              setRedSources([...context.mySources]);
              setRedGroups([...context.myGroups]);
              if (!isPermanent) {
                setRedGraveyard([card, ...context.myGraveyard]);
              } else {
                setRedGraveyard([...context.myGraveyard]);
              }

              setBlueDeck([...context.oppDeck]);
              setBlueHand([...context.oppHand]);
              setBlueSources([...context.oppSources]);
              setBlueGroups([...context.oppGroups]);
              setBlueGraveyard([...context.oppGraveyard]);
            }

            if (selected.some((c) => c.type === 'source')) {
              setChargedSourceSide(card.side);
              setTimeout(() => setChargedSourceSide(null), 800);
            }
          },
        });
      },
    };

    addLog(
      `【${sideName}】サポート「${card.name}」を発動！${isPermanent ? `（人のみなもと ${card.requiredHumanSources} 枚を占有）` : ''}`,
      'support',
      card.side
    );

    card.execute(context, targetGroup);

    const applyGroupUpdate = (groups: CardGroup[]): CardGroup[] => {
      return groups.map((g) => {
        if (targetGroup && g.groupId === targetGroup.groupId) {
          return {
            ...g,
            buffPower: targetGroup.buffPower,
            debuffPower: targetGroup.debuffPower,
            attachedSupports: attachedSupport
              ? [...g.attachedSupports, attachedSupport]
              : g.attachedSupports,
          };
        }
        return { ...g };
      });
    };

    const updatedMyGroups = applyGroupUpdate(context.myGroups);
    const updatedOppGroups = applyGroupUpdate(context.oppGroups);

    if (!isPermanent && !selectorWasOpened) {
      currentMyGraveyard = [card, ...context.myGraveyard];
    } else {
      currentMyGraveyard = context.myGraveyard;
    }

    if (isBlue) {
      setBlueSources(context.mySources);
      setBlueHand(context.myHand);
      setBlueGroups(updatedMyGroups);
      setBlueGraveyard(currentMyGraveyard);
      setBlueDeck(context.myDeck);

      setRedSources(context.oppSources);
      setRedHand(context.oppHand);
      setRedGroups(updatedOppGroups);
      setRedGraveyard(context.oppGraveyard);
      setRedDeck(context.oppDeck);
    } else {
      setRedSources(context.mySources);
      setRedHand(context.myHand);
      setRedGroups(updatedMyGroups);
      setRedGraveyard(currentMyGraveyard);
      setRedDeck(context.myDeck);

      setBlueSources(context.oppSources);
      setBlueHand(context.oppHand);
      setBlueGroups(updatedOppGroups);
      setBlueGraveyard(context.oppGraveyard);
      setBlueDeck(context.oppDeck);
    }

    setSelectedSupport(null);

    if (activeTurn === 'battle') {
      setConsecutivePasses(0);
      const nextSide: Side = card.side === 'blue' ? 'red' : 'blue';
      setSupportTurnSide(nextSide);
      addLog(
        `サポート応酬により、優先権が【${nextSide === 'blue' ? '青い地球' : '赤い地球'}】に移りました。`,
        'battle',
        nextSide
      );
    }
  };

  const handleSupportCardClick = (card: SupportCard) => {
    setSelectedBattleCard(null);
    const isBlue = card.side === 'blue';
    const humanCount = isBlue ? blueHumanSources.length : redHumanSources.length;

    if (humanCount < card.requiredHumanSources) {
      setNavMessage(`【人のみなもと不足】「${card.name}」には人のみなもとが ${card.requiredHumanSources} 枚必要です（現在空き: ${humanCount}枚）。`);
      return;
    }

    if (card.target === 'none') {
      executeCardEffect(card);
    } else {
      setSelectedSupport(card);
      const targetSideText = card.target === 'my_group' ? '味方' : '相手';
      setNavMessage(`「${card.name}」の対象とする【${targetSideText}のグループ】をタップしてください。`);
    }
  };

  // 対戦カードのタップ選択（スマホ・タブレット向け）
  const handleBattleCardClick = (card: BattleCard) => {
    setSelectedSupport(null);
    if (selectedBattleCard?.id === card.id) {
      setSelectedBattleCard(null);
      setNavMessage('カードの選択を解除しました。');
      return;
    }
    setSelectedBattleCard(card);
    setNavMessage(`「${card.name}」を選択中：対戦ゾーンをタップで【新規召喚】、グループをタップで【連鎖】、すてふだタップで【破棄】できます。`);
  };

  const startBattlePhase = () => {
    setActiveTurn('battle');
    setSelectedBattleCard(null);
    setSelectedSupport(null);
    setConsecutivePasses(0);

    const firstSide: Side = blueTotalPower < redTotalPower ? 'blue' : redTotalPower < blueTotalPower ? 'red' : 'blue';
    setInitialBattleInfo({
      bluePower: blueTotalPower,
      redPower: redTotalPower,
      disadvantagedSide: firstSide,
    });
    setSupportTurnSide(firstSide);
    setBattleStep('initial');
    addLog(`【バトルフェイズ開始】初期攻撃力判定：青 ${blueTotalPower} vs 赤 ${redTotalPower}`, 'battle');
  };

  const proceedToSupportConfirm = () => {
    if (!initialBattleInfo) return;
    setBattleStep('supporting');
    setConsecutivePasses(0);
    const disSideName = initialBattleInfo.disadvantagedSide === 'blue' ? '青い地球' : '赤い地球';
    addLog(`劣勢の【${disSideName}】からサポートカード確認ステップを開始します。`, 'battle', initialBattleInfo.disadvantagedSide);
  };

  const handlePassSupport = () => {
    setSelectedSupport(null);
    const currentPassSideName = supportTurnSide === 'blue' ? '青い地球' : '赤い地球';
    const newPassCount = consecutivePasses + 1;

    addLog(`【${currentPassSideName}】がサポート使用をパスしました。`, 'battle', supportTurnSide || undefined);

    if (newPassCount >= 2) {
      addLog('両プレイヤーが連続してパスしたため、最終戦闘解決へ進みます。', 'battle');
      resolveBattle();
    } else {
      setConsecutivePasses(newPassCount);
      const nextSide: Side = supportTurnSide === 'blue' ? 'red' : 'blue';
      setSupportTurnSide(nextSide);
      addLog(`優先権が【${nextSide === 'blue' ? '青い地球' : '赤い地球'}】に移りました。`, 'battle', nextSide);
    }
  };

  const resolveBattle = () => {
    setBattleStep('result');
    const finalBlue = blueTotalPower;
    const finalRed = redTotalPower;

    let winner: 'blue' | 'red' | 'draw' = 'draw';
    let diff = 0;
    let nextBLife = blueLife;
    let nextRLife = redLife;

    if (finalBlue > finalRed) {
      winner = 'blue';
      diff = finalBlue - finalRed;
      nextRLife = Math.max(0, redLife - diff);
      setRedLife(nextRLife);
      setDamagedSide('red');
      setTimeout(() => setDamagedSide(null), 600);
      addLog(`【戦闘結果】青 ${finalBlue} vs 赤 ${finalRed} ➔ 【青い地球】の勝利！ 赤い地球に ${diff} ダメージ！`, 'damage', 'blue');
    } else if (finalRed > finalBlue) {
      winner = 'red';
      diff = finalRed - finalBlue;
      nextBLife = Math.max(0, blueLife - diff);
      setBlueLife(nextBLife);
      setDamagedSide('blue');
      setTimeout(() => setDamagedSide(null), 600);
      addLog(`【戦闘結果】青 ${finalBlue} vs 赤 ${finalRed} ➔ 【赤い地球】の勝利！ 青い地球に ${diff} ダメージ！`, 'damage', 'red');
    } else {
      addLog(`【戦闘結果】青 ${finalBlue} vs 赤 ${finalRed} ➔ 引き分け！ 両陣営の対戦カードがすてふだへ送られます。`, 'damage');
    }

    setBattleResultInfo({ bluePower: finalBlue, redPower: finalRed, winner, diff });

    const cleanGroups = (targetGroups: CardGroup[]) => {
      const redGraveyardAdd: AnyCard[] = [];
      const blueGraveyardAdd: AnyCard[] = [];
      const redRestoredSources: SourceCard[] = [];
      const blueRestoredSources: SourceCard[] = [];

      targetGroups.forEach((g) => {
        g.cards.forEach((c) => {
          if (c.side === 'blue') blueGraveyardAdd.push(c);
          else redGraveyardAdd.push(c);
        });

        g.attachedSources.forEach((s) => {
          if (s.side === 'blue') blueRestoredSources.push(s);
          else redRestoredSources.push(s);
        });

        g.attachedSupports.forEach((att) => {
          if (att.card.side === 'blue') blueGraveyardAdd.push(att.card);
          else redGraveyardAdd.push(att.card);

          att.attachedHumanSources.forEach((hs) => {
            if (hs.side === 'blue') blueRestoredSources.push(hs);
            else redRestoredSources.push(hs);
          });
        });
      });

      return {
        redGraveyardAdd,
        blueGraveyardAdd,
        redRestoredSources,
        blueRestoredSources,
      };
    };

    if (winner === 'blue' || winner === 'draw') {
      const res = cleanGroups(redGroups);
      setRedGraveyard((prev) => [...res.redGraveyardAdd, ...prev]);
      setBlueGraveyard((prev) => [...res.blueGraveyardAdd, ...prev]);
      setRedSources((prev) => [...prev, ...res.redRestoredSources]);
      setBlueSources((prev) => [...prev, ...res.blueRestoredSources]);
      setRedGroups([]);
    }

    if (winner === 'red' || winner === 'draw') {
      const res = cleanGroups(blueGroups);
      setRedGraveyard((prev) => [...res.redGraveyardAdd, ...prev]);
      setBlueGraveyard((prev) => [...res.blueGraveyardAdd, ...prev]);
      setRedSources((prev) => [...prev, ...res.redRestoredSources]);
      setBlueSources((prev) => [...prev, ...res.blueRestoredSources]);
      setBlueGroups([]);
    }

    setTimeout(() => {
      checkVictoryConditions(nextBLife, nextRLife);
    }, 500);
  };

  const startNextTurn = () => {
    if (!battleResultInfo || gameWinner) return;

    const nextFirst: Side = battleResultInfo.winner === 'draw' ? currentTurnOrder.first : battleResultInfo.winner;
    const nextSecond: Side = nextFirst === 'blue' ? 'red' : 'blue';
    const nextTurnNum = turnCount + 1;

    setTurnCount(nextTurnNum);
    setCurrentTurnOrder({ first: nextFirst, second: nextSecond });
    setBattleStep(null);
    setInitialBattleInfo(null);
    setBattleResultInfo(null);
    setSupportTurnSide(null);
    setConsecutivePasses(0);

    const firstSideName = nextFirst === 'blue' ? '青い地球' : '赤い地球';
    addLog(`=== 第 ${nextTurnNum} ターン開始（先攻：【${firstSideName}】）===`, 'system', nextFirst);

    if (nextFirst === 'blue') {
      setActiveTurn('blue_start');
      setShieldNextPlayer('blue');
      setNavMessage('【青い地球】が先攻です！端末を青い地球プレイヤーに渡してください。');
    } else {
      setActiveTurn('red_start');
      setShieldNextPlayer('red');
      setNavMessage('【赤い地球】が先攻です！端末を赤い地球プレイヤーに渡してください。');
    }
  };

  const canChainToGroup = (group: CardGroup, card: BattleCard | null, availableCost: number): boolean => {
    if (!card) return false;

    const allowsCannibalism = card.chainableCardNames && card.chainableCardNames.includes(card.name);
    const alreadyExistsInGroup = group.cards.some((c) => c.name === card.name);
    if (!allowsCannibalism && alreadyExistsInGroup) {
      return false;
    }

    const isChainable = group.cards.some((existingCard) => {
      if (card.chainableCardNames && card.chainableCardNames.includes(existingCard.name)) {
        return true;
      }
      if (card.chainableCardNames?.includes('【地球温暖化】') && existingCard.category === '地球温暖化') {
        return true;
      }
      if (card.chainableCardNames?.includes('【海の生き物】') && existingCard.category === '海の生き物') {
        return true;
      }
      return false;
    });

    if (!isChainable) return false;

    const maxExistingCost = Math.max(...group.cards.map((c) => c.requiredCost));
    const costDifference = Math.max(0, card.requiredCost - maxExistingCost);
    return availableCost >= costDifference;
  };

  const triggerOnPlayEffect = (
    card: BattleCard,
    currentGroup: CardGroup,
    side: Side,
    currentMyGroups?: CardGroup[],
    currentMySources?: SourceCard[],
    currentMyHand?: AnyCard[]
  ) => {
    if (!card.onPlay) return;

    const isBlue = side === 'blue';
    const myDeck = isBlue ? [...blueDeck] : [...redDeck];
    const myHand = currentMyHand ?? (isBlue ? [...blueHand] : [...redHand]);
    const mySources = currentMySources ?? (isBlue ? [...blueSources] : [...redSources]);
    const myGroups = currentMyGroups ?? (isBlue ? [...blueGroups] : [...redGroups]);
    const myGraveyard = isBlue ? [...blueGraveyard] : [...redGraveyard];

    const oppDeck = isBlue ? [...redDeck] : [...blueDeck];
    const oppHand = isBlue ? [...redHand] : [...blueHand];
    const oppSources = isBlue ? [...redSources] : [...blueSources];
    const oppGroups = isBlue ? [...redGroups] : [...blueGroups];
    const oppGraveyard = isBlue ? [...redGraveyard] : [...blueGraveyard];

    const context: EffectContext = {
      mySide: side,
      myDeck,
      myHand,
      mySources,
      myGroups,
      myGraveyard,
      oppDeck,
      oppHand,
      oppSources,
      oppGroups,
      oppGraveyard,
      log: (msg) => addLog(msg, 'summon', side),
      openGroupSelector: (cfg) => setGroupSelectorConfig(cfg),
      discardGroup: (targetGrp, ownerSide) => discardSingleGroup(targetGrp, ownerSide),
    };

    card.onPlay(context, currentGroup);

    if (isBlue) {
      setBlueSources(context.mySources);
      setBlueGroups(context.myGroups);
      setBlueGraveyard(context.myGraveyard);
      setRedSources(context.oppSources);
      setRedGroups(context.oppGroups);
      setRedGraveyard(context.oppGraveyard);
    } else {
      setRedSources(context.mySources);
      setRedGroups(context.myGroups);
      setRedGraveyard(context.myGraveyard);
      setBlueSources(context.oppSources);
      setBlueGroups(context.oppGroups);
      setBlueGraveyard(context.oppGraveyard);
    }
  };

  // 新規召喚の共通実行関数（ドラッグ＆タップ兼用）
  const executeSummonNewGroup = (battleCard: BattleCard, side: Side) => {
    const isBlue = side === 'blue';
    const availableSources = isBlue ? blueSeaSources : redCo2Sources;
    const setSources = isBlue ? setBlueSources : setRedSources;
    const allSources = isBlue ? blueSources : redSources;
    const groups = isBlue ? blueGroups : redGroups;
    const setGroups = isBlue ? setBlueGroups : setRedGroups;
    const hand = isBlue ? blueHand : redHand;
    const setHand = isBlue ? setBlueHand : setRedHand;

    if (availableSources.length < battleCard.requiredCost) {
      setNavMessage(`【みなもと不足】「${battleCard.name}」には${isBlue ? '海' : 'CO2'}のみなもとが ${battleCard.requiredCost} 枚必要です。`);
      setDraggedCard(null);
      setSelectedBattleCard(null);
      return;
    }

    const used = availableSources.slice(0, battleCard.requiredCost);
    const remaining = allSources.filter((s) => !used.includes(s));
    const newGroupId = `group_${side}_${Date.now()}`;

    const newGroup: CardGroup = {
      groupId: newGroupId,
      cards: [battleCard],
      attachedSources: used,
      attachedSupports: [],
      buffPower: 0,
      debuffPower: 0,
    };

    const nextGroups = [...groups, newGroup];
    const nextSources = remaining;
    const nextHand = hand.filter((c) => c.id !== battleCard.id);

    setSources(nextSources);
    setGroups(nextGroups);
    setHand(nextHand);
    
    setRecentSummonGroupId(newGroupId);
    setTimeout(() => setRecentSummonGroupId(null), 500);

    addLog(`【${isBlue ? '青' : '赤'}い地球】「${battleCard.name}」を新規召喚！（コスト: ${battleCard.requiredCost}, パワー: ${battleCard.power}）`, 'summon', side);
    setDraggedCard(null);
    setSelectedBattleCard(null);

    triggerOnPlayEffect(battleCard, newGroup, side, nextGroups, nextSources, nextHand);
  };

  // 連鎖召喚の共通実行関数（ドラッグ＆タップ兼用）
  const executeChainGroup = (battleCard: BattleCard, side: Side, targetGroup: CardGroup) => {
    const isBlue = side === 'blue';
    const availableSources = isBlue ? blueSeaSources : redCo2Sources;
    const setSources = isBlue ? setBlueSources : setRedSources;
    const allSources = isBlue ? blueSources : redSources;
    const groups = isBlue ? blueGroups : redGroups;
    const setGroups = isBlue ? setBlueGroups : setRedGroups;
    const hand = isBlue ? blueHand : redHand;
    const setHand = isBlue ? setBlueHand : setRedHand;

    if (!canChainToGroup(targetGroup, battleCard, availableSources.length)) {
      setNavMessage('【連鎖不可】条件を満たしていないため連鎖できません。');
      setDraggedCard(null);
      setSelectedBattleCard(null);
      return;
    }

    const maxExistingCost = Math.max(...targetGroup.cards.map((c) => c.requiredCost));
    const costDiff = Math.max(0, battleCard.requiredCost - maxExistingCost);

    const additional = availableSources.slice(0, costDiff);
    const remaining = allSources.filter((s) => !additional.includes(s));
    const updatedCards = [...targetGroup.cards, battleCard].sort((a, b) => a.tier - b.tier);

    const updatedGroup: CardGroup = {
      ...targetGroup,
      cards: updatedCards,
      attachedSources: [...targetGroup.attachedSources, ...additional],
    };

    const nextGroups = groups.map((g) => (g.groupId === targetGroup.groupId ? updatedGroup : g));
    const nextSources = remaining;
    const nextHand = hand.filter((c) => c.id !== battleCard.id);

    setSources(nextSources);
    setGroups(nextGroups);
    setHand(nextHand);

    setRecentChainGroupId(targetGroup.groupId);
    setTimeout(() => setRecentChainGroupId(null), 900);

    addLog(`【${isBlue ? '青' : '赤'}い地球】「${battleCard.name}」を連鎖召喚！（追加コスト: ${costDiff}, パワー: ${battleCard.power}）`, 'chain', side);
    setDraggedCard(null);
    setSelectedBattleCard(null);

    triggerOnPlayEffect(battleCard, updatedGroup, side, nextGroups, nextSources, nextHand);
  };

  // 手札捨ての共通実行関数
  const executeDiscardCard = (card: AnyCard, side: Side) => {
    if (side === 'blue') {
      setBlueHand(blueHand.filter((c) => c.id !== card.id));
      setBlueGraveyard([card, ...blueGraveyard]);
    } else {
      setRedHand(redHand.filter((c) => c.id !== card.id));
      setRedGraveyard([card, ...redGraveyard]);
    }
    addLog(`【${side === 'blue' ? '青' : '赤'}い地球】「${card.name}」を手札からすてふだ置き場に置きました。`, 'system', side);
    setDraggedCard(null);
    setSelectedBattleCard(null);
  };

  // ドロップハンドラ（PCマウス用）
  const handleDropNewGroup = (e: React.DragEvent, side: Side) => {
    e.preventDefault();
    if (!draggedCard || draggedCard.side !== side || draggedCard.type !== 'battle') return;
    executeSummonNewGroup(draggedCard as BattleCard, side);
  };

  const handleDropChain = (e: React.DragEvent, side: Side, targetGroup: CardGroup) => {
    e.stopPropagation();
    e.preventDefault();
    if (!draggedCard || draggedCard.side !== side || draggedCard.type !== 'battle') return;
    executeChainGroup(draggedCard as BattleCard, side, targetGroup);
  };

  const handleDropGraveyard = (e: React.DragEvent, side: Side) => {
    e.preventDefault();
    if (!draggedCard || draggedCard.side !== side) return;
    executeDiscardCard(draggedCard, side);
  };

  // タップハンドラ（スマホ・タブレット用）
  const handleZoneClick = (side: Side) => {
    if (selectedBattleCard && selectedBattleCard.side === side) {
      executeSummonNewGroup(selectedBattleCard, side);
    }
  };

  const handleGroupTap = (group: CardGroup, groupOwnerSide: Side) => {
    // 1. サポートカード発動の対象選択
    if (selectedSupport) {
      if (selectedSupport.target === 'my_group' && selectedSupport.side !== groupOwnerSide) {
        setNavMessage('【対象エラー】味方のグループを選択してください！');
        return;
      }
      if (selectedSupport.target === 'opp_group' && selectedSupport.side === groupOwnerSide) {
        setNavMessage('【対象エラー】相手のグループを選択してください！');
        return;
      }
      executeCardEffect(selectedSupport, group);
      return;
    }

    // 2. 対戦カードの連鎖召喚（タップ時）
    if (selectedBattleCard && selectedBattleCard.side === groupOwnerSide) {
      executeChainGroup(selectedBattleCard, groupOwnerSide, group);
    }
  };

  const handleGraveyardTap = (side: Side) => {
    if (selectedBattleCard && selectedBattleCard.side === side) {
      executeDiscardCard(selectedBattleCard, side);
    } else {
      setViewingGraveyardSide(side);
    }
  };

  const handleToggleCardSelection = (card: AnyCard) => {
    if (!selectorConfig) return;
    const isSelected = selectedCardsInModal.some((c) => c.id === card.id);
    if (isSelected) {
      setSelectedCardsInModal(selectedCardsInModal.filter((c) => c.id !== card.id));
    } else {
      if (selectedCardsInModal.length >= selectorConfig.maxCount) {
        if (selectorConfig.maxCount === 1) {
          setSelectedCardsInModal([card]);
        } else {
          alert(`選べるのは最大 ${selectorConfig.maxCount} 枚までです。`);
        }
        return;
      }
      setSelectedCardsInModal([...selectedCardsInModal, card]);
    }
  };

  const handleConfirmCardSelection = () => {
    if (!selectorConfig) return;
    selectorConfig.onConfirm(selectedCardsInModal);
    setSelectorConfig(null);
    setSelectedCardsInModal([]);
  };

  const isBlueTurn = activeTurn.startsWith('blue') || (activeTurn === 'battle' && supportTurnSide === 'blue');
  const isRedTurn = activeTurn.startsWith('red') || (activeTurn === 'battle' && supportTurnSide === 'red');

  const isRedDominant = redTotalPower > blueTotalPower && redTotalPower > 0;
  const isBlueDominant = blueTotalPower > redTotalPower && blueTotalPower > 0;

  return (
    <div className="relative flex flex-col h-screen w-screen bg-slate-950 text-white font-sans overflow-hidden select-none p-1.5 sm:p-3 gap-1.5 sm:gap-2.5 text-xs">
      
      {/* スマホ縦画面時の「横画面推奨」トースト */}
      {!dismissRotateTip && (
        <div className="sm:hidden flex items-center justify-between bg-amber-950/90 border border-amber-500/80 px-2.5 py-1 rounded-lg text-[10px] text-amber-200 z-30 shadow-md">
          <span className="flex items-center gap-1 font-bold">
            🔄 スマホを【横向き】に回転させると快適に対戦できます！
          </span>
          <button
            onClick={() => setDismissRotateTip(true)}
            className="text-amber-400 font-black px-1.5 py-0.5 rounded hover:bg-amber-900/50"
          >
            ✕
          </button>
        </div>
      )}

      {/* 相手グループ選択モーダル（磯焼け等の除去用） */}
      {groupSelectorConfig && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-black tracking-widest text-rose-400 uppercase">Target Selector</span>
                <h2 className="text-sm font-black text-white mt-0.5">{groupSelectorConfig.title}</h2>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto py-3 flex items-center justify-center gap-4">
              {(groupSelectorConfig.targetSide === 'blue' ? blueGroups : redGroups).map((grp, gidx) => (
                <div
                  key={grp.groupId}
                  onClick={() => {
                    groupSelectorConfig.onSelect(grp);
                    setGroupSelectorConfig(null);
                  }}
                  className="bg-slate-950 border-2 border-slate-700 hover:border-rose-400 p-2.5 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer transition transform hover:scale-105 shadow-xl flex-shrink-0"
                >
                  <span className="text-[11px] font-black text-slate-300">
                    G{gidx + 1} ({grp.cards[0]?.name})
                  </span>
                  <div className="w-20 aspect-[63/88] rounded-lg overflow-hidden border border-slate-600 bg-black">
                    <img src={grp.cards[0]?.image} alt={grp.cards[0]?.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[9px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded font-black border border-rose-600">
                    選択して墓地へ
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* カード選択モーダル（山札サーチ・墓地サルベージ） */}
      {selectorConfig && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-2xl w-full max-h-[85vh] bg-slate-900 border-2 border-amber-400 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">Card Selector</span>
                <h2 className="text-sm font-black text-white mt-0.5">{selectorConfig.title}</h2>
              </div>
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-500 px-2.5 py-0.5 rounded-full font-black">
                {selectedCardsInModal.length} / {selectorConfig.maxCount} 枚
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {selectorConfig.candidates.map((card) => {
                  const isSelected = selectedCardsInModal.some((c) => c.id === card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleToggleCardSelection(card)}
                      onMouseDown={() => handleCardPressStart(card)}
                      onMouseUp={handleCardPressEnd}
                      onMouseLeave={handleCardPressEnd}
                      className={`p-1.5 rounded-xl border-2 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-950/40 ring-4 ring-emerald-400/80 scale-102'
                          : 'border-slate-700 bg-slate-950 hover:border-slate-500'
                      }`}
                    >
                      <div className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-black">
                        <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
                      </div>
                      <div className="text-[9px] font-bold text-slate-200 text-center truncate w-full">
                        {card.name}
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                        {isSelected ? '✓ 選択中' : '選択'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-2">
              <span className="text-[10px] text-slate-400">※長押しで詳細表示</span>
              <button
                onClick={handleConfirmCardSelection}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                決定 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 0. 先攻・後攻 抽選ポップアップモーダル */}
      {lotteryResult && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl p-6 border-4 border-amber-400 bg-slate-900 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-950 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-inner animate-bounce">
              🎲
            </div>

            <div>
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">First Turn Lottery</span>
              <h2 className="text-xl font-black text-white mt-1">先攻・後攻 決定</h2>
            </div>

            <div className="w-full py-4 px-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center min-h-[90px]">
              {lotteryResult.rolling ? (
                <div className="text-sm font-black text-amber-300 animate-pulse">
                  コイントス中...
                </div>
              ) : (
                <div className="animate-in zoom-in-75 duration-200">
                  <span className="text-[11px] text-slate-400 font-bold block mb-1">1ターン目の先攻は...</span>
                  <span className={`text-2xl font-black ${lotteryResult.firstSide === 'blue' ? 'text-sky-400' : 'text-rose-400'}`}>
                    【{lotteryResult.firstSide === 'blue' ? '青い地球' : '赤い地球'}】
                  </span>
                </div>
              )}
            </div>

            <button
              disabled={lotteryResult.rolling}
              onClick={handleConfirmLottery}
              className={`w-full py-3 text-white font-black text-sm rounded-xl shadow-lg transition cursor-pointer ${
                lotteryResult.rolling
                  ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400'
              }`}
            >
              対戦を開始する ➔
            </button>
          </div>
        </div>
      )}

      {/* 1. ゲームセット全画面モーダル */}
      {gameWinner && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-lg animate-in zoom-in-95 duration-300">
          <div className={`max-w-md w-full rounded-2xl p-6 border-4 shadow-2xl flex flex-col items-center text-center gap-4 bg-slate-900
            ${gameWinner.winner === 'blue' ? 'border-sky-400 shadow-sky-950/80' : 'border-rose-500 shadow-rose-950/80'}
          `}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-inner border-4
              ${gameWinner.winner === 'blue' ? 'bg-sky-950 border-sky-400 text-sky-300' : 'bg-rose-950 border-rose-500 text-rose-300'}
            `}>
              🏆
            </div>

            <div>
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">Game Set</span>
              <h1 className="text-2xl font-black text-white mt-1">
                【<span className={gameWinner.winner === 'blue' ? 'text-sky-400' : 'text-rose-400'}>
                  {gameWinner.winner === 'blue' ? '青い地球' : '赤い地球'}
                </span>】の完全勝利！
              </h1>
            </div>

            <div className="text-[11px] bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 w-full leading-relaxed">
              <span className="font-bold text-amber-300">【決着の理由】</span><br />
              {gameWinner.reason}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={resetGame}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                もう一度遊ぶ
              </button>
              <button
                onClick={() => {
                  setGameWinner(null);
                  openDeckBuilder();
                }}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                デッキ調整
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. すてふだ中身確認モーダル */}
      {viewingGraveyardSide && (
        <div
          onClick={() => setViewingGraveyardSide(null)}
          className="absolute inset-0 bg-black/85 z-40 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`max-w-2xl w-full max-h-[85vh] bg-slate-900 border-2 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 cursor-default
              ${viewingGraveyardSide === 'blue' ? 'border-sky-500' : 'border-rose-500'}
            `}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🪦</span>
                <h3 className="text-sm font-black text-white">
                  【{viewingGraveyardSide === 'blue' ? '青い地球' : '赤い地球'}】すてふだ
                </h3>
                <span className="text-[10px] text-slate-400">
                  （{(viewingGraveyardSide === 'blue' ? blueGraveyard : redGraveyard).length}枚）
                </span>
              </div>
              <button
                onClick={() => setViewingGraveyardSide(null)}
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer transition text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {(viewingGraveyardSide === 'blue' ? blueGraveyard : redGraveyard).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  すてふだはまだありません
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                  {(viewingGraveyardSide === 'blue' ? blueGraveyard : redGraveyard).map((card, idx) => (
                    <div
                      key={`${card.id}_${idx}`}
                      onMouseDown={() => handleCardPressStart(card)}
                      onMouseUp={handleCardPressEnd}
                      onMouseLeave={handleCardPressEnd}
                      onTouchStart={() => handleCardPressStart(card)}
                      onTouchEnd={handleCardPressEnd}
                      className="bg-slate-950 border border-slate-700 rounded-lg p-1 flex flex-col items-center gap-1 hover:border-amber-400 transition cursor-pointer shadow"
                    >
                      <div className="w-full aspect-[63/88] rounded overflow-hidden bg-black">
                        <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
                      </div>
                      <div className="text-[9px] font-bold text-slate-200 text-center truncate w-full">
                        {card.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* カード長押し拡大プレビューモーダル */}
      {previewCard && (
        <div
          onClick={() => setPreviewCard(null)}
          onMouseUp={() => setPreviewCard(null)}
          onTouchEnd={() => setPreviewCard(null)}
          className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-in fade-in zoom-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`max-w-xs w-full bg-slate-900 border-2 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3 relative
              ${previewCard.side === 'blue' ? 'border-sky-400 shadow-sky-950/50' : 'border-rose-400 shadow-rose-950/50'}
            `}
          >
            <div className="w-48 aspect-[63/88] rounded-xl overflow-hidden border border-slate-600 shadow-2xl bg-black">
              <img src={previewCard.image} alt={previewCard.name} className="w-full h-full object-cover" />
            </div>

            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${previewCard.side === 'blue' ? 'bg-sky-900 text-sky-200 border border-sky-600' : 'bg-rose-900 text-rose-200 border border-rose-600'}`}>
                  {previewCard.side === 'blue' ? '青い地球' : '赤い地球'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
                  {previewCard.type === 'battle' ? '対戦カード' : previewCard.type === 'support' ? 'サポートカード' : 'みなもと'}
                </span>
              </div>
              <h3 className="text-base font-black text-white">{previewCard.name}</h3>
            </div>

            <div className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex flex-col gap-1.5 leading-relaxed">
              {previewCard.type === 'battle' && (
                <>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-400">攻撃力:</span>
                    <span className="font-black text-emerald-400">{(previewCard as BattleCard).power}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-400">必要コスト:</span>
                    <span className="font-bold text-sky-300">
                      {previewCard.side === 'blue' ? '海' : 'CO2'} {(previewCard as BattleCard).requiredCost}枚
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    連鎖対象: <span className="text-slate-200 font-bold">{(previewCard as BattleCard).chainableCardNames?.join(', ') || 'なし'}</span>
                  </div>
                </>
              )}

              {previewCard.type === 'support' && (
                <>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-400">必要人のみなもと:</span>
                    <span className="font-bold text-amber-400">{(previewCard as SupportCard).requiredHumanSources}枚</span>
                  </div>
                  <div className="text-[11px] text-emerald-300 mt-0.5">
                    <b>効果:</b> {(previewCard as SupportCard).description || '特殊効果を発動します'}
                  </div>
                </>
              )}

              {previewCard.type === 'source' && (
                <div className="text-slate-300 text-center py-1 text-xs">
                  みなもとカード（エネルギー供給）
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500">※タップして閉じます</div>
          </div>
        </div>
      )}

      {/* 画面 A: デッキ編集モード */}
      {currentMode === 'deck_builder' ? (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 flex items-center justify-between shadow">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-black text-sm tracking-wider">
                ⚙ デッキビルダー
              </span>
              <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button
                  onClick={() => setBuilderSide('blue')}
                  className={`px-3 py-1 rounded font-black transition cursor-pointer text-[11px] ${
                    builderSide === 'blue' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  青 (生態系)
                </button>
                <button
                  onClick={() => setBuilderSide('red')}
                  className={`px-3 py-1 rounded font-black transition cursor-pointer text-[11px] ${
                    builderSide === 'red' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  赤 (温暖化)
                </button>
              </div>
            </div>

            <button
              onClick={handleApplyDeckAndReturn}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-1.5 rounded-lg text-xs transition cursor-pointer shadow flex items-center gap-1"
            >
              ⚔ 対戦へ戻る
            </button>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-2 min-h-0">
            {/* 左側：カードプール */}
            <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col min-w-0 shadow">
              {/* フィルター・ソートバー */}
              <div className="flex flex-wrap gap-2 items-center mb-2 pb-2 border-b border-slate-800 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">📦 パック:</span>
                  <select
                    value={filterPack}
                    onChange={(e) => setFilterPack(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 outline-none text-[10px]"
                  >
                    <option value="all">すべて</option>
                    {availablePacks.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">💧 みなもと:</span>
                  <select
                    value={filterSourceKind}
                    onChange={(e) => setFilterSourceKind(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 outline-none text-[10px]"
                  >
                    <option value="all">すべて</option>
                    {builderSide === 'blue' ? (
                      <option value="sea">海</option>
                    ) : (
                      <option value="co2">CO2</option>
                    )}
                    <option value="human">人</option>
                    <option value="none">みなもと以外</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">🔢 コスト:</span>
                  <select
                    value={filterCost}
                    onChange={(e) => setFilterCost(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 outline-none text-[10px]"
                  >
                    <option value="all">すべて</option>
                    <option value="0">0 (みなもと)</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-slate-400 font-bold">⚡ 強さ:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 outline-none text-[10px]"
                  >
                    <option value="default">標準</option>
                    <option value="power_desc">強い順</option>
                    <option value="power_asc">弱い順</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {filteredPool.map((card) => {
                    const countInDeck = currentEditDeck.filter((c) => c.name === card.name).length;
                    const isLimitReached = card.type !== 'source' && countInDeck >= 2;

                    return (
                      <div
                        key={card.id}
                        onClick={() => handleAddCardToDeck(card)}
                        onMouseDown={() => handleCardPressStart(card)}
                        onMouseUp={handleCardPressEnd}
                        onMouseLeave={handleCardPressEnd}
                        onTouchStart={() => handleCardPressStart(card)}
                        onTouchEnd={handleCardPressEnd}
                        className={`bg-slate-950 border rounded-lg p-1.5 flex flex-col items-center gap-1 cursor-pointer relative group
                          ${isLimitReached ? 'opacity-40 border-slate-800 cursor-not-allowed' : 'border-slate-700 hover:border-amber-400 shadow-sm'}
                        `}
                      >
                        <div className="w-full aspect-[63/88] rounded overflow-hidden border border-slate-700 bg-black">
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
                        </div>
                        <div className="w-full text-center">
                          <div className="text-[10px] font-black text-white truncate">{card.name}</div>
                          <div className="text-[9px] text-amber-400 font-bold">{countInDeck}/2枚</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 右側：デッキ20枚枠 */}
            <div className="w-full sm:w-80 bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col justify-between min-h-0 shadow">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                <span className="font-black text-xs text-slate-100">
                  {builderSide === 'blue' ? '青い地球' : '赤い地球'}のデッキ
                </span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                  currentEditDeck.length === 20 ? 'bg-emerald-950 text-emerald-300 border-emerald-500' : 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                }`}>
                  {currentEditDeck.length} / 20枚
                </span>
              </div>

              {/* デッキ警告の表示 */}
              {deckWarnings.length > 0 && (
                <div className="mb-2 p-1.5 rounded bg-amber-950/80 border border-amber-500 text-[10px] text-amber-200 flex flex-col gap-0.5">
                  {deckWarnings.map((w, idx) => (
                    <div key={idx} className="leading-tight">{w}</div>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
                {currentEditDeck.map((card, idx) => (
                  <div
                    key={`${card.id}_${idx}`}
                    onClick={() => handleRemoveCardFromDeck(idx)}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500 transition cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-100 text-[11px] truncate max-w-[180px]">{idx + 1}. {card.name}</span>
                    <span className="text-[10px] text-rose-400 font-black">✕</span>
                  </div>
                ))}
              </div>

              {/* 呪文メッセージの表示 */}
              {jumonMessage && (
                <div className="my-1.5 text-center text-[10px] text-emerald-300 font-bold bg-emerald-950/90 py-1 rounded border border-emerald-600">
                  {jumonMessage}
                </div>
              )}

              {/* 呪文入力とボタン群 */}
              <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="じゅもんを入力..."
                    value={jumonInput}
                    onChange={(e) => setJumonInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200 outline-none"
                  />
                  <button
                    onClick={handleImportJumon}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded text-[10px] transition cursor-pointer shadow"
                  >
                    唱える
                  </button>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={handleSortDeckByCost}
                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] font-bold text-amber-300"
                  >
                    ⚡ 整列
                  </button>
                  <button
                    onClick={handleRevertChanges}
                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] font-bold text-rose-300"
                  >
                    ↺ 戻す
                  </button>
                  <button
                    onClick={handleExportJumon}
                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] font-bold text-slate-200"
                  >
                    📋 記録
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 画面 B: 通常の対戦モード */
        <>
          {/* プレイヤー交代シールド */}
          {shieldNextPlayer && (
            <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
              <div className={`max-w-md w-full bg-slate-900 border-2 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 animate-in fade-in duration-300
                ${shieldNextPlayer === 'blue' ? 'border-sky-500' : 'border-rose-500'}
              `}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2
                  ${shieldNextPlayer === 'blue' ? 'bg-sky-950 border-sky-400' : 'bg-rose-950 border-rose-500'}
                `}>
                  🔄
                </div>
                <div>
                  <h2 className={`text-xl font-black mb-1 ${shieldNextPlayer === 'blue' ? 'text-sky-400' : 'text-rose-400'}`}>
                    プレイヤー交代
                  </h2>
                  <p className="text-xs text-slate-300">
                    端末を【{shieldNextPlayer === 'blue' ? '青い地球' : '赤い地球'}】に渡してください。
                  </p>
                </div>
                <button
                  onClick={handleConfirmSwitch}
                  className={`w-full py-2.5 text-white font-black text-sm rounded-xl shadow cursor-pointer transition ${
                    shieldNextPlayer === 'blue' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  画面を表示してターン開始
                </button>
              </div>
            </div>
          )}

          {/* バトル初期計算モーダル */}
          {battleStep === 'initial' && initialBattleInfo && (
            <div className="absolute inset-0 bg-black/85 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="max-w-md w-full p-5 rounded-2xl border-2 border-sky-400 bg-slate-900 shadow-2xl flex flex-col items-center text-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Battle Phase</span>
                <h2 className="text-lg font-black text-white">初期計算結果</h2>
                
                <div className="flex items-center justify-center gap-6 my-1">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-sky-400 font-bold">青い地球</span>
                    <span className="text-3xl font-black text-sky-300">{initialBattleInfo.bluePower}</span>
                  </div>
                  <span className="text-xl font-black text-slate-500">VS</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-rose-400 font-bold">赤い地球</span>
                    <span className="text-3xl font-black text-rose-300">{initialBattleInfo.redPower}</span>
                  </div>
                </div>

                <div className="text-[11px] bg-slate-950 p-3 rounded-xl border border-slate-800 w-full leading-relaxed text-slate-300">
                  劣勢の【
                  <b className={initialBattleInfo.disadvantagedSide === 'blue' ? 'text-sky-400' : 'text-rose-400'}>
                    {initialBattleInfo.disadvantagedSide === 'blue' ? '青い地球' : '赤い地球'}
                  </b>
                  】からサポートカードの使用確認を開始します。
                </div>

                <button
                  onClick={proceedToSupportConfirm}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-black text-xs rounded-xl shadow cursor-pointer transition"
                >
                  サポート確認へ進む ➔
                </button>
              </div>
            </div>
          )}

          {/* バトル最終結果モーダル */}
          {battleStep === 'result' && battleResultInfo && (
            <div className="absolute inset-0 bg-black/85 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="max-w-md w-full p-5 rounded-2xl border-2 border-amber-400 bg-slate-900 shadow-2xl flex flex-col items-center text-center gap-3">
                <h2 className="text-xl font-black text-amber-400">バトル結果</h2>
                <div className="flex items-center justify-center gap-6 my-1">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-sky-400 font-bold">青い地球</span>
                    <span className="text-3xl font-black text-sky-300">{battleResultInfo.bluePower}</span>
                  </div>
                  <span className="text-xl font-black text-slate-500">VS</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-rose-400 font-bold">赤い地球</span>
                    <span className="text-3xl font-black text-rose-300">{battleResultInfo.redPower}</span>
                  </div>
                </div>

                <div className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 w-full leading-relaxed">
                  {battleResultInfo.winner === 'draw' ? (
                    <span className="text-amber-300 font-bold">引き分け！ 両陣営の対戦カードがすてふだへ送られます。</span>
                  ) : (
                    (() => {
                      const isBlueWinner = battleResultInfo.winner === 'blue';
                      const loserName = isBlueWinner ? '赤い地球' : '青い地球';
                      const loserColor = isBlueWinner ? 'text-rose-400' : 'text-sky-400';
                      const winnerName = isBlueWinner ? '青い地球' : '赤い地球';
                      const winnerColor = isBlueWinner ? 'text-sky-400' : 'text-rose-400';

                      return (
                        <div>
                          <div className="text-sm font-bold mb-1">
                            【<span className={winnerColor}>{winnerName}</span>】の勝利！
                          </div>
                          <div className="text-xs">
                            【<span className={`font-bold ${loserColor}`}>{loserName}</span>】に{' '}
                            <b className="text-rose-400 text-sm">{battleResultInfo.diff}</b> ダメージ！
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <button
                  onClick={startNextTurn}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs rounded-xl shadow cursor-pointer transition"
                >
                  次のターンへ進む
                </button>
              </div>
            </div>
          )}

          {/* ナビゲーションバー */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow flex-shrink-0">
            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
              <span className="text-emerald-400 font-extrabold text-xs flex-shrink-0">進行</span>
              <span className="text-slate-200 font-medium text-[11px] truncate">➔ {navMessage}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setIsLogPanelOpen((prev) => !prev)}
                className={`text-[10px] px-2 py-0.5 rounded font-black transition cursor-pointer shadow flex items-center gap-1 ${
                  isLogPanelOpen ? 'bg-sky-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-600/50'
                }`}
              >
                📜 履歴
              </button>
              <button
                onClick={openDeckBuilder}
                className="text-[10px] bg-amber-600 hover:bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black transition cursor-pointer shadow"
              >
                ⚙ デッキ
              </button>
              <span className="bg-rose-950/80 border border-rose-600 px-2 py-0.5 rounded-full text-rose-300 font-bold text-[10px]">
                赤:{redLife}
              </span>
              <span className="bg-sky-950/80 border border-sky-600 px-2 py-0.5 rounded-full text-sky-300 font-bold text-[10px]">
                青:{blueLife}
              </span>
            </div>
          </div>

          {/* 赤い地球エリア（上段） */}
          <div className={`flex-1 flex flex-col gap-1 p-1.5 rounded-xl border transition-all min-h-0 relative
            ${isRedTurn ? 'border-rose-500 bg-rose-950/10 shadow-lg' : 'border-slate-800 bg-slate-950/50 opacity-70'}
            ${damagedSide === 'red' ? 'animate-shake ring-4 ring-rose-500 bg-rose-950/40' : ''}
          `}>
            {/* 上段：手札・山札・すてふだ */}
            <div className="h-20 sm:h-24 flex gap-1.5 flex-shrink-0">
              <div className="w-14 sm:w-20 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col items-center justify-center flex-shrink-0">
                <span className="font-bold text-slate-400 text-[9px]">山札</span>
                <span className="text-sm sm:text-base font-black text-rose-400">{redDeck.length}</span>
              </div>
              
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col justify-between min-w-0">
                <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                  <span>赤い地球の手札 ({redHand.length})</span>
                  {isRedTurn && <span className="text-rose-400 text-[8px]">タップで選択・長押しで拡大</span>}
                </div>
                <div className="flex gap-2 overflow-x-auto items-center h-full py-0.5">
                  {redHand.map((card, idx) => {
                    if (!isRedTurn) {
                      return (
                        <div key={card.id || idx} className="w-11 sm:w-14 aspect-[63/88] rounded border border-rose-950 bg-gradient-to-br from-rose-950 via-slate-900 to-black shadow flex flex-col items-center justify-center flex-shrink-0 opacity-80">
                          <span className="text-[9px] font-black text-rose-500/60">赤</span>
                        </div>
                      );
                    }

                    if (card.type === 'battle') {
                      const isSelected = selectedBattleCard?.id === card.id;
                      return (
                        <div
                          key={card.id}
                          draggable={activeTurn === 'red_main'}
                          onClick={() => activeTurn === 'red_main' && handleBattleCardClick(card as BattleCard)}
                          onDragStart={() => {
                            handleCardPressEnd();
                            setDraggedCard(card);
                          }}
                          onDragEnd={() => setDraggedCard(null)}
                          onMouseDown={() => handleCardPressStart(card)}
                          onMouseUp={handleCardPressEnd}
                          onMouseLeave={handleCardPressEnd}
                          onTouchStart={() => handleCardPressStart(card)}
                          onTouchEnd={handleCardPressEnd}
                          className={`w-11 sm:w-14 aspect-[63/88] rounded border shadow cursor-pointer flex-shrink-0 transition-transform
                            ${isSelected ? 'border-amber-400 ring-2 ring-amber-400 scale-105 shadow-amber-500/50' : 'border-rose-900'}
                            ${draggedCard?.id === card.id ? 'opacity-30 scale-95' : ''}
                          `}
                        >
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none rounded" />
                        </div>
                      );
                    }

                    if (card.type === 'support') {
                      const supportCard = card as SupportCard;
                      const isUsable = (supportCard.timing === 'main' && activeTurn === 'red_main') ||
                        (supportCard.timing === 'battle' && activeTurn === 'battle' && supportTurnSide === 'red');
                      const hasCost = redHumanSources.length >= supportCard.requiredHumanSources;
                      const canActivate = isUsable && hasCost;

                      return (
                        <div
                          key={supportCard.id}
                          draggable={activeTurn === 'red_main'}
                          onDragStart={() => {
                            handleCardPressEnd();
                            setDraggedCard(supportCard);
                          }}
                          onDragEnd={() => setDraggedCard(null)}
                          onClick={() => canActivate && handleSupportCardClick(supportCard)}
                          onMouseDown={() => handleCardPressStart(supportCard)}
                          onMouseUp={handleCardPressEnd}
                          onMouseLeave={handleCardPressEnd}
                          onTouchStart={() => handleCardPressStart(supportCard)}
                          onTouchEnd={handleCardPressEnd}
                          className={`w-11 sm:w-14 aspect-[63/88] rounded border shadow flex-shrink-0 flex flex-col items-center justify-center p-0.5 text-center cursor-pointer transition-transform
                            ${canActivate ? 'border-amber-400 bg-amber-950/60 ring-1 ring-amber-400' : 'border-slate-700 bg-slate-900 opacity-60'}
                            ${draggedCard?.id === supportCard.id ? 'opacity-30 scale-95' : ''}
                          `}
                        >
                          <span className="text-[7px] sm:text-[8px] font-black text-amber-300">サポート</span>
                          <span className="text-[7px] sm:text-[8px] font-bold text-white line-clamp-2 mt-0.5">{supportCard.name}</span>
                          <span className="text-[7px] text-amber-400 mt-0.5">人:{supportCard.requiredHumanSources}</span>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>

              <div
                onClick={() => handleGraveyardTap('red')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropGraveyard(e, 'red')}
                className={`w-14 sm:w-20 border rounded-lg p-1 flex flex-col items-center justify-center transition cursor-pointer flex-shrink-0
                  ${selectedBattleCard?.side === 'red' ? 'border-rose-400 ring-2 ring-rose-400 bg-rose-950/60' : 'border-slate-700 bg-slate-900 hover:border-rose-400'}
                `}
              >
                <span className="font-bold text-slate-400 text-[9px]">{selectedBattleCard?.side === 'red' ? '捨てる' : 'すてふだ'}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-300">{redGraveyard.length}</span>
              </div>
            </div>

            {/* 下段：対戦ゾーン・みなもと・ターンボタン */}
            <div className="flex-1 flex gap-1.5 min-h-0">
              <div
                onClick={() => handleZoneClick('red')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropNewGroup(e, 'red')}
                className={`flex-1 rounded-lg p-1.5 flex flex-col border transition-all relative overflow-hidden cursor-pointer ${
                  (draggedCard?.side === 'red' && draggedCard?.type === 'battle') || (selectedBattleCard?.side === 'red')
                    ? 'border-rose-400 border-dashed bg-rose-950/40 ring-1 ring-rose-400'
                    : 'border-slate-800 bg-slate-900/60'
                } ${isRedDominant ? 'shadow-[inset_0_0_20px_rgba(244,63,94,0.3)]' : ''}`}
              >
                {/* 優勢火の粉パーティクル演出 */}
                {isRedDominant && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="ember-particle"
                        style={{
                          left: `${(i * 10) + 3}%`,
                          width: `${Math.random() * 5 + 3}px`,
                          height: `${Math.random() * 5 + 3}px`,
                          animationDuration: `${Math.random() * 2 + 2}s`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] font-bold text-rose-300 mb-0.5 z-10">
                  <span className="flex items-center gap-1">
                    <span>【赤】対戦ゾーン</span>
                    {isRedDominant && <span className="text-[9px] px-1 bg-rose-900/80 text-rose-300 rounded font-black border border-rose-600 animate-pulse">🔥優勢</span>}
                    {selectedBattleCard?.side === 'red' && <span className="text-[9px] px-1 bg-amber-500 text-black rounded font-black">タップで召喚</span>}
                  </span>
                  <span>総攻撃力: <span className="text-xs sm:text-sm font-black text-rose-400">{redTotalPower}</span></span>
                </div>

                <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto z-10 py-1">
                  {redGroups.length === 0 ? (
                    <span className="text-slate-600 text-[10px]">
                      {selectedBattleCard?.side === 'red' ? 'ここをタップして新規召喚' : '対戦カードなし'}
                    </span>
                  ) : redGroups.map((group, idx) => {
                    const power = calculateGroupPower(group);
                    const activeCard = draggedCard || selectedBattleCard;
                    const isChainable = activeCard?.side === 'red' && activeCard?.type === 'battle' && canChainToGroup(group, activeCard as BattleCard, redCo2Sources.length);
                    const isSupportTarget = selectedSupport && (
                      (selectedSupport.target === 'my_group' && selectedSupport.side === 'red') ||
                      (selectedSupport.target === 'opp_group' && selectedSupport.side === 'blue')
                    );
                    const isNewSummon = recentSummonGroupId === group.groupId;
                    const isRecentChain = recentChainGroupId === group.groupId;
                    const isRecentSupport = recentSupportTargetGroupId === group.groupId;

                    return (
                      <div
                        key={group.groupId}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupTap(group, 'red');
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropChain(e, 'red', group)}
                        className={`flex flex-col items-center p-1.5 rounded-lg border transition-all cursor-pointer bg-slate-950 relative flex-shrink-0
                          ${isChainable ? 'border-yellow-400 ring-2 ring-yellow-400 scale-102 bg-yellow-950/30' : ''}
                          ${isSupportTarget ? 'border-emerald-400 ring-2 ring-emerald-400 animate-pulse' : 'border-rose-900'}
                          ${isNewSummon ? 'animate-summon' : ''}
                          ${isRecentChain ? 'animate-chain-flash' : ''}
                          ${isRecentSupport ? 'animate-support-target' : ''}
                        `}
                      >
                        <span className="text-[9px] text-slate-400 font-bold mb-0.5">G{idx + 1} (力:{power})</span>
                        <div className="relative w-16 sm:w-20 h-24 sm:h-28 flex items-center justify-center">
                          {group.cards.map((card, cidx) => (
                            <div
                              key={card.id}
                              onMouseDown={() => handleCardPressStart(card)}
                              onMouseUp={handleCardPressEnd}
                              onMouseLeave={handleCardPressEnd}
                              onTouchStart={() => handleCardPressStart(card)}
                              onTouchEnd={handleCardPressEnd}
                              className="absolute w-16 sm:w-20 aspect-[63/88] rounded overflow-hidden border border-rose-500 shadow"
                              style={{ top: `${cidx * 12}px`, zIndex: cidx + 1 }}
                            >
                              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col items-center gap-0.5 mt-1">
                          <span className="text-[8px] text-rose-400 bg-rose-950/80 px-1 rounded">
                            CO2:{group.attachedSources.length}
                          </span>
                          {group.attachedSupports.map((att, aidx) => (
                            <div key={`${att.card.id}_${aidx}`} className="text-[7px] bg-amber-950 text-amber-300 px-1 rounded">
                              ✨{att.card.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`w-24 sm:w-32 bg-slate-900 border border-slate-700 rounded-lg p-1.5 flex flex-col justify-between flex-shrink-0 transition-all ${
                chargedSourceSide === 'red' ? 'animate-source-charge border-rose-500 bg-rose-950/30' : ''
              }`}>
                <span className="text-center font-bold text-slate-400 text-[9px]">赤のみなもと</span>
                <div className="flex gap-1 flex-1 items-center justify-center my-0.5">
                  <div className="flex-1 flex flex-col items-center bg-rose-950/50 border border-rose-600 rounded p-0.5">
                    <span className="text-[9px] text-rose-300 font-bold">CO2</span>
                    <span className="text-sm sm:text-base font-black text-rose-200">{redCo2Sources.length}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center bg-amber-950/50 border border-amber-600 rounded p-0.5">
                    <span className="text-[9px] text-amber-300 font-bold">人</span>
                    <span className="text-sm sm:text-base font-black text-amber-200">{redHumanSources.length}</span>
                  </div>
                </div>
              </div>

              <div className="w-14 sm:w-16 flex flex-col flex-shrink-0">
                {activeTurn === 'red_start' ? (
                  <button onClick={() => handleStartPhase('red')} className="w-full h-full bg-rose-600 hover:bg-rose-500 rounded-lg text-white font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow">
                    <span>ドロー</span>
                  </button>
                ) : activeTurn === 'red_main' ? (
                  <button onClick={() => handleEndTurn('red')} className="w-full h-full bg-amber-600 hover:bg-amber-500 rounded-lg text-slate-950 font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow">
                    <span>終了</span>
                  </button>
                ) : activeTurn === 'battle' && supportTurnSide === 'red' && battleStep === 'supporting' ? (
                  <button onClick={handlePassSupport} className="w-full h-full bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow">
                    <span>パス</span>
                  </button>
                ) : (
                  <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center text-slate-600 text-[9px] text-center">待機</div>
                )}
              </div>
            </div>
          </div>

          {/* 青い地球エリア（下段） */}
          <div className={`flex-1 flex flex-col gap-1 p-1.5 rounded-xl border transition-all min-h-0 relative
            ${isBlueTurn ? 'border-sky-500 bg-sky-950/10 shadow-lg' : 'border-slate-800 bg-slate-950/50 opacity-70'}
            ${damagedSide === 'blue' ? 'animate-shake ring-4 ring-sky-500 bg-sky-950/40' : ''}
          `}>
            {/* 上段：対戦ゾーン・みなもと・ターンボタン */}
            <div className="flex-1 flex gap-1.5 min-h-0">
              <div
                onClick={() => handleZoneClick('blue')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropNewGroup(e, 'blue')}
                className={`flex-1 rounded-lg p-1.5 flex flex-col border transition-all relative overflow-hidden cursor-pointer ${
                  (draggedCard?.side === 'blue' && draggedCard?.type === 'battle') || (selectedBattleCard?.side === 'blue')
                    ? 'border-sky-400 border-dashed bg-sky-950/40 ring-1 ring-sky-400'
                    : 'border-slate-800 bg-slate-900/60'
                } ${isBlueDominant ? 'shadow-[inset_0_0_20px_rgba(14,165,233,0.3)]' : ''}`}
              >
                {/* 優勢木の葉パーティクル演出 */}
                {isBlueDominant && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="leaf-particle"
                        style={{
                          left: `${(i * 10) + 2}%`,
                          animationDuration: `${Math.random() * 2.5 + 3}s`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] font-bold text-sky-300 mb-0.5 z-10">
                  <span className="flex items-center gap-1">
                    <span>【青】対戦ゾーン</span>
                    {isBlueDominant && <span className="text-[9px] px-1 bg-emerald-900/80 text-emerald-300 rounded font-black border border-emerald-500 animate-pulse">🌿優勢</span>}
                    {selectedBattleCard?.side === 'blue' && <span className="text-[9px] px-1 bg-amber-500 text-black rounded font-black">タップで召喚</span>}
                  </span>
                  <span>総攻撃力: <span className="text-xs sm:text-sm font-black text-sky-400">{blueTotalPower}</span></span>
                </div>

                <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto z-10 py-1">
                  {blueGroups.length === 0 ? (
                    <span className="text-slate-600 text-[10px]">
                      {selectedBattleCard?.side === 'blue' ? 'ここをタップして新規召喚' : '対戦カードなし'}
                    </span>
                  ) : blueGroups.map((group, idx) => {
                    const power = calculateGroupPower(group);
                    const activeCard = draggedCard || selectedBattleCard;
                    const isChainable = activeCard?.side === 'blue' && activeCard?.type === 'battle' && canChainToGroup(group, activeCard as BattleCard, blueSeaSources.length);
                    const isSupportTarget = selectedSupport && (
                      (selectedSupport.target === 'my_group' && selectedSupport.side === 'blue') ||
                      (selectedSupport.target === 'opp_group' && selectedSupport.side === 'red')
                    );
                    const isNewSummon = recentSummonGroupId === group.groupId;
                    const isRecentChain = recentChainGroupId === group.groupId;
                    const isRecentSupport = recentSupportTargetGroupId === group.groupId;

                    return (
                      <div
                        key={group.groupId}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupTap(group, 'blue');
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropChain(e, 'blue', group)}
                        className={`flex flex-col items-center p-1.5 rounded-lg border transition-all cursor-pointer bg-slate-950 relative flex-shrink-0
                          ${isChainable ? 'border-yellow-400 ring-2 ring-yellow-400 scale-102 bg-yellow-950/30' : ''}
                          ${isSupportTarget ? 'border-emerald-400 ring-2 ring-emerald-400 animate-pulse' : 'border-sky-900'}
                          ${isNewSummon ? 'animate-summon' : ''}
                          ${isRecentChain ? 'animate-chain-flash' : ''}
                          ${isRecentSupport ? 'animate-support-target' : ''}
                        `}
                      >
                        <span className="text-[9px] text-slate-400 font-bold mb-0.5">G{idx + 1} (力:{power})</span>
                        <div className="relative w-16 sm:w-20 h-24 sm:h-28 flex items-center justify-center">
                          {group.cards.map((card, cidx) => (
                            <div
                              key={card.id}
                              onMouseDown={() => handleCardPressStart(card)}
                              onMouseUp={handleCardPressEnd}
                              onMouseLeave={handleCardPressEnd}
                              onTouchStart={() => handleCardPressStart(card)}
                              onTouchEnd={handleCardPressEnd}
                              className="absolute w-16 sm:w-20 aspect-[63/88] rounded overflow-hidden border border-emerald-400 shadow"
                              style={{ top: `${cidx * 12}px`, zIndex: cidx + 1 }}
                            >
                              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col items-center gap-0.5 mt-1">
                          <span className="text-[8px] text-sky-300 bg-sky-950/80 px-1 rounded">
                            海:{group.attachedSources.length}
                          </span>
                          {group.attachedSupports.map((att, aidx) => (
                            <div key={`${att.card.id}_${aidx}`} className="text-[7px] bg-amber-950 text-amber-300 px-1 rounded">
                              ✨{att.card.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`w-24 sm:w-32 bg-slate-900 border border-slate-700 rounded-lg p-1.5 flex flex-col justify-between flex-shrink-0 transition-all ${
                chargedSourceSide === 'blue' ? 'animate-source-charge border-sky-400 bg-sky-950/30' : ''
              }`}>
                <span className="text-center font-bold text-slate-400 text-[9px]">青のみなもと</span>
                <div className="flex gap-1 flex-1 items-center justify-center my-0.5">
                  <div className="flex-1 flex flex-col items-center bg-sky-950/50 border border-sky-600 rounded p-0.5">
                    <span className="text-[9px] text-sky-300 font-bold">海</span>
                    <span className="text-sm sm:text-base font-black text-sky-200">{blueSeaSources.length}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center bg-amber-950/50 border border-amber-600 rounded p-0.5">
                    <span className="text-[9px] text-amber-300 font-bold">人</span>
                    <span className="text-sm sm:text-base font-black text-amber-200">{blueHumanSources.length}</span>
                  </div>
                </div>
              </div>

              <div className="w-14 sm:w-16 flex flex-col flex-shrink-0">
                {activeTurn === 'blue_start' ? (
                  <button onClick={() => handleStartPhase('blue')} className="w-full h-full bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow">
                    <span>ドロー</span>
                  </button>
                ) : activeTurn === 'blue_main' ? (
                  <button onClick={() => handleEndTurn('blue')} className="w-full h-full bg-amber-600 hover:bg-amber-500 rounded-lg text-slate-950 font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow">
                    <span>終了</span>
                  </button>
                ) : activeTurn === 'battle' && supportTurnSide === 'blue' && battleStep === 'supporting' ? (
                  <button onClick={handlePassSupport} className="w-full h-full bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow">
                    <span>パス</span>
                  </button>
                ) : (
                  <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center text-slate-600 text-[9px] text-center">待機</div>
                )}
              </div>
            </div>

            {/* 下段：手札・山札・すてふだ */}
            <div className="h-20 sm:h-24 flex gap-1.5 flex-shrink-0">
              <div
                onClick={() => handleGraveyardTap('blue')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropGraveyard(e, 'blue')}
                className={`w-14 sm:w-20 border rounded-lg p-1 flex flex-col items-center justify-center transition cursor-pointer flex-shrink-0
                  ${selectedBattleCard?.side === 'blue' ? 'border-sky-400 ring-2 ring-sky-400 bg-sky-950/60' : 'border-slate-700 bg-slate-900 hover:border-sky-400'}
                `}
              >
                <span className="font-bold text-slate-400 text-[9px]">{selectedBattleCard?.side === 'blue' ? '捨てる' : 'すてふだ'}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-300">{blueGraveyard.length}</span>
              </div>

              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col justify-between min-w-0">
                <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                  <span>青い地球の手札 ({blueHand.length})</span>
                  {isBlueTurn && <span className="text-emerald-400 text-[8px]">タップで選択・長押しで拡大</span>}
                </div>
                <div className="flex gap-2 overflow-x-auto items-center h-full py-0.5">
                  {blueHand.map((card, idx) => {
                    if (!isBlueTurn) {
                      return (
                        <div key={card.id || idx} className="w-11 sm:w-14 aspect-[63/88] rounded border border-sky-950 bg-gradient-to-br from-sky-950 via-slate-900 to-black shadow flex flex-col items-center justify-center flex-shrink-0 opacity-80">
                          <span className="text-[9px] font-black text-sky-500/60">青</span>
                        </div>
                      );
                    }

                    if (card.type === 'battle') {
                      const isSelected = selectedBattleCard?.id === card.id;
                      return (
                        <div
                          key={card.id}
                          draggable={activeTurn === 'blue_main'}
                          onClick={() => activeTurn === 'blue_main' && handleBattleCardClick(card as BattleCard)}
                          onDragStart={() => {
                            handleCardPressEnd();
                            setDraggedCard(card);
                          }}
                          onDragEnd={() => setDraggedCard(null)}
                          onMouseDown={() => handleCardPressStart(card)}
                          onMouseUp={handleCardPressEnd}
                          onMouseLeave={handleCardPressEnd}
                          onTouchStart={() => handleCardPressStart(card)}
                          onTouchEnd={handleCardPressEnd}
                          className={`w-11 sm:w-14 aspect-[63/88] rounded border shadow cursor-pointer flex-shrink-0 transition-transform
                            ${isSelected ? 'border-amber-400 ring-2 ring-amber-400 scale-105 shadow-amber-500/50' : 'border-slate-600'}
                            ${draggedCard?.id === card.id ? 'opacity-30 scale-95' : ''}
                          `}
                        >
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none rounded" />
                        </div>
                      );
                    }

                    if (card.type === 'support') {
                      const supportCard = card as SupportCard;
                      const isUsable = (supportCard.timing === 'main' && activeTurn === 'blue_main') ||
                        (supportCard.timing === 'battle' && activeTurn === 'battle' && supportTurnSide === 'blue');
                      const hasCost = blueHumanSources.length >= supportCard.requiredHumanSources;
                      const canActivate = isUsable && hasCost;

                      return (
                        <div
                          key={supportCard.id}
                          draggable={activeTurn === 'blue_main'}
                          onDragStart={() => {
                            handleCardPressEnd();
                            setDraggedCard(supportCard);
                          }}
                          onDragEnd={() => setDraggedCard(null)}
                          onClick={() => canActivate && handleSupportCardClick(supportCard)}
                          onMouseDown={() => handleCardPressStart(supportCard)}
                          onMouseUp={handleCardPressEnd}
                          onMouseLeave={handleCardPressEnd}
                          onTouchStart={() => handleCardPressStart(supportCard)}
                          onTouchEnd={handleCardPressEnd}
                          className={`w-11 sm:w-14 aspect-[63/88] rounded border shadow flex-shrink-0 flex flex-col items-center justify-center p-0.5 text-center cursor-pointer transition-transform
                            ${canActivate ? 'border-amber-400 bg-amber-950/60 ring-1 ring-amber-400' : 'border-slate-700 bg-slate-900 opacity-60'}
                            ${draggedCard?.id === supportCard.id ? 'opacity-30 scale-95' : ''}
                          `}
                        >
                          <span className="text-[7px] sm:text-[8px] font-black text-amber-300">サポート</span>
                          <span className="text-[7px] sm:text-[8px] font-bold text-white line-clamp-2 mt-0.5">{supportCard.name}</span>
                          <span className="text-[7px] text-amber-400 mt-0.5">人:{supportCard.requiredHumanSources}</span>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>

              <div className="w-14 sm:w-20 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col items-center justify-center flex-shrink-0">
                <span className="font-bold text-slate-400 text-[9px]">山札</span>
                <span className="text-sm sm:text-base font-black text-sky-400">{blueDeck.length}</span>
              </div>
            </div>
          </div>

          {/* バトルログ パネル */}
          {isLogPanelOpen && (
            <div className="absolute right-2 bottom-12 w-80 max-h-[400px] bg-slate-900/95 border border-sky-500 rounded-xl shadow-2xl flex flex-col z-30 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
              <div className="flex justify-between items-center px-3 py-2 border-b border-slate-800 bg-slate-950/80 rounded-t-xl">
                <span className="font-black text-xs text-white">対戦履歴 ({battleLogs.length})</span>
                <button onClick={() => setIsLogPanelOpen(false)} className="text-slate-400 hover:text-white font-black text-xs p-1">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 min-h-[180px] max-h-[320px]">
                {battleLogs.length === 0 ? (
                  <div className="text-center text-slate-500 py-8 text-[11px]">履歴はまだありません</div>
                ) : (
                  battleLogs.map((log) => (
                    <div key={log.id} className="p-1.5 rounded border border-slate-800 bg-slate-950/60 text-[10px] leading-relaxed flex flex-col gap-0.5">
                      <div className="flex justify-between items-center text-[9px] text-slate-400">
                        <span>T{log.turnNumber} [{log.category}]</span>
                        <span>{log.timestamp.toTimeString().substring(0, 8)}</span>
                      </div>
                      <div className="font-medium text-slate-200">{log.message}</div>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}