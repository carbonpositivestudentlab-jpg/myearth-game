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

  // ドラッグ操作（誤タップ防止のドラッグ召喚）
  const [draggedCard, setDraggedCard] = useState<AnyCard | null>(null);
  const [selectedSupport, setSelectedSupport] = useState<SupportCard | null>(null);

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
      setNavMessage('【青い地球】が先攻です！右端の「ドロー」を押してスタートフェイズを開始してください。');
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
    }, 350);
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

  const availablePacks = Array.from(new Set(rawPool.map((c) => c.pack).filter(Boolean)));

  const calculateGroupPower = (group: CardGroup) => {
    const base = group.cards.reduce((sum, c) => sum + c.power, 0);
    return Math.max(0, base + group.buffPower - group.debuffPower);
  };

  const blueTotalPower = blueGroups.reduce((sum, g) => sum + calculateGroupPower(g), 0);
  const redTotalPower = redGroups.reduce((sum, g) => sum + calculateGroupPower(g), 0);

  const handleStartPhase = (side: Side) => {
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
      setNavMessage('【青い地球】メインフェイズです。カードを対戦ゾーンかすてふだへドラッグ、またはサポートカードを使用できます。');
    } else {
      setRedDeck(currentDeck);
      setRedHand(remainingHand);
      setRedSources((prev) => [...prev, ...newSources]);
      setActiveTurn('red_main');
      setNavMessage('【赤い地球】メインフェイズです。カードを対戦ゾーンかすてふだへドラッグ、またはサポートカードを使用できます。');
    }
  };

  const handleEndTurn = (side: Side) => {
    setDraggedCard(null);
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
    if (shieldNextPlayer === 'red') {
      setActiveTurn('red_start');
      setNavMessage('【赤い地球】のターンです。上段の「ドロー」を押してスタートフェイズを開始してください。');
    } else if (shieldNextPlayer === 'blue') {
      setActiveTurn('blue_start');
      setNavMessage('【青い地球】のターンです。右端の「ドロー」を押してスタートフェイズを開始してください。');
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

            // ★ モーダルで選択完了後、更新された context の全状態を React state に即時反映する
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

            // みなもとカードが場に出た場合はチャージエフェクトを発火
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

    // ★ 選択モーダルを伴わない使いきりサポートの場合のみ即座に墓地へ
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
      setNavMessage(`「${card.name}」の対象とする【${targetSideText}のグループ】をクリックしてください。`);
    }
  };

  const handleGroupClick = (group: CardGroup, groupOwnerSide: Side) => {
    if (!selectedSupport) return;
    if (selectedSupport.target === 'my_group' && selectedSupport.side !== groupOwnerSide) {
      setNavMessage('【対象エラー】味方のグループを選択してください！');
      return;
    }
    if (selectedSupport.target === 'opp_group' && selectedSupport.side === groupOwnerSide) {
      setNavMessage('【対象エラー】相手のグループを選択してください！');
      return;
    }
    executeCardEffect(selectedSupport, group);
  };

  const startBattlePhase = () => {
    setActiveTurn('battle');
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

  // 対戦カードの onPlay（召喚時効果）実行ヘルパー
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

  // 新規召喚（ドラッグ＆ドロップ）
  const handleDropNewGroup = (e: React.DragEvent, side: Side) => {
    e.preventDefault();
    if (!draggedCard || draggedCard.side !== side || draggedCard.type !== 'battle') return;
    const battleCard = draggedCard as BattleCard;
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

    triggerOnPlayEffect(battleCard, newGroup, side, nextGroups, nextSources, nextHand);
  };

  // 連鎖召喚（ドラッグ＆ドロップ）
  const handleDropChain = (e: React.DragEvent, side: Side, targetGroup: CardGroup) => {
    e.stopPropagation();
    e.preventDefault();
    if (!draggedCard || draggedCard.side !== side || draggedCard.type !== 'battle') return;
    const battleCard = draggedCard as BattleCard;

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

    triggerOnPlayEffect(battleCard, updatedGroup, side, nextGroups, nextSources, nextHand);
  };

  const handleDropGraveyard = (e: React.DragEvent, side: Side) => {
    e.preventDefault();
    if (!draggedCard || draggedCard.side !== side) return;
    if (side === 'blue') {
      setBlueHand(blueHand.filter((c) => c.id !== draggedCard.id));
      setBlueGraveyard([draggedCard, ...blueGraveyard]);
    } else {
      setRedHand(redHand.filter((c) => c.id !== draggedCard.id));
      setRedGraveyard([draggedCard, ...redGraveyard]);
    }
    addLog(`【${side === 'blue' ? '青' : '赤'}い地球】「${draggedCard.name}」を手札からすてふだ置き場に置きました。`, 'system', side);
    setDraggedCard(null);
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
    <div className="relative flex flex-col h-screen w-screen bg-slate-950 text-white font-sans overflow-hidden select-none p-3 gap-2.5 text-xs">
      
      {/* 相手グループ選択モーダル（磯焼け等の除去用） */}
      {groupSelectorConfig && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-black tracking-widest text-rose-400 uppercase">Target Selector</span>
                <h2 className="text-base font-black text-white mt-0.5">{groupSelectorConfig.title}</h2>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto py-4 flex items-center justify-center gap-6">
              {(groupSelectorConfig.targetSide === 'blue' ? blueGroups : redGroups).map((grp, gidx) => (
                <div
                  key={grp.groupId}
                  onClick={() => {
                    groupSelectorConfig.onSelect(grp);
                    setGroupSelectorConfig(null);
                  }}
                  className="bg-slate-950 border-2 border-slate-700 hover:border-rose-400 p-3 rounded-2xl flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105 shadow-xl"
                >
                  <span className="text-xs font-black text-slate-300">
                    G{gidx + 1} ({grp.cards[0]?.name})
                  </span>
                  <div className="w-24 aspect-[63/88] rounded-lg overflow-hidden border border-slate-600 bg-black">
                    <img src={grp.cards[0]?.image} alt={grp.cards[0]?.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded font-black border border-rose-600">
                    選択して墓地へ送る
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* カード選択モーダル（山札サーチ・墓地サルベージ） */}
      {selectorConfig && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-2xl w-full max-h-[85vh] bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-black tracking-widest text-amber-400 uppercase">Card Selector</span>
                <h2 className="text-base font-black text-white mt-0.5">{selectorConfig.title}</h2>
              </div>
              <span className="text-xs bg-amber-950 text-amber-300 border border-amber-500 px-3 py-1 rounded-full font-black">
                選択中: {selectedCardsInModal.length} / {selectorConfig.maxCount} 枚
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-3.5">
                {selectorConfig.candidates.map((card) => {
                  const isSelected = selectedCardsInModal.some((c) => c.id === card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleToggleCardSelection(card)}
                      onMouseDown={() => handleCardPressStart(card)}
                      onMouseUp={handleCardPressEnd}
                      onMouseLeave={handleCardPressEnd}
                      className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-950/40 ring-4 ring-emerald-400/80 scale-102'
                          : 'border-slate-700 bg-slate-950 hover:border-slate-500'
                      }`}
                    >
                      <div className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-black">
                        <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
                      </div>
                      <div className="text-[10px] font-bold text-slate-200 text-center truncate w-full">
                        {card.name}
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                        {isSelected ? '✓ 選択中' : '選択する'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-3">
              <span className="text-[11px] text-slate-400">※カード長押しで詳細を拡大表示</span>
              <button
                onClick={handleConfirmCardSelection}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                選択を決定する ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 0. 先攻・後攻 抽選ポップアップモーダル */}
      {lotteryResult && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl p-8 border-4 border-amber-400 bg-slate-900 shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-amber-950 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-inner animate-bounce">
              🎲
            </div>

            <div>
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">First Turn Lottery</span>
              <h2 className="text-2xl font-black text-white mt-1">先攻・後攻 決定</h2>
            </div>

            <div className="w-full py-6 px-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center min-h-[110px]">
              {lotteryResult.rolling ? (
                <div className="text-base font-black text-amber-300 animate-pulse">
                  コイントス中...
                </div>
              ) : (
                <div className="animate-in zoom-in-75 duration-200">
                  <span className="text-xs text-slate-400 font-bold block mb-1">1ターン目の先攻は...</span>
                  <span className={`text-3xl font-black ${lotteryResult.firstSide === 'blue' ? 'text-sky-400' : 'text-rose-400'}`}>
                    【{lotteryResult.firstSide === 'blue' ? '青い地球' : '赤い地球'}】
                  </span>
                </div>
              )}
            </div>

            <button
              disabled={lotteryResult.rolling}
              onClick={handleConfirmLottery}
              className={`w-full py-3.5 text-white font-black text-sm rounded-xl shadow-lg transition cursor-pointer ${
                lotteryResult.rolling
                  ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-950/80'
              }`}
            >
              対戦を開始する ➔
            </button>
          </div>
        </div>
      )}

      {/* 1. ゲームセット全画面モーダル */}
      {gameWinner && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-lg animate-in zoom-in-95 duration-300">
          <div className={`max-w-md w-full rounded-3xl p-8 border-4 shadow-2xl flex flex-col items-center text-center gap-6 bg-slate-900
            ${gameWinner.winner === 'blue' ? 'border-sky-400 shadow-sky-950/80' : 'border-rose-500 shadow-rose-950/80'}
          `}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-inner border-4
              ${gameWinner.winner === 'blue' ? 'bg-sky-950 border-sky-400 text-sky-300' : 'bg-rose-950 border-rose-500 text-rose-300'}
            `}>
              🏆
            </div>

            <div>
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">Game Set</span>
              <h1 className="text-3xl font-black text-white mt-1">
                【<span className={gameWinner.winner === 'blue' ? 'text-sky-400' : 'text-rose-400'}>
                  {gameWinner.winner === 'blue' ? '青い地球' : '赤い地球'}
                </span>】の完全勝利！
              </h1>
            </div>

            <div className="text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 w-full leading-relaxed">
              <span className="font-bold text-amber-300">【決着の理由】</span><br />
              {gameWinner.reason}
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={resetGame}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm rounded-xl shadow-lg transition cursor-pointer"
              >
                もう一度遊ぶ（再戦）
              </button>
              <button
                onClick={() => {
                  setGameWinner(null);
                  openDeckBuilder();
                }}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                デッキを調整する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. すてふだ中身確認モーダル */}
      {viewingGraveyardSide && (
        <div
          onClick={() => setViewingGraveyardSide(null)}
          className="absolute inset-0 bg-black/85 z-40 flex items-center justify-center p-6 backdrop-blur-sm cursor-pointer animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`max-w-2xl w-full max-h-[85vh] bg-slate-900 border-2 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 cursor-default
              ${viewingGraveyardSide === 'blue' ? 'border-sky-500' : 'border-rose-500'}
            `}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🪦</span>
                <h3 className="text-base font-black text-white">
                  【{viewingGraveyardSide === 'blue' ? '青い地球' : '赤い地球'}】すてふだ置き場
                </h3>
                <span className="text-xs text-slate-400">
                  （計 {(viewingGraveyardSide === 'blue' ? blueGraveyard : redGraveyard).length}枚 / カード長押しで詳細表示）
                </span>
              </div>
              <button
                onClick={() => setViewingGraveyardSide(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {(viewingGraveyardSide === 'blue' ? blueGraveyard : redGraveyard).length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  すてふだはまだありません
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {(viewingGraveyardSide === 'blue' ? blueGraveyard : redGraveyard).map((card, idx) => (
                    <div
                      key={`${card.id}_${idx}`}
                      onMouseDown={() => handleCardPressStart(card)}
                      onMouseUp={handleCardPressEnd}
                      onMouseLeave={handleCardPressEnd}
                      onTouchStart={() => handleCardPressStart(card)}
                      onTouchEnd={handleCardPressEnd}
                      className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 flex flex-col items-center gap-1 hover:border-amber-400 hover:scale-105 transition cursor-pointer shadow"
                    >
                      <div className="w-full aspect-[63/88] rounded overflow-hidden bg-black">
                        <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
                      </div>
                      <div className="text-[10px] font-bold text-slate-200 text-center truncate w-full">
                        {card.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center text-[11px] text-slate-500 border-t border-slate-800 pt-2">
              外側をクリックまたは右上の「✕」で閉じます
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
            className={`max-w-sm w-full bg-slate-900 border-2 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 relative
              ${previewCard.side === 'blue' ? 'border-sky-400 shadow-sky-950/50' : 'border-rose-400 shadow-rose-950/50'}
            `}
          >
            <div className="w-56 aspect-[63/88] rounded-xl overflow-hidden border-2 border-slate-600 shadow-2xl bg-black">
              <img src={previewCard.image} alt={previewCard.name} className="w-full h-full object-cover" />
            </div>

            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold ${previewCard.side === 'blue' ? 'bg-sky-900 text-sky-200 border border-sky-600' : 'bg-rose-900 text-rose-200 border border-rose-600'}`}>
                  {previewCard.side === 'blue' ? '青い地球' : '赤い地球'}
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
                  {previewCard.type === 'battle' ? '対戦カード' : previewCard.type === 'support' ? 'サポートカード' : 'みなもと'}
                </span>
              </div>
              <h3 className="text-lg font-black text-white">{previewCard.name}</h3>
              {previewCard.pack && <span className="text-xs text-slate-400 font-medium">📦 {previewCard.pack}</span>}
            </div>

            <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs flex flex-col gap-2 leading-relaxed">
              {previewCard.type === 'battle' && (
                <>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">攻撃力 (パワー):</span>
                    <span className="font-black text-emerald-400 text-base">{(previewCard as BattleCard).power}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">必要コスト:</span>
                    <span className="font-bold text-sky-300">
                      {previewCard.side === 'blue' ? '海' : 'CO2'} {(previewCard as BattleCard).requiredCost}枚
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">階層 (Tier):</span>
                    <span className="font-bold text-amber-300">
                      {(previewCard as BattleCard).tier === 1 ? '下位' : (previewCard as BattleCard).tier === 2 ? '中位' : '上位'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    連鎖対象: <span className="text-slate-200 font-bold">{(previewCard as BattleCard).chainableCardNames?.join(', ') || 'なし'}</span>
                  </div>
                </>
              )}

              {previewCard.type === 'support' && (
                <>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">発動タイミング:</span>
                    <span className="font-bold text-amber-300">
                      {(previewCard as SupportCard).timing === 'main' ? 'メインフェイズ' : 'バトルフェイズ'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">必要人のみなもと:</span>
                    <span className="font-bold text-amber-400">{(previewCard as SupportCard).requiredHumanSources}枚</span>
                  </div>
                  <div className="text-xs text-emerald-300 mt-1">
                    <b>効果:</b> {(previewCard as SupportCard).description || '特殊効果を発動します'}
                  </div>
                </>
              )}

              {previewCard.type === 'source' && (
                <div className="text-slate-300 text-center py-2 text-xs">
                  みなもとカード（リソース供給カード）
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500">※離すと閉じます</div>
          </div>
        </div>
      )}

      {/* 画面 A: デッキ編集モード */}
      {currentMode === 'deck_builder' ? (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-xl px-6 py-3 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-5">
              <span className="text-amber-400 font-black text-lg tracking-wider flex items-center gap-2">
                ⚙ デッキビルダー
              </span>
              <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
                <button
                  onClick={() => setBuilderSide('blue')}
                  className={`px-4 py-1.5 rounded-lg font-black transition cursor-pointer text-xs ${
                    builderSide === 'blue' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  青い地球 (生態系)
                </button>
                <button
                  onClick={() => setBuilderSide('red')}
                  className={`px-4 py-1.5 rounded-lg font-black transition cursor-pointer text-xs ${
                    builderSide === 'red' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  赤い地球 (温暖化)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleApplyDeckAndReturn}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2 rounded-xl text-sm transition cursor-pointer shadow-lg shadow-emerald-950 flex items-center gap-2"
              >
                ⚔ このデッキで対戦する
              </button>
            </div>
          </div>

          <div className="flex-1 flex gap-3 min-h-0">
            {/* 左側：カードプール */}
            <div className="flex-1 bg-slate-900 border-2 border-slate-700 rounded-xl p-4 flex flex-col min-w-0 shadow-lg">
              <div className="flex flex-wrap gap-3 items-center mb-3 pb-3 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">📦 パック:</span>
                  <select
                    value={filterPack}
                    onChange={(e) => setFilterPack(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none"
                  >
                    <option value="all">すべて</option>
                    {availablePacks.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">💧 みなもと:</span>
                  <select
                    value={filterSourceKind}
                    onChange={(e) => setFilterSourceKind(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none"
                  >
                    <option value="all">すべて</option>
                    {builderSide === 'blue' ? (
                      <option value="sea">海のみなもと</option>
                    ) : (
                      <option value="co2">二酸化炭素</option>
                    )}
                    <option value="human">人のみなもと</option>
                    <option value="none">みなもと以外</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">🔢 コスト:</span>
                  <select
                    value={filterCost}
                    onChange={(e) => setFilterCost(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none"
                  >
                    <option value="all">すべて</option>
                    <option value="0">0 (みなもと)</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-slate-400 font-bold">⚡ 強さ順:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none"
                  >
                    <option value="default">標準</option>
                    <option value="power_desc">強い順 (降順)</option>
                    <option value="power_asc">弱い順 (昇順)</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-4 gap-3.5">
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
                        className={`bg-slate-950 border-2 rounded-xl p-2.5 flex flex-col items-center gap-2 cursor-pointer relative group card-hover-${builderSide}
                          ${isLimitReached ? 'opacity-40 border-slate-800 cursor-not-allowed' : 'border-slate-700 hover:border-amber-400 shadow-sm'}
                        `}
                      >
                        <div className="w-full aspect-[63/88] rounded-lg overflow-hidden border border-slate-700 bg-black">
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
                        </div>

                        <div className="w-full text-center">
                          <div className="text-xs font-black text-white truncate">{card.name}</div>
                          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 px-1">
                            <span className="font-bold">
                              {card.type === 'battle' ? `力: ${card.power}` : card.type === 'support' ? `人: ${card.requiredHumanSources}` : 'みなもと'}
                            </span>
                            <span className={countInDeck > 0 ? 'text-amber-400 font-extrabold' : 'text-slate-600'}>
                              {countInDeck}/2枚
                            </span>
                          </div>
                        </div>

                        <button
                          disabled={isLimitReached}
                          className={`w-full py-1.5 rounded-lg text-xs font-black transition ${
                            isLimitReached ? 'bg-slate-800 text-slate-500' : 'bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer shadow'
                          }`}
                        >
                          {isLimitReached ? '上限到達' : '＋ デッキに追加'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 右側：デッキ20枚枠 */}
            <div className="w-[420px] bg-slate-900 border-2 border-slate-700 rounded-xl p-4 flex flex-col justify-between min-h-0 shadow-xl">
              <div className="flex flex-col min-h-0 flex-1">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-2.5">
                  <div>
                    <h3 className="font-black text-base text-slate-100">
                      {builderSide === 'blue' ? '青い地球' : '赤い地球'}のデッキ
                    </h3>
                    <span className="text-[11px] text-slate-400">（20枚固定 / クリックで除外）</span>
                  </div>
                  <div className={`text-lg font-black px-4 py-1 rounded-full border-2 shadow ${
                    currentEditDeck.length === 20 ? 'bg-emerald-950 text-emerald-300 border-emerald-500' : 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                  }`}>
                    {currentEditDeck.length} / 20枚
                  </div>
                </div>

                <div className="flex gap-2 mb-2.5">
                  <button
                    onClick={handleSortDeckByCost}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-400 rounded-lg text-xs font-bold text-amber-300 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>⚡ コスト順に整列</span>
                  </button>
                  <button
                    onClick={handleRevertChanges}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-rose-950/60 border border-slate-600 hover:border-rose-500 rounded-lg text-xs font-bold text-rose-300 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>↺ 元に戻す</span>
                  </button>
                </div>

                {deckWarnings.length > 0 && (
                  <div className="mb-2.5 p-2.5 rounded-lg bg-amber-950/80 border border-amber-500 text-xs text-amber-200 flex flex-col gap-1 shadow animate-pulse">
                    {deckWarnings.map((w, idx) => (
                      <div key={idx} className="leading-snug">{w}</div>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-2">
                  {currentEditDeck.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 text-sm">
                      左のカードプールからカードを追加してください
                    </div>
                  ) : (
                    currentEditDeck.map((card, idx) => {
                      const isBattle = card.type === 'battle';
                      const isSupport = card.type === 'support';
                      const isHumanSource = card.type === 'source' && (card as SourceCard).sourceKind === 'human';
                      const isCo2Source = card.type === 'source' && (card as SourceCard).sourceKind === 'co2';

                      let badgeStyle = 'bg-sky-950 text-sky-300 border border-sky-800';
                      let badgeLabel = 'みなもと';

                      if (isBattle) {
                        badgeStyle = 'bg-emerald-950 text-emerald-300 border border-emerald-700';
                        badgeLabel = `コスト:${(card as BattleCard).requiredCost} | 力:${(card as BattleCard).power}`;
                      } else if (isSupport) {
                        badgeStyle = 'bg-amber-950 text-amber-300 border border-amber-700';
                        badgeLabel = `人コスト:${(card as SupportCard).requiredHumanSources}`;
                      } else if (isHumanSource) {
                        badgeStyle = 'bg-amber-950/80 text-amber-300 border border-amber-500';
                        badgeLabel = '人のみなもと';
                      } else if (isCo2Source) {
                        badgeStyle = 'bg-rose-950/80 text-rose-300 border border-rose-600';
                        badgeLabel = 'CO2';
                      }

                      return (
                        <div
                          key={`${card.id}_${idx}`}
                          onClick={() => handleRemoveCardFromDeck(idx)}
                          onMouseDown={() => handleCardPressStart(card)}
                          onMouseUp={handleCardPressEnd}
                          onMouseLeave={handleCardPressEnd}
                          onTouchStart={() => handleCardPressStart(card)}
                          onTouchEnd={handleCardPressEnd}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500 hover:bg-rose-950/20 transition cursor-pointer flex items-center justify-between group shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xs text-slate-500 w-5 font-black">{idx + 1}</span>
                            <span className="font-bold text-slate-100 text-xs truncate max-w-[200px]">{card.name}</span>
                          </div>
                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${badgeStyle}`}>
                              {badgeLabel}
                            </span>
                            <span className="text-xs text-rose-400 opacity-0 group-hover:opacity-100 font-black transition">
                              外す ✖
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2">
                <div className="text-center font-black text-amber-400 text-xs flex items-center justify-center gap-1">
                  📜 ふっかつの じゅもん (デッキコード)
                </div>

                {jumonMessage && (
                  <div className="text-center text-xs text-emerald-300 font-bold bg-emerald-950/90 py-1.5 rounded-lg border border-emerald-600">
                    {jumonMessage}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="じゅもんを入力..."
                    value={jumonInput}
                    onChange={(e) => setJumonInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-600"
                  />
                  <button
                    onClick={handleImportJumon}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer shadow"
                  >
                    唱える
                  </button>
                </div>

                <button
                  onClick={handleExportJumon}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-200 font-black transition cursor-pointer shadow"
                >
                  📋 現在のデッキから「復活の呪文」を記録する
                </button>
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
              <div className={`max-w-md w-full bg-slate-900 border-2 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6 animate-in fade-in duration-300
                ${shieldNextPlayer === 'blue' ? 'border-sky-500' : 'border-rose-500'}
              `}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2
                  ${shieldNextPlayer === 'blue' ? 'bg-sky-950 border-sky-400' : 'bg-rose-950 border-rose-500'}
                `}>
                  🔄
                </div>
                <div>
                  <h2 className={`text-2xl font-black mb-2 ${shieldNextPlayer === 'blue' ? 'text-sky-400' : 'text-rose-400'}`}>
                    プレイヤー交代
                  </h2>
                  <p className="text-sm text-slate-300">
                    端末を【{shieldNextPlayer === 'blue' ? '青い地球' : '赤い地球'}プレイヤー】に渡してください。
                  </p>
                </div>
                <button
                  onClick={handleConfirmSwitch}
                  className={`w-full py-3 text-white font-black text-base rounded-xl shadow cursor-pointer transition ${
                    shieldNextPlayer === 'blue' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  画面を表示してターンを開始
                </button>
              </div>
            </div>
          )}

          {/* バトル初期計算モーダル */}
          {battleStep === 'initial' && initialBattleInfo && (
            <div className="absolute inset-0 bg-black/85 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="max-w-md w-full p-6 rounded-2xl border-2 border-sky-400 bg-slate-900 shadow-2xl flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in duration-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Battle Phase</span>
                  <h2 className="text-2xl font-black text-white mt-1">初期計算結果</h2>
                </div>
                
                <div className="flex items-center justify-center gap-8 my-2">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-sky-400 font-bold">青い地球</span>
                    <span className="text-4xl font-black text-sky-300">{initialBattleInfo.bluePower}</span>
                  </div>
                  <span className="text-2xl font-black text-slate-500">VS</span>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-rose-400 font-bold">赤い地球</span>
                    <span className="text-4xl font-black text-rose-300">{initialBattleInfo.redPower}</span>
                  </div>
                </div>

                <div className="text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 w-full leading-relaxed text-slate-300">
                  {initialBattleInfo.bluePower === initialBattleInfo.redPower ? (
                    <span>同点です！ルールに基づき【<b className="text-sky-400">青い地球</b>】からサポートカードの使用確認を行います。</span>
                  ) : (
                    <span>
                      現在、数値が低い【
                      <b className={initialBattleInfo.disadvantagedSide === 'blue' ? 'text-sky-400' : 'text-rose-400'}>
                        {initialBattleInfo.disadvantagedSide === 'blue' ? '青い地球' : '赤い地球'}
                      </b>
                      】が劣勢です！<br />
                      劣勢側からサポートカード（人のみなもと消費）で逆転・強化できます。
                    </span>
                  )}
                </div>

                <button
                  onClick={proceedToSupportConfirm}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-black text-sm rounded-xl shadow cursor-pointer transition"
                >
                  サポートカード確認へ進む ➔
                </button>
              </div>
            </div>
          )}

          {/* バトル最終結果モーダル */}
          {battleStep === 'result' && battleResultInfo && (
            <div className="absolute inset-0 bg-black/85 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="max-w-md w-full p-6 rounded-2xl border-2 border-amber-400 bg-slate-900 shadow-2xl flex flex-col items-center text-center gap-4">
                <h2 className="text-2xl font-black text-amber-400">バトルフェイズ結果</h2>
                <div className="flex items-center justify-center gap-8 my-2">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-sky-400 font-bold">青い地球</span>
                    <span className="text-4xl font-black text-sky-300">{battleResultInfo.bluePower}</span>
                  </div>
                  <span className="text-2xl font-black text-slate-500">VS</span>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-rose-400 font-bold">赤い地球</span>
                    <span className="text-4xl font-black text-rose-300">{battleResultInfo.redPower}</span>
                  </div>
                </div>

                <div className="text-sm bg-slate-950 p-3 rounded-lg border border-slate-800 w-full leading-relaxed">
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
                          <div className="text-base font-bold mb-1">
                            【<span className={winnerColor}>{winnerName}</span>】の勝利！
                          </div>
                          <div className="text-sm">
                            【<span className={`font-bold ${loserColor}`}>{loserName}</span>】に{' '}
                            <b className="text-rose-400 text-base">{battleResultInfo.diff}</b> 点のダメージ！
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            （【{loserName}】の対戦カードおよび付随サポートカードがすてふだへ。みなもとは場に復帰します）
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <button
                  onClick={startNextTurn}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm rounded-xl shadow cursor-pointer transition"
                >
                  次のターンへ進む（勝者が先攻）
                </button>
              </div>
            </div>
          )}

          {/* ナビゲーションバー */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex items-center justify-between shadow">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-extrabold text-base tracking-wider">ナビゲーション</span>
              <span className="text-slate-200 font-medium text-sm">➔ {navMessage}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsLogPanelOpen((prev) => !prev)}
                className={`text-xs px-3 py-1 rounded font-black transition cursor-pointer shadow flex items-center gap-1.5 ${
                  isLogPanelOpen
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-600/50'
                }`}
              >
                📜 対戦履歴 {battleLogs.length > 0 && `(${battleLogs.length})`}
              </button>
              <button
                onClick={openDeckBuilder}
                className="text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 px-3 py-1 rounded font-black transition cursor-pointer shadow flex items-center gap-1"
              >
                ⚙ デッキ編集
              </button>
              <div className="flex gap-2">
                <span className="bg-rose-950/80 border border-rose-600 px-3 py-0.5 rounded-full text-rose-300 font-bold">
                  赤い地球: {redLife}点
                </span>
                <span className="bg-sky-950/80 border border-sky-600 px-3 py-0.5 rounded-full text-sky-300 font-bold">
                  青い地球: {blueLife}点
                </span>
              </div>
              <button onClick={resetGame} className="text-[11px] bg-rose-700 hover:bg-rose-600 px-2.5 py-1 rounded font-semibold transition cursor-pointer">
                リセット
              </button>
            </div>
          </div>

          {/* 赤い地球エリア（上段） */}
          <div className={`flex-1 flex flex-col gap-1.5 p-2 rounded-xl border-2 transition-all min-h-0 relative
            ${isRedTurn ? 'border-rose-500 bg-rose-950/10 shadow-lg' : 'border-slate-800 bg-slate-950/50 opacity-70'}
            ${damagedSide === 'red' ? 'animate-shake ring-4 ring-rose-500 bg-rose-950/40' : ''}
          `}>
            <div className="h-28 flex gap-2">
              <div className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col items-center justify-center">
                <span className="font-bold text-slate-400 text-[10px]">山札 (赤)</span>
                <span className="text-lg font-black text-rose-400">{redDeck.length}枚</span>
              </div>
              
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>赤い地球の手札 ({redHand.length}枚)</span>
                  {isRedTurn ? <span className="text-rose-400">※カード長押しで詳細拡大 / すてふだへドラッグ可</span> : <span className="text-slate-500">🔒 相手手番中は非公開</span>}
                </div>
                <div className="flex gap-3 overflow-x-auto items-center h-full">
                  {redHand.map((card, idx) => {
                    if (!isRedTurn) {
                      return (
                        <div key={card.id || idx} className="w-16 aspect-[63/88] rounded overflow-hidden border border-rose-950 bg-gradient-to-br from-rose-950 via-slate-900 to-black shadow flex flex-col items-center justify-center flex-shrink-0 select-none opacity-80">
                          <span className="text-xs font-black text-rose-500/60">MY</span>
                          <span className="text-[9px] font-bold text-rose-400/50">EARTH</span>
                        </div>
                      );
                    }

                    if (card.type === 'battle') {
                      return (
                        <div
                          key={card.id}
                          draggable={activeTurn === 'red_main'}
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
                          className={`w-16 aspect-[63/88] rounded overflow-hidden border border-rose-900 shadow cursor-grab active:cursor-grabbing flex-shrink-0 card-hover-red
                            ${draggedCard?.id === card.id ? 'opacity-30 scale-95' : ''}
                          `}
                        >
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
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
                          className={`w-16 aspect-[63/88] rounded overflow-hidden border-2 shadow flex-shrink-0 relative flex flex-col items-center justify-center p-1 text-center card-hover-red cursor-grab active:cursor-grabbing
                            ${canActivate ? 'border-amber-400 bg-amber-950/40 animate-pulse' : 'border-slate-700 bg-slate-900 opacity-60'}
                            ${draggedCard?.id === supportCard.id ? 'opacity-30 scale-95' : ''}
                          `}
                        >
                          <span className="text-[9px] font-black text-amber-300">サポート</span>
                          <span className="text-[9px] font-bold text-white line-clamp-2 mt-1">{supportCard.name}</span>
                          <span className="text-[8px] text-amber-400 mt-1">人:{supportCard.requiredHumanSources}</span>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>

              <div
                onClick={() => setViewingGraveyardSide('red')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropGraveyard(e, 'red')}
                className={`w-24 border-2 rounded-lg p-1 flex flex-col items-center justify-center transition cursor-pointer hover:border-rose-400
                  ${draggedCard?.side === 'red' ? 'border-rose-500 border-dashed bg-rose-950/40' : 'border-slate-700 bg-slate-900 hover:bg-slate-800/80'}
                `}
              >
                <span className="font-bold text-slate-400 text-[10px] flex items-center gap-1">すてふだ 👁</span>
                <span className="text-base font-bold text-slate-300">{redGraveyard.length}枚</span>
              </div>
            </div>

            <div className="flex-1 flex gap-2 min-h-0">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropNewGroup(e, 'red')}
                className={`flex-1 rounded-lg p-2 flex flex-col border transition-all relative overflow-hidden ${
                  draggedCard?.side === 'red' && draggedCard?.type === 'battle' ? 'border-rose-400 border-dashed bg-rose-950/20' : 'border-slate-800 bg-slate-900/60'
                } ${isRedDominant ? 'shadow-[inset_0_0_20px_rgba(244,63,94,0.3)]' : ''}`}
              >
                {isRedDominant && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="ember-particle"
                        style={{
                          left: `${(i * 8.5) + 3}%`,
                          width: `${Math.random() * 6 + 4}px`,
                          height: `${Math.random() * 6 + 4}px`,
                          animationDuration: `${Math.random() * 2 + 2}s`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] font-bold text-rose-300 mb-1 z-10">
                  <span className="flex items-center gap-1.5">
                    <span>【赤い地球】対戦ゾーン</span>
                    {isRedDominant && <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-300 font-extrabold border border-rose-600 animate-pulse">🔥 優勢（温暖化進行中）</span>}
                  </span>
                  <span>総攻撃力: <span className="text-base font-black text-rose-400">{redTotalPower}</span></span>
                </div>

                <div className="flex-1 flex items-center justify-center gap-6 overflow-x-auto z-10">
                  {redGroups.length === 0 ? <span className="text-slate-600 text-xs">対戦カードなし</span> : redGroups.map((group, idx) => {
                    const power = calculateGroupPower(group);
                    const isChainable = draggedCard?.side === 'red' && draggedCard?.type === 'battle' && canChainToGroup(group, draggedCard as BattleCard, redCo2Sources.length);
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
                        onClick={() => handleGroupClick(group, 'red')}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropChain(e, 'red', group)}
                        className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer bg-slate-950 relative
                          ${isChainable ? 'border-yellow-400 ring-2 ring-yellow-400 scale-105' : ''}
                          ${isSupportTarget ? 'border-emerald-400 ring-4 ring-emerald-400/80 animate-pulse scale-105' : 'border-rose-900'}
                          ${isNewSummon ? 'animate-summon' : ''}
                          ${isRecentChain ? 'animate-chain-flash' : ''}
                          ${isRecentSupport ? 'animate-support-target' : ''}
                        `}
                      >
                        <span className="text-[10px] text-slate-400 font-bold mb-1">G{idx + 1} (力: {power})</span>
                        <div className="relative w-24 h-32 flex items-center justify-center">
                          {group.cards.map((card, cidx) => (
                            <div
                              key={card.id}
                              onMouseDown={() => handleCardPressStart(card)}
                              onMouseUp={handleCardPressEnd}
                              onMouseLeave={handleCardPressEnd}
                              onTouchStart={() => handleCardPressStart(card)}
                              onTouchEnd={handleCardPressEnd}
                              className="absolute w-24 aspect-[63/88] rounded overflow-hidden border border-rose-500 shadow-md card-hover-red"
                              style={{ top: `${cidx * 14}px`, zIndex: cidx + 1 }}
                            >
                              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col items-center gap-1 mt-2">
                          <span className="text-[9px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded">
                            CO2: {group.attachedSources.length}枚
                          </span>
                          {group.attachedSupports.map((att, aidx) => (
                            <div
                              key={`${att.card.id}_${aidx}`}
                              onMouseDown={() => handleCardPressStart(att.card)}
                              onMouseUp={handleCardPressEnd}
                              onMouseLeave={handleCardPressEnd}
                              className="text-[8px] bg-amber-950/90 text-amber-300 border border-amber-500 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                            >
                              <span>✨ {att.card.name}</span>
                              <span className="text-[7px] text-amber-400 font-bold">(人:{att.attachedHumanSources.length})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`w-48 bg-slate-900 border border-slate-700 rounded-lg p-2 flex flex-col justify-between transition-all ${
                chargedSourceSide === 'red' ? 'animate-source-charge border-rose-500 bg-rose-950/30' : ''
              }`}>
                <span className="text-center font-bold text-slate-400 text-[10px]">赤のみなもと</span>
                <div className="flex gap-2 flex-1 items-center justify-center my-1">
                  <div className="flex-1 flex flex-col items-center bg-rose-950/50 border border-rose-600 rounded p-1">
                    <span className="text-[10px] text-rose-300 font-bold">CO2</span>
                    <span className="text-lg font-black text-rose-200">{redCo2Sources.length}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center bg-amber-950/50 border border-amber-600 rounded p-1">
                    <span className="text-[10px] text-amber-300 font-bold">人</span>
                    <span className="text-lg font-black text-amber-200">{redHumanSources.length}</span>
                  </div>
                </div>
              </div>

              <div className="w-20 flex flex-col">
                {activeTurn === 'red_start' ? (
                  <button onClick={() => handleStartPhase('red')} className="w-full h-full bg-rose-600 hover:bg-rose-500 rounded-lg border border-rose-400 text-white font-black text-sm flex flex-col items-center justify-center cursor-pointer shadow hover:scale-102 transition">
                    <span>ド</span><span>ロ</span><span>｜</span>
                  </button>
                ) : activeTurn === 'red_main' ? (
                  <button onClick={() => handleEndTurn('red')} className="w-full h-full bg-amber-600 hover:bg-amber-500 rounded-lg border border-amber-400 text-slate-950 font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow hover:scale-102 transition">
                    <span>エ</span><span>ン</span><span>ド</span>
                  </button>
                ) : activeTurn === 'battle' && supportTurnSide === 'red' && battleStep === 'supporting' ? (
                  <button onClick={handlePassSupport} className="w-full h-full bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-500 text-white font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow hover:scale-102 transition">
                    <span>パ</span><span>ス</span>
                  </button>
                ) : (
                  <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center text-slate-600 text-[10px] text-center p-1">待機中</div>
                )}
              </div>
            </div>
          </div>

          {/* 青い地球エリア（下段） */}
          <div className={`flex-1 flex flex-col gap-1.5 p-2 rounded-xl border-2 transition-all min-h-0 relative
            ${isBlueTurn ? 'border-sky-500 bg-sky-950/10 shadow-lg' : 'border-slate-800 bg-slate-950/50 opacity-70'}
            ${damagedSide === 'blue' ? 'animate-shake ring-4 ring-sky-500 bg-sky-950/40' : ''}
          `}>
            <div className="flex-1 flex gap-2 min-h-0">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropNewGroup(e, 'blue')}
                className={`flex-1 rounded-lg p-2 flex flex-col border transition-all relative overflow-hidden ${
                  draggedCard?.side === 'blue' && draggedCard?.type === 'battle' ? 'border-sky-400 border-dashed bg-sky-950/20' : 'border-slate-800 bg-slate-900/60'
                } ${isBlueDominant ? 'shadow-[inset_0_0_20px_rgba(14,165,233,0.3)]' : ''}`}
              >
                {isBlueDominant && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="leaf-particle"
                        style={{
                          left: `${(i * 8.5) + 2}%`,
                          animationDuration: `${Math.random() * 2.5 + 3}s`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] font-bold text-sky-300 mb-1 z-10">
                  <span className="flex items-center gap-1.5">
                    <span>【青い地球】対戦ゾーン</span>
                    {isBlueDominant && <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 font-extrabold border border-emerald-500 animate-pulse">🌿 優勢（生態系保全）</span>}
                  </span>
                  <span>総攻撃力: <span className="text-base font-black text-sky-400">{blueTotalPower}</span></span>
                </div>

                <div className="flex-1 flex items-center justify-center gap-6 overflow-x-auto z-10">
                  {blueGroups.length === 0 ? <span className="text-slate-600 text-xs">対戦カードなし</span> : blueGroups.map((group, idx) => {
                    const power = calculateGroupPower(group);
                    const isChainable = draggedCard?.side === 'blue' && draggedCard?.type === 'battle' && canChainToGroup(group, draggedCard as BattleCard, blueSeaSources.length);
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
                        onClick={() => handleGroupClick(group, 'blue')}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropChain(e, 'blue', group)}
                        className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer bg-slate-950 relative
                          ${isChainable ? 'border-yellow-400 ring-2 ring-yellow-400 scale-105' : ''}
                          ${isSupportTarget ? 'border-emerald-400 ring-4 ring-emerald-400/80 animate-pulse scale-105' : 'border-sky-900'}
                          ${isNewSummon ? 'animate-summon' : ''}
                          ${isRecentChain ? 'animate-chain-flash' : ''}
                          ${isRecentSupport ? 'animate-support-target' : ''}
                        `}
                      >
                        <span className="text-[10px] text-slate-400 font-bold mb-1">G{idx + 1} (力: {power})</span>
                        <div className="relative w-24 h-32 flex items-center justify-center">
                          {group.cards.map((card, cidx) => (
                            <div
                              key={card.id}
                              onMouseDown={() => handleCardPressStart(card)}
                              onMouseUp={handleCardPressEnd}
                              onMouseLeave={handleCardPressEnd}
                              onTouchStart={() => handleCardPressStart(card)}
                              onTouchEnd={handleCardPressEnd}
                              className="absolute w-24 aspect-[63/88] rounded overflow-hidden border border-emerald-400 shadow-md card-hover-blue"
                              style={{ top: `${cidx * 14}px`, zIndex: cidx + 1 }}
                            >
                              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col items-center gap-1 mt-2">
                          <span className="text-[9px] text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded">
                            海: {group.attachedSources.length}枚
                          </span>
                          {group.attachedSupports.map((att, aidx) => (
                            <div
                              key={`${att.card.id}_${aidx}`}
                              onMouseDown={() => handleCardPressStart(att.card)}
                              onMouseUp={handleCardPressEnd}
                              onMouseLeave={handleCardPressEnd}
                              className="text-[8px] bg-amber-950/90 text-amber-300 border border-amber-500 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                            >
                              <span>✨ {att.card.name}</span>
                              <span className="text-[7px] text-amber-400 font-bold">(人:{att.attachedHumanSources.length})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`w-48 bg-slate-900 border border-slate-700 rounded-lg p-2 flex flex-col justify-between transition-all ${
                chargedSourceSide === 'blue' ? 'animate-source-charge border-sky-400 bg-sky-950/30' : ''
              }`}>
                <span className="text-center font-bold text-slate-400 text-[10px]">青のみなもと</span>
                <div className="flex gap-2 flex-1 items-center justify-center my-1">
                  <div className="flex-1 flex flex-col items-center bg-sky-950/50 border border-sky-600 rounded p-1">
                    <span className="text-[10px] text-sky-300 font-bold">海</span>
                    <span className="text-lg font-black text-sky-200">{blueSeaSources.length}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center bg-amber-950/50 border border-amber-600 rounded p-1">
                    <span className="text-[10px] text-amber-300 font-bold">人</span>
                    <span className="text-lg font-black text-amber-200">{blueHumanSources.length}</span>
                  </div>
                </div>
              </div>

              <div className="w-20 flex flex-col">
                {activeTurn === 'blue_start' ? (
                  <button onClick={() => handleStartPhase('blue')} className="w-full h-full bg-emerald-600 hover:bg-emerald-500 rounded-lg border border-emerald-400 text-white font-black text-sm flex flex-col items-center justify-center cursor-pointer shadow hover:scale-102 transition">
                    <span>ド</span><span>ロ</span><span>｜</span>
                  </button>
                ) : activeTurn === 'blue_main' ? (
                  <button onClick={() => handleEndTurn('blue')} className="w-full h-full bg-amber-600 hover:bg-amber-500 rounded-lg border border-amber-400 text-slate-950 font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow hover:scale-102 transition">
                    <span>エ</span><span>ン</span><span>ド</span>
                  </button>
                ) : activeTurn === 'battle' && supportTurnSide === 'blue' && battleStep === 'supporting' ? (
                  <button onClick={handlePassSupport} className="w-full h-full bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-500 text-white font-black text-xs flex flex-col items-center justify-center cursor-pointer shadow hover:scale-102 transition">
                    <span>パ</span><span>ス</span>
                  </button>
                ) : (
                  <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center text-slate-600 text-[10px] text-center p-1">待機中</div>
                )}
              </div>
            </div>

            <div className="h-28 flex gap-2">
              <div
                onClick={() => setViewingGraveyardSide('blue')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropGraveyard(e, 'blue')}
                className={`w-24 border-2 rounded-lg p-1 flex flex-col items-center justify-center transition cursor-pointer hover:border-sky-400
                  ${draggedCard?.side === 'blue' ? 'border-rose-500 border-dashed bg-rose-950/40' : 'border-slate-700 bg-slate-900 hover:bg-slate-800/80'}
                `}
              >
                <span className="font-bold text-slate-400 text-[10px] flex items-center gap-1">すてふだ 👁</span>
                <span className="text-base font-bold text-slate-300">{blueGraveyard.length}枚</span>
              </div>

              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>青い地球の手札 ({blueHand.length}枚)</span>
                  {isBlueTurn ? <span className="text-emerald-400">※カード長押しで詳細拡大 / すてふだへドラッグ可</span> : <span className="text-slate-500">🔒 相手手番中は非公開</span>}
                </div>
                <div className="flex gap-3 overflow-x-auto items-center h-full">
                  {blueHand.map((card, idx) => {
                    if (!isBlueTurn) {
                      return (
                        <div key={card.id || idx} className="w-16 aspect-[63/88] rounded overflow-hidden border border-sky-950 bg-gradient-to-br from-sky-950 via-slate-900 to-black shadow flex flex-col items-center justify-center flex-shrink-0 select-none opacity-80">
                          <span className="text-xs font-black text-sky-500/60">MY</span>
                          <span className="text-[9px] font-bold text-sky-400/50">EARTH</span>
                        </div>
                      );
                    }

                    if (card.type === 'battle') {
                      return (
                        <div
                          key={card.id}
                          draggable={activeTurn === 'blue_main'}
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
                          className={`w-16 aspect-[63/88] rounded overflow-hidden border border-slate-600 shadow cursor-grab active:cursor-grabbing flex-shrink-0 card-hover-blue
                            ${draggedCard?.id === card.id ? 'opacity-30 scale-95' : ''}
                          `}
                        >
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
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
                          className={`w-16 aspect-[63/88] rounded overflow-hidden border-2 shadow flex-shrink-0 relative flex flex-col items-center justify-center p-1 text-center card-hover-blue cursor-grab active:cursor-grabbing
                            ${canActivate ? 'border-amber-400 bg-amber-950/40 animate-pulse' : 'border-slate-700 bg-slate-900 opacity-60'}
                            ${draggedCard?.id === supportCard.id ? 'opacity-30 scale-95' : ''}
                          `}
                        >
                          <span className="text-[9px] font-black text-amber-300">サポート</span>
                          <span className="text-[9px] font-bold text-white line-clamp-2 mt-1">{supportCard.name}</span>
                          <span className="text-[8px] text-amber-400 mt-1">人:{supportCard.requiredHumanSources}</span>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>

              <div className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-1 flex flex-col items-center justify-center">
                <span className="font-bold text-slate-400 text-[10px]">山札 (青)</span>
                <span className="text-lg font-black text-sky-400">{blueDeck.length}枚</span>
              </div>
            </div>
          </div>

          {/* バトルログ（対戦履歴）スライド展開パネル */}
          {isLogPanelOpen && (
            <div className="absolute right-3 bottom-14 w-96 max-h-[550px] bg-slate-900/95 border-2 border-sky-500 rounded-2xl shadow-2xl flex flex-col z-30 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
              <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-800 bg-slate-950/80 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-base">📜</span>
                  <span className="font-black text-sm text-white">対戦履歴ログ</span>
                  <span className="text-[10px] text-slate-400">（全 {battleLogs.length} 件）</span>
                </div>
                <button
                  onClick={() => setIsLogPanelOpen(false)}
                  className="text-slate-400 hover:text-white font-black text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[220px] max-h-[460px]">
                {battleLogs.length === 0 ? (
                  <div className="text-center text-slate-500 py-12 text-xs">
                    履歴はまだありません
                  </div>
                ) : (
                  battleLogs.map((log) => {
                    let borderCol = 'border-slate-800 bg-slate-950/60 text-slate-300';
                    let badgeBg = 'bg-slate-800 text-slate-300';

                    if (log.category === 'summon') {
                      badgeBg = log.side === 'blue' ? 'bg-sky-900 text-sky-300' : 'bg-rose-900 text-rose-300';
                      borderCol = log.side === 'blue' ? 'border-sky-900/50 bg-sky-950/20 text-sky-200' : 'border-rose-900/50 bg-rose-950/20 text-rose-200';
                    } else if (log.category === 'chain') {
                      badgeBg = 'bg-amber-900 text-amber-300';
                      borderCol = 'border-amber-900/50 bg-amber-950/20 text-amber-200';
                    } else if (log.category === 'support') {
                      badgeBg = 'bg-emerald-900 text-emerald-300';
                      borderCol = 'border-emerald-900/50 bg-emerald-950/20 text-emerald-200';
                    } else if (log.category === 'battle' || log.category === 'damage') {
                      badgeBg = 'bg-purple-900 text-purple-300';
                      borderCol = 'border-purple-900/50 bg-purple-950/20 text-purple-200';
                    }

                    const timeStr = log.timestamp.toTimeString().substring(0, 8);

                    return (
                      <div
                        key={log.id}
                        className={`p-2 rounded-lg border text-xs leading-relaxed flex flex-col gap-1 ${borderCol}`}
                      >
                        <div className="flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-400">T{log.turnNumber}</span>
                            <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] ${badgeBg}`}>
                              {log.category.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500">{timeStr}</span>
                        </div>
                        <div className="font-medium break-words">{log.message}</div>
                      </div>
                    );
                  })
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