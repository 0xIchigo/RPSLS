# Rock, Paper, Scissors, Lizard, Spock

Rock, Paper, Scissors, Lizard, Spock (which I will abbreviate to RPSLS) is an expanded version of the classic game of Rock, Paper, Scissors created by Sam Kass and Karen Bryla. The game was popularized on the show "The Big Bang Theory" as it was used to settle a dispute about what to watch on TV between the characters Sheldon and Raj in the episode "The Lizard-Spock Expansion".

This repo is a Web3 dApp that allows you to play RPSLS against another player on the Sepolia testnet while wagering Ether. You can obtain Sepolia ETH by visiting the [Sepolia Faucet](https://sepoliafaucet.com/) (limited to 0.5 Sepolia ETH/day), or by mining using the [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/), which you can also [fork and run yourself](https://github.com/pk910/PoWFaucet) if you so desire.

In the following paragraphs, I outline how to play the game, the Mixed Strategy Nash Equilibria of RPSLS, as well as my thought process regarding the design choices I made while creating this dApp.

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

To play RPSLS using this dApp, Player One creates the game, commitmenting their move as a hash, staking some Ether, and inputs the address of the player they wish to play against. Player Two stakes the same amount of Ether as the Player One and submits their move. Then, Player One reveals their move and the contract distributes the Ether to the winner based on the winning combination, or splits the Ether in the case of a tie.

If a party does not respond for more than 5 minutes then there is a timeout. If Player Two times out then Player One is able to retrieve their own stake. If, however, Player One times out, Player Two receives both of their stakes as Player One can only time out after a game has been created.

## Mixed Strategy Nash Equilibria

The following table outlines the game theory behind RPSLS:

|          | Rock    | Paper   | Scissors | Lizard  | Spock   |
| -------- | ------- | ------- | -------- | ------- | ------- |
| Rock     | (0, 0)  | (-1, 1) | (1, -1)  | (1, -1) | (-1, 1) |
| Paper    | (1, -1) | (0, 0)  | (-1, 1)  | (-1, 1) | (1, -1) |
| Scissors | (-1, 1) | (1, -1) | (0, 0)   | (1, -1) | (-1, 1) |
| Lizard   | (-1, 1) | (1, -1) | (-1, 1)  | (0, 0)  | (1, -1) |
| Spock    | (1, -1) | (-1, 1) | (1, -1)  | (-1, 1) | (0, 0)  |

The payoff matrix for RPSLS is a 5x5 matrix with the rows and columns representing the five possible actions of each player (Rock, Paper, Scissors, Lizard, Spock). The diagonal of the matrix is 0, representing the case where both players pick the same action thereby tying the game. For every other cell, a 1 represents a winning move and a -1 represents a losing move.

It is important to note that, like the original game Rock, Paper, Scissors, no player can unilateraly change their strategy in the long run to improve their condition - there is no pure strategy Nash equilibria for this game.

The Nash Equilibrium for RPSLS is a mixed strategy for each player where each action is played with an equal proability. This is due to the fact that you cannot obtain a higher expected payoff by deviating to another strategy since the other player is choosing their respective action with an equal probability. Therefore, the Mixed Strategy Nash Equilibria is for each player to randomly choose each of the five options 1/5 of the time (based on the assumption that these random choices are truly random choices). The strategies (1/5, 1/5, 1/5, 1/5, 1/5) for both players forms the Mixed Strategy Nash Equilibria as this makes the game completely fair and both players will win, lose, and tie an equal number of times when the game is played repeatedly over a long period of time.

## Design Considerations

### Commitment Scheme and Privacy

The main consideration for this app is how can the code be structured such that the second player is unable to determine what action the first player has already made. For this, we use a commit-reveal scheme - Player One commits to a move while keeping it hidden from Player Two with the ability to reveal that move later. When Player One commits their move, we hash it using the Keccack256 hash function and add a salt to guarantee the creation of a unique commitment hash each game. A salt is random data that is used as additional input to ensure that even when the inputs are the exact same (for example,Player One chooses lizard over multiple games) a unique output is always generated. The typical recommendation for bit security is at least 180 bit security, however, there is [consensus among security researchers that](https://xtendo.org/bit_security_level) 128 bits of security is sufficient until the next revolutionary breakthrough in either mathematics or technology, and that 112 bits of security is sufficient until 2030.

Given general consensus that Keccak256 is stronger than SHA256, providing the Keccak256 hash with a salt of 256 bits that consists of cryptographically strong, random values that are uniquely generated every game, in tandem with a 5 minute timer, is more than secure. The important thing here is that the salt is uniquely generated each game with cryptographically strong, random numbers. This prevents any sort of pass the hash (PtH) attack as an attacker who figures out the salt for game 1, for example, has no insight into the salt for game 2, since the salt is dynamic. Moreover, the 5 minute timers places stringent time constraints on any attack vector an attacker could pursue quickly. Regardless, we are using a 256-bit salt populated with cryptographically strong, random values; [256-bit security is more than secure](https://youtu.be/S9JGmA5_unY) for our purposes. I did contemplate moving the salt calculation into a permissioned database, however that seems overkill for the purpose and scope of this app and it opens up a number of new potential attack vectors that I'd have to account for.

I have also made the executive decision to not use the Hasher contract, which can be found in [rps.sol](https://github.com/0xIchigo/rpsls/blob/main/app/contracts/rps.sol). Instead, I have recreated its hashing functionality with viem's `keccak256` function, which is supplied by cryptographically strong, random numbers generated via [getRandomVal.tsx](https://github.com/0xIchigo/rpsls/tree/main/public/utils/getRandomVal.tsx). My reasoning is that when I call the hash function, I would be passing in both the move and salt as plaintext, which would then be included in the transaction's input data. Yes, the transaction data is ABI encoded, however, to deploy the contracts via a contract factory I have the ABI for both contracts in the contracts directory. It is trivial for an attacker to take the RPS contract from `rps.sol`, paste it into Remix, and generate the ABI themselves. The likelihood of an attacker using the ABI to decode Player One's move within a 5 minute window is too high for my liking. The only time the move and salt should come in contact with the blockchain, in my opinion, is when the `solve()` function is called to determine the winner. Since the salt is generated every game with cryptographically strong, random numbers this is not an issue.

Another issue I ran into was saving the salt - I need to have it persist past its generation so I can use it later to reveal Player One's move. Without using any external service, I could store the salt in the user's cookies. This, however, is unsecure given there is no guarantee that cookies aren't stored in plaintext, as most implementations do store them as plaintext. This can be extremely problematic considering the nautre of this dApp has Player One and Player Two sharing links with one another - Player Two could send Player One a fake link which lets them steal their cookies. Cookies can also be stolen by man-in-the-middle (MITM) attacks, cross-site scripting (XSS) attacks, or from a local, unencrypted store, so using Cookies is out of the question. I also cannot simply store the salt value in a `useState()` hook as anyone with React Developer Tools installed can inspect the code and see the value of the salt state. I can, however, store the salt value in a `useRef()` hook as the stored value will not be exposed to the browser's JavaScript runtime or be accessible through developer tools. This way, the salt can persist across re-renders and outside of a single function all while remaining in the scope of the React component and cannot be modified or queried externally. Now, the commitment scheme occurs entirely within the confines of the dApp and does not rely on any third-party service to secure it.

### Language, Packages, and Frameworks

For this project, I decided to use TypeScript and Next.js. TypeScript's type system allows, and even forces, me to create a solid codebase that is both maintainable and readable. Next.js is the perfect framework in this case given its great support for TypeScript and server-side rendering. With the two, I was able to create a strongly typed React app. I also styled the dApp using Tailwind CSS given it works exceptionally well with Next.js, and I can style components on the go without having to jump from file to file.

With respect to interfacing with Ethereum, I decided to use [viem](https://viem.sh/) over Ethers for three reasons: it is significantly faster and more performant, I wanted to challenge myself to quickly adapt to a new TypeScript interface, and a number of codebases are beginning to migrate from Ethers v5 to viem.

For the peer-to-peer programming, Peerjs was an obvious choice given it abstracts away all of the ice and signalling logic found in WebRTC so I was able to spend more time on the functionality of my dApp.

### RPS.sol

The most logical design choice for this dApp without modifying [rps.sol](https://github.com/0xIchigo/rpsls/blob/main/app/contracts/rps.sol) was to create a contract factory. This is because the smart contract itself is not suitable for more than one game session, which is troublesome if players wanted to play more than one game. To create the smart contract factory, I saved and exported the contract's ABI and Bytecode as a `constant` so I could use it quite easily with viem's `deployContract()` function.

If I were to improve upon this project, the first thing I would do is rewrite RPS.sol using the latest version of Solidity, which, at the time of writing this, is v0.8.21. This would allow for a number of improvements to the smart contract, namely: custom errors, and using the `constructor()` function (as opposed to naming the constructor after the contract's name).

There are also a number of glaring security issues that I would fix. The most obvious security issue is that the `solve()`, `j1Timeout()`, and `j2Timeout()` functions are vulnerable to reentrancy. This is due to the fact that these functions fail to follow the [Checks-Effects-Interactions Pattern](https://docs.soliditylang.org/en/v0.6.11/security-considerations.html#re-entrancy) and an interaction occurs before the effect. We'll use `j1Timeout()` as an example:

```
function j1Timeout() {
    require(c2!=Move.Null); // J2 already played.
    require(now > lastAction + TIMEOUT); // Timeout time has passed.
    j2.send(2*stake);
    stake=0;
}
```

The issue here is that the stake is sent out _before_ it is set to zero. If J2 is a contract, it could have a `fallback()` or `receive()` that calls back into `j1Timeout()`. The contract's nature does position it so its balance should only ever be 2 * `stake`, however, there are *no modifiers or any sort of access control found in this contract*. With functions marked as `payable`, the contract's balance could be greater than 2 * `stake` which is problematic as anyone can call any payable function with whatever `msg.value` they please.

The contract also fails to follow the Withdrawl Pattern. The Withdrawl Pattern places the responsibility for claiming funds on the recipient of the funds - they have to send a transaction to withdraw these funds. By forcefully sending Ether to an address by using the `.send()` function without any checks for its return value, the smart contract can run into a number of issues: how does the smart contract know whether funds failed to send due to an actual error, or whether the recipient is a malicious smart contract that is deliberately refusing to accept funds? Say Player One is a wealthy user that could afford to lose a value of 1 ETH playing this game while Player Two is not. Player One could deliberately refuse Ether, DOSing the game. This becomes an issue in the `solve()` function when the two users tie and the stakes are sent back. Player One's stake is sent first so if they deliberately refuse the Ether then Player Two's stake is lost.

Other minor changes I would make include: adding and emitting events, adding a Winner variable so the winner can be retrieved from the contract instead of having to determine the winner locally, as well as completely removing the `Hasher` contract as it is dead code for aforementioned security reasons.

One last comment regarding how the winner is determined: it is absolutely beautiful. The rules of RPSLS cannot be directly translated into simple mathematical operations, especially considering the values assigned to the options (Rock, Paper, Scissors, Lizard, Spock) do not inherently carry any meaning related to these rules. If, however, we swap Lizard and Spock such that the ordering becomes Rock, Paper, Scissors, Spock, Lizard, we can now compute the winner based on whether they are both even/odd and their numerical superiority. In the TypeScript implementation, I was debating between staying true to the on-chain method of calculation versus implementing a `winMapping` which would be of type `Record<Weapon, Weapon[]>` - I could easily check if the `winMapping` of Player One's choice included Player Two's. I opted to stay true with the implementation purely out of awe.

# Acknowledgements

The smart contract used for this project was created by [Clément Lesaege](https://twitter.com/clesaege?s=20), CTO of [Kleros](https://kleros.io/). I do not take any credit for the creation of this smart contract and am merely deploying and interacting with it. I urge you to checkout both Clément's work and the work being done at Kleros!
