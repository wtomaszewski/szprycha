import { Capacitor, registerPlugin } from '@capacitor/core';
import type { NativeSpeech } from '../audio/Narrator';

export const nativeSpeech = Capacitor.isNativePlatform()
  ? registerPlugin<NativeSpeech>('LocalSpeech')
  : undefined;
