import React from 'react';
import { StyleSheet, View } from 'react-native';

import { THEME } from '../game/config';
import { GameState } from '../game/logic';
import { TileView } from './TileView';

type Props = {
  state: GameState;
  boardSize: number;
};

const BORDER = 1;

export function Board({ state, boardSize }: Props) {
  const { size } = state;
  // cells are laid out inside the border, not across it
  const inner = boardSize - BORDER * 2;
  const gap = inner * 0.026;
  const pad = gap;
  const cell = (inner - pad * 2 - gap * (size - 1)) / size;

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
            borderRadius: cell * 0.2,
            backgroundColor: THEME.emptyCell,
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
          borderRadius: boardSize * 0.055,
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
    backgroundColor: THEME.board,
    borderWidth: BORDER,
    borderColor: THEME.boardBorder,
    boxShadow: `0px 8px 0px ${THEME.lip}, 0px 18px 30px rgba(80, 70, 170, 0.18)`,
  },
});
