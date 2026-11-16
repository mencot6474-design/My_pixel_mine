type AdCallback = () => void;

interface CrazyGamesSDKWindow extends Window {
  CrazyGames?: {
    SDK?: {
      environment?: string;
      init: () => Promise<void>;
      game?: {
        loadingStart: () => void;
        loadingStop: () => void;
        gameplayStart: () => void;
        gameplayStop: () => void;
        happytime: () => void;
      };
      ad?: {
        requestAd: (
          type: 'rewarded' | 'midgame',
          cbs: {
            adStarted?: () => void;
            adFinished?: () => void;
            adError?: (err: unknown) => void;
          }
        ) => void;
      };
    };
  };
}

const win = window as CrazyGamesSDKWindow;

let sdkReady = false;
let gameplayRunning = false;
let lastMidgameAt = 0;
const MIDGAME_COOLDOWN_MS = 180_000;

export function isCrazyGamesEnv(): boolean {
  try {
    if (location.search.includes('crazygames=1')) return true;
    const sdk = win.CrazyGames?.SDK;
    if (sdk && sdk.environment === 'crazygames') return true;
    if (window.self !== window.top && document.referrer.includes('crazygames')) return true;
  } catch {
    // ignore cross-origin check failures
  }
  return false;
}

export async function cgInit(): Promise<void> {
  const sdk = win.CrazyGames?.SDK;
  if (!sdk || sdk.environment === 'disabled') return;
  try {
    await Promise.race([
      sdk.init(),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
    ]);
    if (sdk.environment && sdk.environment !== 'disabled') {
      sdkReady = true;
    }
  } catch {
    // safe fallback outside CrazyGames portal
  }
}

export function cgLoadingStart(): void {
  try {
    win.CrazyGames?.SDK?.game?.loadingStart();
  } catch {
    // ignore
  }
}

export function cgLoadingStop(): void {
  try {
    win.CrazyGames?.SDK?.game?.loadingStop();
  } catch {
    // ignore
  }
}

export function cgGameplayStart(): void {
  if (gameplayRunning) return;
  try {
    gameplayRunning = true;
    win.CrazyGames?.SDK?.game?.gameplayStart();
  } catch {
    // ignore
  }
}

export function cgGameplayStop(): void {
  if (!gameplayRunning) return;
  try {
    gameplayRunning = false;
    win.CrazyGames?.SDK?.game?.gameplayStop();
  } catch {
    // ignore
  }
}

export function cgHappyTime(): void {
  try {
    win.CrazyGames?.SDK?.game?.happytime();
  } catch {
    // ignore
  }
}

export function cgRequestRewardedAd(
  onReward: AdCallback,
  onUnavailable?: AdCallback,
  setAudioMuted?: (muted: boolean) => void
): boolean {
  const sdk = win.CrazyGames?.SDK;
  if (!sdk?.ad || sdk.environment === 'disabled' || (!sdkReady && !isCrazyGamesEnv())) {
    onUnavailable?.();
    return false;
  }

  const wasRunning = gameplayRunning;
  const restore = () => {
    lastMidgameAt = Date.now();
    setAudioMuted?.(false);
    if (wasRunning) cgGameplayStart();
  };

  try {
    sdk.ad.requestAd('rewarded', {
      adStarted: () => {
        setAudioMuted?.(true);
        if (wasRunning) cgGameplayStop();
      },
      adFinished: () => {
        restore();
        onReward();
      },
      adError: () => {
        restore();
        onUnavailable?.();
      },
    });
    return true;
  } catch {
    restore();
    onUnavailable?.();
    return false;
  }
}

export function cgTryMidgameAd(onDone: AdCallback, setAudioMuted?: (muted: boolean) => void): void {
  const sdk = win.CrazyGames?.SDK;
  if (!sdk?.ad || !sdkReady || !isCrazyGamesEnv()) {
    onDone();
    return;
  }
  if (lastMidgameAt && Date.now() - lastMidgameAt < MIDGAME_COOLDOWN_MS) {
    onDone();
    return;
  }

  const wasRunning = gameplayRunning;
  const finish = () => {
    lastMidgameAt = Date.now();
    setAudioMuted?.(false);
    if (wasRunning) cgGameplayStart();
    onDone();
  };

  try {
    sdk.ad.requestAd('midgame', {
      adStarted: () => {
        setAudioMuted?.(true);
        if (wasRunning) cgGameplayStop();
      },
      adFinished: finish,
      adError: finish,
    });
  } catch {
    finish();
  }
}
