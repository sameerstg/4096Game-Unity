import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform } from 'react-native';

import { Direction } from '../game/logic';

const SWIPE_THRESHOLD = 18;

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
        onPanResponderRelease: (_event, gesture) => {
          const { dx, dy } = gesture;
          if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
            return;
          }
          if (Math.abs(dx) > Math.abs(dy)) {
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
