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
        settings?: {
          muteAudio?: boolean;
        };
        addSettingsChangeListener?: (listener: (settings: { muteAudio?: boolean }) => void) => void;
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

/** Set to true once the game is upgraded from CrazyGames Basic Launch to monetized ads. */
export const CG_ADS_ENABLED = false;

let gameplayRunning = false;
let lastMidgameAt = 0;
const MIDGAME_COOLDOWN_MS = 180_000;

export function isCrazyGamesEnv(): boolean {
  try {
    if (location.search.includes('crazygames=1')) return true;
    const sdk = win.CrazyGames?.SDK;
    if (sdk?.environment && sdk.environment !== 'disabled') return true;
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

export function cgBindAudioMuteListener(onMuteChange: (muted: boolean) => void): void {
  try {
    const game = win.CrazyGames?.SDK?.game;
    if (!game) return;
    if (typeof game.settings?.muteAudio === 'boolean') {
      onMuteChange(game.settings.muteAudio);
    }
    game.addSettingsChangeListener?.((settings) => {
      if (typeof settings?.muteAudio === 'boolean') {
        onMuteChange(settings.muteAudio);
      }
    });
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
  if (!CG_ADS_ENABLED || !sdk?.ad || sdk.environment === 'disabled') {
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
  if (!CG_ADS_ENABLED || !sdk?.ad || sdk.environment === 'disabled') {
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
