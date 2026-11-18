type AdCallback = () => void;

export interface AdLifecycleHandlers {
  setPaused?: (paused: boolean) => void;
  setAudioMuted?: (muted: boolean) => void;
}

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

type CrazyGamesSDKInstance = NonNullable<NonNullable<CrazyGamesSDKWindow['CrazyGames']>['SDK']>;

/** Set to true once the game is upgraded from CrazyGames Basic Launch to monetized ads. */
export const CG_ADS_ENABLED = false;

let gameplayRunning = false;
let adPlaying = false;
let lastMidgameAt = 0;
let adLifecycle: AdLifecycleHandlers = {};
let initializedSdkRef: CrazyGamesSDKInstance | null = null;
const MIDGAME_COOLDOWN_MS = 180_000;

function getRawCrazyGamesSdk(): CrazyGamesSDKInstance | null {
  if (typeof window === 'undefined') return null;
  try {
    const sdk = (window as CrazyGamesSDKWindow).CrazyGames?.SDK;
    if (!sdk || sdk.environment === 'disabled') return null;
    return sdk;
  } catch {
    return null;
  }
}

function getCrazyGamesSdk(): CrazyGamesSDKInstance | null {
  const sdk = getRawCrazyGamesSdk();
  if (!sdk || initializedSdkRef !== sdk) return null;
  return sdk;
}

export function isAdPlaying(): boolean {
  return adPlaying;
}

export function cgBindAdLifecycle(handlers: AdLifecycleHandlers): void {
  adLifecycle = handlers;
}

export function isCrazyGamesEnv(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (location.search.includes('crazygames=1')) return true;
    if (getCrazyGamesSdk()) return true;
    if (window.self !== window.top && document.referrer.includes('crazygames')) return true;
  } catch {
    // ignore cross-origin check failures
  }
  return false;
}

export async function cgInit(): Promise<void> {
  const sdk = getRawCrazyGamesSdk();
  initializedSdkRef = null;
  if (!sdk) return;
  let timerId: number | undefined;
  try {
    const initTask = Promise.resolve(sdk.init()).then(
      () => {
        try {
          initializedSdkRef = sdk.environment !== 'disabled' ? sdk : null;
        } catch {
          initializedSdkRef = null;
        }
      },
      () => {
        initializedSdkRef = null;
      }
    );
    const timeoutTask = new Promise<void>((resolve) => {
      timerId = window.setTimeout(resolve, 1500);
    });
    await Promise.race([initTask, timeoutTask]);
  } catch {
    initializedSdkRef = null;
  } finally {
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
    }
  }
}

export function cgLoadingStart(): void {
  try {
    const sdk = getCrazyGamesSdk();
    sdk?.game?.loadingStart();
  } catch {
    // ignore
  }
}

export function cgLoadingStop(): void {
  try {
    const sdk = getCrazyGamesSdk();
    sdk?.game?.loadingStop();
  } catch {
    // ignore
  }
}

export function cgGameplayStart(): void {
  if (gameplayRunning) return;
  gameplayRunning = true;
  try {
    const sdk = getCrazyGamesSdk();
    sdk?.game?.gameplayStart();
  } catch {
    // ignore
  }
}

export function cgGameplayStop(): void {
  if (!gameplayRunning) return;
  gameplayRunning = false;
  try {
    const sdk = getCrazyGamesSdk();
    sdk?.game?.gameplayStop();
  } catch {
    // ignore
  }
}

export function cgHappyTime(): void {
  try {
    const sdk = getCrazyGamesSdk();
    sdk?.game?.happytime();
  } catch {
    // ignore
  }
}

export function cgBindAudioMuteListener(onMuteChange: (muted: boolean) => void): void {
  try {
    const sdk = getCrazyGamesSdk();
    const game = sdk?.game;
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

function dispatchAdRequest(
  type: 'rewarded' | 'midgame',
  onSuccess: AdCallback,
  onFallback: AdCallback,
  setAudioMuted?: (muted: boolean) => void
): boolean {
  let adApi: NonNullable<CrazyGamesSDKInstance['ad']> | undefined;
  try {
    const sdk = getCrazyGamesSdk();
    adApi = sdk?.ad;
  } catch {
    adApi = undefined;
  }
  if (!CG_ADS_ENABLED || !adApi || adPlaying) {
    onFallback();
    return false;
  }

  const wasRunning = gameplayRunning;
  let settled = false;

  const setAdActiveState = (active: boolean): void => {
    adPlaying = active;
    adLifecycle.setPaused?.(active);
    adLifecycle.setAudioMuted?.(active);
    setAudioMuted?.(active);
  };

  const restore = (): boolean => {
    if (settled) return false;
    settled = true;
    lastMidgameAt = Date.now();
    setAdActiveState(false);
    if (wasRunning && (typeof document === 'undefined' || !document.hidden)) {
      cgGameplayStart();
    }
    return true;
  };

  try {
    adApi.requestAd(type, {
      adStarted: () => {
        if (settled) return;
        setAdActiveState(true);
        if (wasRunning) cgGameplayStop();
      },
      adFinished: () => {
        if (restore()) onSuccess();
      },
      adError: () => {
        if (restore()) onFallback();
      },
    });
    return true;
  } catch {
    if (restore()) onFallback();
    return false;
  }
}

export function cgRequestRewardedAd(
  onReward: AdCallback,
  onUnavailable?: AdCallback,
  setAudioMuted?: (muted: boolean) => void
): boolean {
  return dispatchAdRequest('rewarded', onReward, () => onUnavailable?.(), setAudioMuted);
}

export function cgTryMidgameAd(onDone: AdCallback, setAudioMuted?: (muted: boolean) => void): void {
  if (lastMidgameAt && Date.now() - lastMidgameAt < MIDGAME_COOLDOWN_MS) {
    onDone();
    return;
  }
  dispatchAdRequest('midgame', onDone, onDone, setAudioMuted);
}
