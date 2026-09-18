import React from 'react';
import { StyleSheet, View } from 'react-native';

import { COLORS } from '../game/config';
import { GameState } from '../game/logic';
import { TileView } from './TileView';

type Props = {
  state: GameState;
  boardSize: number;
};

export function Board({ state, boardSize }: Props) {
  const { size } = state;
  const gap = boardSize * 0.022;
  const pad = gap;
  const cell = (boardSize - pad * 2 - gap * (size - 1)) / size;

  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push(
        <View
          key={`cell-${row}-${col}`}
          style={{
            position: 'absolute',
            left: pad + col * (cell + gap),
            top: pad + row * (cell + gap),
            width: cell,
            height: cell,
            borderRadius: cell * 0.16,
            backgroundColor: COLORS.emptyCell,
          }}
        />
      );
    }
  }

  return (
    <View
      style={[
        styles.board,
        {
          width: boardSize,
          height: boardSize,
          borderRadius: boardSize * 0.04,
        },
      ]}
    >
      {cells}
      {state.tiles.map((tile) => (
        <TileView key={tile.id} tile={tile} cell={cell} gap={gap} pad={pad} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: COLORS.boardFrame,
    overflow: 'hidden',
  },
});
