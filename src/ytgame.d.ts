/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

declare namespace ytgame {
  export const enum SdkErrorType {
    UNKNOWN,
    API_UNAVAILABLE,
    INVALID_PARAMS,
    SIZE_LIMIT_EXCEEDED,
  }

  export class SdkError extends Error {
    errorType: SdkErrorType;
  }

  export const SDK_VERSION: string;
  export const IN_PLAYABLES_ENV: boolean;
}

declare namespace ytgame.ads {
  export function requestInterstitialAd(): Promise<void>;
  export function requestRewardedAd(rewardId: string): Promise<boolean>;

  export const enum AdResult {
    UNKNOWN,
    SHOWED,
    DISMISSED,
    REJECTED,
  }

  export function requestAd(): Promise<AdResult>;
}

declare namespace ytgame.engagement {
  export interface Score {
    value: number;
  }

  export function sendScore(score: Score): Promise<void>;

  export const enum ContentType {
    VIDEO,
    PLAYABLE,
  }

  export interface Content {
    id: string;
    contentType?: ContentType;
  }

  export function openYTContent(content: Content): Promise<void>;
}

declare namespace ytgame.game {
  export function firstFrameReady(): void;
  export function gameReady(): void;
  export function loadData(): Promise<string>;
  export function saveData(data: string): Promise<void>;
  export function shareInviteCode(inviteCode: string): Promise<void>;

  export interface GameData {
    getInviteCode: () => string;
    hasInviteCode: () => boolean;
  }

  export function onGameDataAvailable(
    callback: (gameData: GameData) => void,
  ): VoidFunction;
}

declare namespace ytgame.health {
  export function logError(): void;
  export function logWarning(): void;
}

declare namespace ytgame.system {
  export function isAudioEnabled(): boolean;
  export function onAudioEnabledChange(
    callback: (isAudioEnabled: boolean) => void,
  ): () => void;
  export function onPause(callback: () => void): () => void;
  export function onResume(callback: () => void): () => void;
  export function getLanguage(): Promise<string>;
}
