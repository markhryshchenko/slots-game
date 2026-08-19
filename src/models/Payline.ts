export interface Payline {
    id: number;
    rows: readonly number[];
  }
  
  export const paylines: Payline[] = [
    {
      id: 1,
      rows: [0, 0, 0],
    },
    {
      id: 2,
      rows: [1, 1, 1],
    },
    {
      id: 3,
      rows: [2, 2, 2],
    },
    {
      id: 4,
      rows: [0, 1, 2],
    },
    {
      id: 5,
      rows: [2, 1, 0],
    },
  ];