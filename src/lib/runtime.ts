// Small runtime flags. `isWeb` is used to skip phone-only behaviour in the
// browser preview without pulling in any native module.
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS !== 'web';
