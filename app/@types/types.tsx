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
    { _type: "Player1Address"; address: string } |
    { _type: "Player2Address"; address: string } |
    { _type: "ContractAddress"; address: string } |
    { _type: "Winner"; player: Winner } |
    { _type: "Player1Choice"; choice: Number } |
    { _type: "Player2Responded"} |
    { _type: "requiredStake"; amountStaked: string } |
    { _type: "Connected"};

export type MoveInfo = {
    p1Moved: Boolean,
    p2Moved: Boolean,
    p2Choice: Number
    stake?: String
};

export type TimerSettings = {
    status: "Null" | "Running" | "Finished",
    time: Date,
    reset: Boolean,
    expired: Boolean,
}