---
"@bcl32/utils": patch
---

fix(utils): `useIsMobile` resolves on the first render instead of flashing desktop

The hook seeded its state from `undefined` and filled it in from an effect, so
every consumer got `false` on the first render regardless of the actual viewport
and then re-rendered a frame later. Anything that *swaps layout* on the mobile
branch (rather than just hiding something) showed that as a visible flash and
reflow. The width is now read synchronously in the `useState` initializer,
guarded for a missing `window`; the `matchMedia` subscription is unchanged and
re-reads on mount so a resize between render and effect can't be missed.
