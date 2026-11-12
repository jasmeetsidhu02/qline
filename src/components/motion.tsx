import { ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";
import ReanimatedView, {
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

// Motion in QLine is there to show what changed — a row joining the line, a
// screen arriving — never as decoration. One entrance per screen, staggered,
// and nothing that moves on its own afterwards.
//
// Entrances are driven by React Native's own Animated rather than by
// Reanimated's entering animations. Those start an element at opacity 0 and
// depend on a library animation actually running; if it does not, on a
// browser or a device where it misbehaves, the content never becomes
// visible. Here the animation only ever ends in one place — fully visible —
// and a timer forces that end state even if the animation never runs. An
// invisible screen is a broken app; a screen that appears without sliding is
// merely a plain one.
//
// Everything respects the system's "reduce motion" setting.

const DURATION = 380;
/** However the animation goes, the content is visible by now. */
const SAFETY_MS = 900;

function useEntrance(delay: number, reduced: boolean) {
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      delay,
      easing: Easing.out(Easing.cubic),
      // The JS driver updates plain styles, which works the same in a
      // browser as on a phone.
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    const safety = setTimeout(() => progress.setValue(1), delay + SAFETY_MS);
    return () => {
      animation.stop();
      clearTimeout(safety);
    };
  }, [progress, delay, reduced]);

  return progress;
}

/**
 * A whole screen arriving. Expo Router's stack animations do not run on the
 * web build, where a route change unmounts one screen and mounts the next,
 * showing an empty page in between. Fading each screen in covers that gap.
 */
export function Page({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const progress = useEntrance(0, reduced);
  return (
    <Animated.View
      className={className ?? "flex-1"}
      style={{ opacity: progress }}
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
  const progress = useEntrance(delay, reduced);
  return (
    <Animated.View
      className={className}
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** For something that appears in place, like the undo bar under the chair. */
export function AppearInPlace({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const progress = useEntrance(0, reduced);
  return (
    <Animated.View className={className} style={{ opacity: progress }}>
      {children}
    </Animated.View>
  );
}

/**
 * A container whose children slide to their new positions when the list
 * changes, so a customer leaving the line reads as the line closing up
 * rather than the screen jumping. A layout animation can only move things
 * that are already on screen, so it can never hide anything.
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
    <ReanimatedView.View
      className={className}
      layout={reduced ? undefined : LinearTransition.duration(280)}
    >
      {children}
    </ReanimatedView.View>
  );
}

/** One row of a queue: settles into its new place when the line changes. */
export function Row({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Settle className={className}>{children}</Settle>;
}
