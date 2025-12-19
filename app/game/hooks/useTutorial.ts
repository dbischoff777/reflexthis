'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { GameMode } from '@/lib/gameModes';
import { TutorialOverlay, type TutorialStep } from '@/components/TutorialOverlay';
import { t, type Language } from '@/lib/i18n';

interface UseTutorialOptions {
  language: Language;
  pauseGameAndClearState: () => void;
  startGameplay: () => void;
  resumeGame: () => void;
  gameOver: boolean;
  highlightedButtons: number[];
  isProcessingRef: React.MutableRefObject<boolean>;
  highlightNewButtons: () => void;
}

export function useTutorial({
  language,
  pauseGameAndClearState,
  startGameplay,
  resumeGame,
  gameOver,
  highlightedButtons,
  isProcessingRef,
  highlightNewButtons,
}: UseTutorialOptions) {
  const [tutorialMode, setTutorialMode] = useState<GameMode | null>(null);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(false);
  const [pendingStartAfterTutorial, setPendingStartAfterTutorial] = useState(false);
  const [resumeAfterTutorial, setResumeAfterTutorial] = useState(false);
  const [tutorialCompletion, setTutorialCompletion] = useState<Record<GameMode, boolean>>({
    reflex: false,
    sequence: false,
    survival: false,
    nightmare: false,
    oddOneOut: false,
  });
  const [tutorialLoaded, setTutorialLoaded] = useState(false);

  const tutorialStorageKey = useCallback((mode: GameMode) => `rt_tutorial_done_${mode}_v1`, []);

  const tutorialStepsByMode: Record<GameMode, TutorialStep[]> = useMemo(
    () => ({
      reflex: [
        {
          id: 'reflex-1',
          title: t(language, 'tutorial.reflex.1.title'),
          body: t(language, 'tutorial.reflex.1.body'),
        },
        {
          id: 'reflex-2',
          title: t(language, 'tutorial.reflex.2.title'),
          body: t(language, 'tutorial.reflex.2.body'),
          callout: t(language, 'tutorial.reflex.2.callout'),
        },
        {
          id: 'reflex-3',
          title: t(language, 'tutorial.reflex.3.title'),
          body: t(language, 'tutorial.reflex.3.body'),
        },
        {
          id: 'reflex-4',
          title: t(language, 'tutorial.reflex.4.title'),
          body: t(language, 'tutorial.reflex.4.body'),
          callout: t(language, 'tutorial.reflex.4.callout'),
        },
      ],
      sequence: [
        {
          id: 'sequence-1',
          title: t(language, 'tutorial.sequence.1.title'),
          body: t(language, 'tutorial.sequence.1.body'),
        },
        {
          id: 'sequence-2',
          title: t(language, 'tutorial.sequence.2.title'),
          body: t(language, 'tutorial.sequence.2.body'),
          callout: t(language, 'tutorial.sequence.2.callout'),
        },
        {
          id: 'sequence-3',
          title: t(language, 'tutorial.sequence.3.title'),
          body: t(language, 'tutorial.sequence.3.body'),
        },
      ],
      survival: [
        {
          id: 'survival-1',
          title: t(language, 'tutorial.survival.1.title'),
          body: t(language, 'tutorial.survival.1.body'),
        },
        {
          id: 'survival-2',
          title: t(language, 'tutorial.survival.2.title'),
          body: t(language, 'tutorial.survival.2.body'),
        },
        {
          id: 'survival-3',
          title: t(language, 'tutorial.survival.3.title'),
          body: t(language, 'tutorial.survival.3.body'),
        },
        {
          id: 'survival-4',
          title: t(language, 'tutorial.survival.4.title'),
          body: t(language, 'tutorial.survival.4.body'),
        },
      ],
      nightmare: [
        {
          id: 'nightmare-1',
          title: t(language, 'tutorial.nightmare.1.title'),
          body: t(language, 'tutorial.nightmare.1.body'),
        },
        {
          id: 'nightmare-2',
          title: t(language, 'tutorial.nightmare.2.title'),
          body: t(language, 'tutorial.nightmare.2.body'),
        },
        {
          id: 'nightmare-3',
          title: t(language, 'tutorial.nightmare.3.title'),
          body: t(language, 'tutorial.nightmare.3.body'),
        },
        {
          id: 'nightmare-4',
          title: t(language, 'tutorial.nightmare.4.title'),
          body: t(language, 'tutorial.nightmare.4.body'),
        },
      ],
      oddOneOut: [
        {
          id: 'odd-1',
          title: t(language, 'tutorial.odd.1.title'),
          body: t(language, 'tutorial.odd.1.body'),
        },
        {
          id: 'odd-2',
          title: t(language, 'tutorial.odd.2.title'),
          body: t(language, 'tutorial.odd.2.body'),
          callout: t(language, 'tutorial.odd.2.callout'),
        },
        {
          id: 'odd-3',
          title: t(language, 'tutorial.odd.3.title'),
          body: t(language, 'tutorial.odd.3.body'),
        },
        {
          id: 'odd-4',
          title: t(language, 'tutorial.odd.4.title'),
          body: t(language, 'tutorial.odd.4.body'),
        },
      ],
    }),
    [language]
  );

  // Load tutorial completion flags from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const map: Record<GameMode, boolean> = {
      reflex: localStorage.getItem(tutorialStorageKey('reflex')) === 'true',
      sequence: localStorage.getItem(tutorialStorageKey('sequence')) === 'true',
      survival: localStorage.getItem(tutorialStorageKey('survival')) === 'true',
      nightmare: localStorage.getItem(tutorialStorageKey('nightmare')) === 'true',
      oddOneOut: localStorage.getItem(tutorialStorageKey('oddOneOut')) === 'true',
    };
    setTutorialCompletion(map);
    setTutorialLoaded(true);
  }, [tutorialStorageKey]);

  const markTutorialDone = useCallback(
    (mode: GameMode) => {
      setTutorialCompletion((prev) => ({ ...prev, [mode]: true }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(tutorialStorageKey(mode), 'true');
      }
    },
    [tutorialStorageKey]
  );

  const openTutorial = useCallback(
    (mode: GameMode, autoStartAfter = false, resumeAfter = false) => {
      setTutorialMode(mode);
      setTutorialStepIndex(0);
      setShowTutorialOverlay(true);
      setPendingStartAfterTutorial(autoStartAfter);
      setResumeAfterTutorial(resumeAfter);
      if (resumeAfter) {
        pauseGameAndClearState();
      }
    },
    [pauseGameAndClearState]
  );

  const handleTutorialFinish = useCallback(
    (remember: boolean) => {
      if (!tutorialMode) return;
      if (remember) {
        markTutorialDone(tutorialMode);
      }
      setShowTutorialOverlay(false);
      setTutorialMode(null);
      const shouldStart = pendingStartAfterTutorial;
      const shouldResume = resumeAfterTutorial;
      setPendingStartAfterTutorial(false);
      setResumeAfterTutorial(false);

      if (shouldStart) {
        startGameplay();
      } else if (shouldResume) {
        resumeGame();
        // If nothing highlighted, kick off next highlight after resuming
        if (!gameOver && highlightedButtons.length === 0 && !isProcessingRef.current) {
          highlightNewButtons();
        }
      }
    },
    [
      tutorialMode,
      markTutorialDone,
      pendingStartAfterTutorial,
      resumeAfterTutorial,
      startGameplay,
      resumeGame,
      gameOver,
      highlightedButtons,
      isProcessingRef,
      highlightNewButtons,
    ]
  );

  return {
    tutorialMode,
    tutorialStepIndex,
    setTutorialStepIndex,
    showTutorialOverlay,
    tutorialCompletion,
    tutorialLoaded,
    tutorialStepsByMode,
    openTutorial,
    handleTutorialFinish,
  };
}

