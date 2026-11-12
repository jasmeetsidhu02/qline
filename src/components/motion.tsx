import { ReactNode } from "react";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

// Motion in QLine is there to show what changed — a row joining the line, a
// screen arriving — never as decoration. One entrance per screen, staggered,
// and nothing that moves on its own afterwards.
//
// Everything here respects the phone's "reduce motion" setting: when it is
// on, the same content appears with no movement at all.

const DURATION = 420;

/**
 * A whole screen arriving. Expo Router's stack animations do not run on the
 * web build, where a route change swaps the two screens in one frame and
 * shows an empty one in between — which is what makes the app feel like a
 * set of documents rather than one piece of software. Fading each screen in
 * covers that gap on every platform.
 */
export function Page({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      className={className ?? "flex-1"}
      entering={reduced ? FadeIn.duration(1) : FadeIn.duration(280)}
    >
      {children}
    </Animated.View>
  );
}

/** Fades up into place. Give blocks increasing delays to stagger a screen. */
export function Appear({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      className={className}
      entering={
        reduced
          ? FadeIn.duration(1)
          : FadeInDown.duration(DURATION).delay(delay).springify().damping(20)
      }
    >
      {children}
    </Animated.View>
  );
}

/** For something that appears and disappears in place, like an undo bar. */
export function AppearInPlace({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      className={className}
      entering={reduced ? FadeIn.duration(1) : FadeIn.duration(260)}
      exiting={reduced ? FadeOut.duration(1) : FadeOut.duration(180)}
      layout={reduced ? undefined : LinearTransition.duration(260)}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A container whose children slide to their new positions when the list
 * changes, so a customer leaving the line reads as the line closing up
 * rather than the screen jumping.
 */
export function Settle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      className={className}
      layout={reduced ? undefined : LinearTransition.duration(280)}
    >
      {children}
    </Animated.View>
  );
}

/** One row of a queue: arrives from above, leaves by fading, settles in place. */
export function Row({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced)
    return <Animated.View className={className}>{children}</Animated.View>;
  return (
    <Animated.View
      className={className}
      entering={FadeInDown.duration(320).springify().damping(20)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.duration(280)}
    >
      {children}
    </Animated.View>
  );
}
