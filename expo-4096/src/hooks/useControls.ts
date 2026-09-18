import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform } from 'react-native';

import { Direction } from '../game/logic';

const SWIPE_DISTANCE = 12;
/** a fast flick can travel very little distance, so velocity counts too */
const SWIPE_VELOCITY = 0.25;

/**
 * Swipe gestures plus arrow keys on web, matching the Unity input map.
 * The callback lives in a ref so the responder is only built once.
 */
export function useControls(onMove: (direction: Direction) => void) {
  const callback = useRef(onMove);
  callback.current = onMove;

  const panHandlers = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        // don't let anything steal a swipe half way through
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_event, gesture) => {
          const { dx, dy, vx, vy } = gesture;
          const horizontal = Math.abs(dx) > Math.abs(dy);
          const distance = horizontal ? Math.abs(dx) : Math.abs(dy);
          const velocity = Math.abs(horizontal ? vx : vy);

          if (distance < SWIPE_DISTANCE && velocity < SWIPE_VELOCITY) {
            return;
          }
          if (horizontal) {
            callback.current(dx > 0 ? 'right' : 'left');
          } else {
            callback.current(dy > 0 ? 'down' : 'up');
          }
        },
      }).panHandlers,
    []
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    const keys: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = keys[event.key];
      if (direction) {
        event.preventDefault();
        callback.current(direction);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return panHandlers;
}
