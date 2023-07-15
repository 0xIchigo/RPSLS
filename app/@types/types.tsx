export enum Weapon {
    "Null",
    "Rock",
    "Paper",
    "Scissors",
    "Spock",
    "Lizard",
};

export type Winner = "Player1" | "Player2" | "Draw" | "Null";

export type PeerMessage = 
    { _type: "Player1Address"; address: String } |
    { _type: "Player2Address"; address: String } |
    { _type: "ContractAddress"; address: `0x${string}` } |
    { _type: "Winner"; player: Winner } |
    { _type: "Player1Choice"; choice: Number } |
    { _type: "Connected"};

export type MoveInfo = {
    p1Moved: Boolean,
    p2Moved: Boolean,
    p2Choice: Number
};

export type TimerSettings = {
    status: "Null" | "Running" | "Finished",
    time: Date,
    reset: Boolean,
    expired: Boolean,
}