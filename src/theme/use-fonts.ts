// Imported from per-weight entry points, not the package barrel.
// `@expo-google-fonts/inter` re-exports every weight and italic, and importing
// the barrel makes Metro treat all 26 font files as reachable assets — roughly
// 9MB of thin, extra-light and italic faces this app never renders. These
// subpath imports pull in exactly the six the type scale uses.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_500Medium } from '@expo-google-fonts/lora/500Medium';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { useFonts } from 'expo-font';

/**
 * Loads the six brand faces (task 0.11).
 *
 * Returns `true` once they are ready. Render nothing until then: text laid out
 * in a fallback face and then reflowed into Lora is a visible jump on launch.
 */
export function useBrandFonts(): boolean {
  const [loaded] = useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  return loaded;
}
