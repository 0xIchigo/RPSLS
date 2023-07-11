# Rock, Paper, Scissors, Lizard, Spock

Rock, Paper, Scissors, Lizard, Spock (which I will abbreviate to RPSLS) is an expanded version of the classic game of Rock, Paper, Scissors created by Sam Kass and Karen Bryla. The game was popularized on the show "The Big Bang Theory" as it was used to settle a dispute about what to watch on TV between the characters Sheldon and Raj in the episode "The Lizard-Spock Expansion."

This repo is a Web3 app that allows you to play RPSLS against another player on the Sepolia testnet while wagering Ether. You can obtain Sepolia ETH by visiting the [Sepolia Faucet](https://sepoliafaucet.com/) (limited to 0.5 Sepolia ETH/day), or by mining using the [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/), which you can also [fork and run yourself](https://github.com/pk910/PoWFaucet) if you so desire.

In the following paragraphs, I outline how to play the game, the Mixed Strategy Nash Equilibria of RPSLS, as well as my thought process regarding the design choices I made while creating this app.

## How to Play

To play RPSLS each player must pick either Rock, Paper, Scissors, Lizard, or Spock and reveal it at the same time as the other player. A winning hand is determined as follows:

- Scissors cuts Paper
- Paper covers Rock
- Rock crushes Lizard
- Lizard poisons Spock
- Spock smashes Scissors
- Scissors decapitates Lizard
- Lizard eats paper
- Paper disproves Spock
- Spock vaporizes Rock
- Rock crushes scissors

To play RPSLS using this app, the first player creates the game, putting a commitment of their move, staking some Ether, and selects the other player who they wish to play against. The second player stakes the same amount of Ether as the first player and picks their move. Then, the first party reveals their move and the contract distributes the Ether to the winner based on the winning combination, or splits the Ether in the case of a tie. If a party stops responding then there is a timeout.

## Mixed Strategy Nash Equilibria

The following table outlines the game theory behind RPSLS:

|          | Rock    | Paper   | Scissors | Lizard  | Spock   |
| -------- | ------- | ------- | -------- | ------- | ------- |
| Rock     | (0, 0)  | (-1, 1) | (1, -1)  | (1, -1) | (-1, 1) |
| Paper    | (1, -1) | (0, 0)  | (-1, 1)  | (-1, 1) | (1, -1) |
| Scissors | (-1, 1) | (1, -1) | (0, 0)   | (1, -1) | (-1, 1) |
| Lizard   | (-1, 1) | (1, -1) | (-1, 1)  | (0, 0)  | (1, -1) |
| Spock    | (1, -1) | (-1, 1) | (1, -1)  | (-1, 1) | (0, 0)  |

The payoff matrix for RPSLS is a 5x5 matrix with the rows and columns represeting the five possible actions of each player (Rock, Paper, Scissors, Lizard, Spock). The diagonal of the matrix is 0, representing the case where both players pick the same action thereby tying the game. For every other cell, a 1 represents a winning move and a -1 represents a losing move.

It is important to note that, like the original game Rock, Paper, Scissors, no player can unilateraly change their strategy in the long run to improve their condition - there is no pure strategy Nash equilibria for this game.

The Nash Equilibrium for RPSLS is a mixed strategy for each player where each action is played with an equal proability. This is due to the fact that you cannot obtain a higher expected payoff by deviating to another strategy since the other player is choosing their respective action with an equal probability. Therefore, the Mixed Strategy Nash Equilibria is for each player to randomly choose each of the five options 1/5 of the time (based on the assumption that these random choices are truly random choices). The strategies (1/5, 1/5, 1/5, 1/5, 1/5) for both players forms the Mixed Strategy Nash Equilibria as this makes the game completely fair and both players will win, lose, and tie an equal number of times when the game is played repeatedly over a long period of time.

## Design Considerations

### Commitment Scheme and Privacy

The main consideration for this app is how can the code be structured such that the second player is unable to determine what action the first player has already made. When the first player commits their move, a salt is added to the hash to guarantee the creation of a unique commitment hash. A salt is random data that is used as additional input to ensure that even when the inputs are the same (for example, the player chooses lizard over multiple games) a unique output is generated.

# Acknowledgements

The smart contract used for this project was created by [Clément Lesaege](https://twitter.com/clesaege?s=20), CTO of [Kleros](https://kleros.io/). I do not take any credit for the creation of this smart contract and am merely deploying and interacting with it. I urge you to checkout both Clément's work and the work being done at Kleros!
