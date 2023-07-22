import { useState, 
    useEffect, 
    useRef,
    useReducer,
    ChangeEvent 
} from "react";
import Image from "next/Image";
import { useInterval } from "usehooks-ts";
import { DataConnection } from "peerjs";
import { nanoid } from "nanoid";
import {
    keccak256,
    encodePacked,
    parseEther,
    Address,
    Hash,
    Hex,
    TransactionReceipt
} from "viem";
import { rpsContract } from "../contracts/rpsContract";
import getRandomVal from "../../public/utils/getRandomVal";
import initializePeer from "../../public/utils/initializePeer";
import Timer from "../../public/utils/Timer";
import useForceUpdate from "../../public/utils/useForceUpdate";
import { Winner, PeerMessage, MoveInfo, TimerSettings, Weapon } from "../@types/types";
import copyTextToClipboard from "@/public/utils/copyTextToClipboard";


const P1UI = (props: { playerAddress: string, publicClient: any, walletClient: any }) => {
    const forceUpdate = useForceUpdate();
    const DEFAULT_STAKE = "0.0001";
    const IMAGES =  [
        "",
        "/images/rock.png",
        "/images/paper.png",
        "/images/scissors.png",
        "/images/spock.png",
        "/images/lizard.png",
    ];

    const [stake, setStake] = useState<string>(DEFAULT_STAKE);
    const [peerId, setPeerId] = useState<String>("");
    const [connected, setConnected] = useState<DataConnection>();
    const [p2Address, setP2Address] = useState<string>("");
    const [p2Response, setP2Response] = useState<Number>(0);
    const [createGameReceipt, setCreateGameReceipt] = useState<TransactionReceipt>();
    const [winner, setWinner] = useState<Winner>("Null");
    const [createGameHash, setCreateGameHash] = useState<Hash>();
    const [contractAddress, setContractAddress] = useState<Hash>();
    const [moveInfo, setMoveInfo] = useState<MoveInfo>({
        p1Moved: false,
        p2Moved: false,
        p2Choice: 0, // Defaults to Null
    });
    const [timer, setTimer] = useState<TimerSettings>({
        status: "Null",
        time: new Date(),
        reset: false,
        expired: false
    });

    /*
        The value stored in a useRef() hook is not part of the component's state and is not directly
        accessible from outside the component or the browser's console. This way we can persist the
        value of the salt between functions.
    */
    let saltRef = useRef<bigint>();

    /*
        Using the logic above, we can also use a useRef() hook to keep track of Player 1's move so we can 
        pass it in later to determine a winner via the solve() function in rps.sol
    */
   let moveRef = useRef<Weapon>();

    const createRPSLSGame = async (
    ) => {
        if (!props.playerAddress) return;
        if (moveRef.current === undefined) return;

        const account = props.playerAddress as Address;
        let choice = Object.keys(Weapon).indexOf(moveRef.current as unknown as string) - 6;

        /*
            We generate a new salt every game such that any sort of pass the hash (PtH) attack is prevented -
            an attacker that knows the salt of the first game has no insight into the salt used in the second
            game
        */
        saltRef.current = getRandomVal() as unknown as bigint;
        forceUpdate();
        console.log(p2Address);

        const p1Hash = keccak256(encodePacked(["uint8", "uint256"], [choice, saltRef.current])) as Hex;

        try {
            const hash: Hash = await props.walletClient.deployContract({
                ...rpsContract,
                account,
                args: [p1Hash, p2Address],
                value: parseEther(stake),
            });

            setCreateGameHash(hash);
            console.log("Successfully set hash");
            console.log(`Hash: ${hash}`);
        } catch (err) {
            console.log(`Failed to deploy contract: ${err}`);
            console.log("Please ensure to pass the correct Player 2 address (with the leading 0x prefix), and the numeric value of Ether you wish to stake");
            setCreateGameHash(undefined);
        }
    }

    useEffect(() => {
        const fetchReceipt = async () => {
            if (createGameHash) {
                console.log("Inside the if condition for createGameHash async func");

                try {
                    const receipt: TransactionReceipt = await props.publicClient.waitForTransactionReceipt({ hash: createGameHash });
                    console.log('Setting game receipt!');
                    setCreateGameReceipt(receipt);
                    console.log(`Game receipt set: ${createGameReceipt}`);
                } catch (err) {
                    console.error(err);
                    // Retry after 5 seconds if an error occurred
                    setTimeout(fetchReceipt, 5000);
                }
            }
        };
        fetchReceipt();

        /*
        (async () => {
            if (createGameHash) {
                console.log("Inside if condition for createGameHash")
                const receipt = await props.publicClient.waitForTransactionReceipt({ hash: createGameHash });
                console.log("Setting game receipt!");

                setCreateGameReceipt(receipt);
                console.log("Game receipt set!");
            }
        })();
        */
    }, [createGameHash, props.publicClient, createGameReceipt])

    /*
        We can ignore a lot of TypeScript's warnings as this code will only execute if the
        game has been created. For a game to be created: both players must have their wallets
        connected, both players will be connected via Peer.js, and createGameReceipt will have
        a .contractAddress field
    */
    useEffect(() => {
        ;(async () => {
            if (createGameReceipt) {
                // Resetting moveInfo for the new game after Player One moves
                setMoveInfo({
                    p1Moved: true,
                    p2Moved: false,
                    p2Choice: 0,
                });
                //@ts-ignore
                setContractAddress(createGameReceipt.contractAddress);
                console.log(`Game Address: ${contractAddress}`);

                await timeSinceLastAction();

                let peerMessage: PeerMessage = {
                    _type: "ContractAddress",
                    address: contractAddress!,
                };

                connected?.send(peerMessage);

                peerMessage = {
                    _type: "Stake",
                    stakeAmount: stake,
                };

                connected?.send(peerMessage);
            }
        })
        // eslint-disable-next-line
    }, [createGameReceipt])

    useEffect(() => {
        console.log("Trying to reach PeerJS servers...");

        const createPeer = async () => {
            console.log("Trying to create a peer...");

            const id = `RPSLS-${nanoid()}`;
            const peer = await initializePeer(id);
            setPeerId(peer.id);

            peer.on("open", () => {});
            peer.on("error", (e) => console.log(`Error: ${e}`));

            peer.on("connection", (conn) => {
                conn.on("error", (e) => console.log(`Connection Error: ${e}`));

                conn.on("open", () => {
                    conn.send("Connection with Player One established");
                    const peerMessage: PeerMessage = {
                        _type: "Player1Address",
                        address: props.playerAddress,
                    }
                    conn.send(peerMessage);
                });

                setConnected(conn);

                /*
                    We can ignore TypeScript's concerns of data being type unknown as the only 
                    data we will be passing P2P will be of type PeerMessage
                */
                //@ts-ignore
                conn.on("data", (data: PeerMessage) => {
                    if (data._type === "Connected") {
                        return console.log("Player 2 has connected");
                    } else if (data._type === "Player2Address") {
                        console.log(`Player Two's address: ${data.address}`);

                        setTimer({ ...timer, expired: false, status: "Null" });
                        return setP2Address(data.address as string);
                    } else {
                        return;
                    }
                });
            });
        };

        createPeer();
    }, [props.playerAddress, timer]);

    const getBlockchainInfo = async () => {
        if (contractAddress) {

            try {
                // We set the p1Moved to true in the createRPSLSGame function and therefore do not have to check again -
                // the contract will not deploy without the hash
                const [p2Move] = await Promise.all([
                    props.publicClient.readContract({
                        ...rpsContract,
                        address: contractAddress,
                        functionName: "c2"
                    })
                ]);
    
                if (p2Move !== 0) {
                    setMoveInfo({
                        ...moveInfo,
                        p2Moved: true,
                        p2Choice: p2Move,
                    });
                }
            } catch (err) {
                console.log(`Error retrieving game info from Sepolia: ${err}`);
            }
        }
    }

    // Every 10 seconds we check the chain to see if P2 moved
    useInterval(async () => {
        if (contractAddress) getBlockchainInfo(); 
    }, 10000);

    useEffect(() => {
        if (moveInfo.p2Moved && !timer.expired) {
            setTimer({ ...timer, status: "Null", expired: false });
            setP2Response(moveInfo.p2Choice);
        }
    }, [moveInfo, timer]);

    const timeSinceLastAction = async () => {
        if (contractAddress) {
            try {
                const [lastAction, timeout] = await Promise.all([
                    props.publicClient.readContract({
                        ...rpsContract,
                        address: contractAddress,
                        functionName: "lastAction",
                    }),
                    props.publicClient.readContract({
                        ...rpsContract,
                        address: contractAddress,
                        functionName: "TIMEOUT",
                    })
                ]);

                const now = Math.round(Date.now() / 1000);
                const secondsElapsed = now - lastAction;
                const secondsToTimeout = timeout - secondsElapsed;
                const newTime = new Date();

                newTime.setSeconds(newTime.getSeconds() + secondsToTimeout);
                setTimer({
                    ...timer,
                    status: "Running",
                    time: newTime,
                    reset: true,
                    
                })
            } catch (err) {
                console.log(`Error retrieving time since last action: ${err}`);
            }
        }
    };

    const p2Timeout = async (): Promise<Boolean> => {
        console.log("Checking if Player 2 timed out...");

        try {
            const { request } = await props.publicClient.simulateContract({
                ...rpsContract,
                account: props.playerAddress as Address,
                address: contractAddress,
                functionName: "j2Timeout",
            });

            const hash = await props.walletClient.writeContract(request);
            const receipt = await props.publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status !== "success") throw Error(`Transaction failed: ${receipt}`);

            return true;

        } catch (err) {
            console.log(`Error checking if Player 2 timed out: ${err}`);
            return false;
        }
    };

    const timerComponent = (
        timer: TimerSettings,
        setTimer: React.Dispatch<React.SetStateAction<TimerSettings>>
    ) => {
        if (timer.status = "Running") {
            return (
                <Timer 
                    expiryTimestamp={timer.time}
                    timerState={{ timer, setTimer }}
                />
            )
        }

        return (
            <span></span>
        )
    };

    const timerExpired = (
        winner: Winner,
        timer: TimerSettings,
        p2Timeout: () => void,
    ) => {
        if (!timer.expired) {
            return <span></span>
        }

        if (timer.expired && winner === "Null") {
            return (
                <div>
                    <div>
                        Player 2 has timed out!
                    </div>
                    <button onClick={async () => p2Timeout()}>
                        Click here to get both stakes
                    </button>
                </div>
            )
        }

        return (
            <span></span>
        )
    };

    const win = (_c1: Weapon, _c2: Weapon) => {
        if (_c1 === _c2) {
            return "Draw";
        } else if (_c1 % 2 == _c2 % 2) {
            return _c1 < _c2;
        } else {
            return _c1 > _c2;
        }
    }

    const decideWinner = (): Winner => {
        if (!moveRef.current || p2Response) return "Null";

        if (win(moveRef.current, p2Response as Weapon) === "Draw") {
            return "Draw";
        } else if (win(moveRef.current, p2Response as Weapon)) {
            return "Player1";
        } else {
            return "Player2";
        }
    }

    const checkWinner = async () => {
        console.log("Checking winner...");

        try {
            const { request } = await props.publicClient.simulateContract({
                ...rpsContract,
                account: props.playerAddress as Address,
                address: contractAddress,
                functionName: "solve",
                args: [moveRef.current, saltRef.current]
            });

            const hash = await props.walletClient.writeContract(request);
            const receiptWinnerTxt = await props.publicClient.waitForTransactionReceipt({ hash });

            if (receiptWinnerTxt.status !== "success") throw Error(`Transaction failed: ${receiptWinnerTxt}`);

            const winningPlayer = decideWinner();
            setWinner(winningPlayer);

            if (winningPlayer !== "Null") {
                let peerMessage: PeerMessage = { _type: "Winner", player: winningPlayer };
                connected?.send(peerMessage);

                peerMessage = { _type: "Player1Choice", choice: moveRef.current as Weapon };
                connected?.send(peerMessage);
            }
        } catch (err) {
            console.log(`Error checking the winner: ${err}`);
        }
    }

    const onEnterStake = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const isInvalid = Number.isNaN(Number(e.target.value));
        if (isInvalid) return;

        setStake(e.target.value);
    }

    const handleChoice = (choice: number) => {
        moveRef.current = Weapon[choice] as unknown as Weapon;
        forceUpdate();
    }

    return (
        <div>
            {!connected && props.playerAddress !== "" && (
                <div className="flex flex-col justify-center items-center mt-4">
                    <div>Waiting on Player 2 to connect...</div>
                    <div>
                        <button onClick={() => copyTextToClipboard(`localhost:3000/?peerId=${peerId}`)}>
                            Click here to generate a link to share with another player!
                        </button>
                    </div>
                </div>
            )}
            {connected && p2Address === "" && (
                <div>
                    <div>Waiting on Player 2 to connect their wallet...</div>
                    <div>We can<span>&#39;</span>t start the game without their address!</div>
                </div>
            )}
            {connected && p2Address !== "" && (
                <div>
                    <div className="flex flex-col justify-center items-center mt-4">
                        <div className="">
                            Connected with Player Two!
                        </div>
                        <div>
                            Your opponent: <a target="_blank" href={`https://sepolia.etherscan.io/address/${p2Address}`}>{p2Address}</a>
                        </div>

                        {contractAddress === undefined && (
                            <>
                                <div className="flex flex-row mt-10">
                                    {IMAGES.map((image, index) => {
                                        if (index === 0) return;
                                        return (
                                            <div
                                                key={index}
                                                onClick={() => {
                                                    handleChoice(index)
                                                }}
                                            >
                                                <Image
                                                    src={image}
                                                    alt=""
                                                    width={250}
                                                    height={250}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex flex-row justify-between items-center mt-4">
                                    <div className="mr-2">
                                        How much Ether would you like to stake?
                                    </div>
                                    <input  
                                        name="stakeInput"
                                        id="stakeInput"
                                        className="appearance-none w-24 py-1 px-4 bg-black focus:border-green focus:outline-none text-green text-end"
                                        placeholder={DEFAULT_STAKE}
                                        onChange={(e) => onEnterStake(e)} 
                                    />
                                    <div className="ml-2">
                                        Ether
                                    </div>
                                </div>
                                <div>
                                    You have selected: {moveRef.current}
                                </div>
                                <button
                                    className="mt-4"
                                    onClick={() => createRPSLSGame()}
                                >
                                    Create Match
                                </button>
                            </>
                        )}
                        {contractAddress && (
                            <>
                                <div>
                                    {timerComponent(timer, setTimer)}
                                    {timerExpired(winner, timer, p2Timeout)}
                                </div>
                                <a href={`https://sepolia.etherscan.io/address/${contractAddress}`}>
                                    Match: {contractAddress}
                                </a>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default P1UI;