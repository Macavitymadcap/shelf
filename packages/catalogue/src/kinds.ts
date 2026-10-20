export const KINDS = ["book", "record", "board_game"] as const;
export type Kind = (typeof KINDS)[number];
