// Vitest 3.x types custom matchers via module augmentation on 'vitest' (the older
// `Vi.Assertion` namespace that vitest-axe ships is not merged). Register the
// axe matcher's type here so `toHaveNoViolations()` typechecks.
import 'vitest';

declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
