import { useState, useEffect } from "react";
import Image from "next/Image";
import { 
    Address, 
    parseEther 
} from "viem";
import { DataConnection } from "peerjs";
import { useInterval } from "usehooks-ts";
import { rpsContract } from "../contracts/rpsContract";
import Timer from "../../public/utils/Timer";
import initializePeer from "../../public/utils/initializePeer";
import { IMAGES, DEFAULT_STAKE } from "../../public/utils/consts";
import { Winner, MoveInfo, TimerSettings, Weapon, PeerMessage } from "../@types/types";


const P2UI = (props: { playerAddress: string, publicClient: any, walletClient: any, peerId: string | null }) => {
    /*
        Since Player 1's move is already hashed and committed, we don't have to worry about making Player
        Two's move hidden. Here, we can use the useState() hook to have the value persist
    */
    const [choice, setChoice] = useState<Weapon>(0);
    const [requiredStake, setRequiredStake] = useState<string>(DEFAULT_STAKE);
    const [contractAddress, setContractAddress] = useState<Address>();
    const [connected, setConnected] = useState<DataConnection>();
    const [winner, setWinner] = useState<Winner>("Null");
    const [p1Address, setP1Address] = useState<string>("");
    const [p1Choice, setP1Choice] = useState<Number>();
    const [responseSent, setResponseSent] = useState<Boolean>(false);
    const [moveInfo, setMoveInfo] = useState<MoveInfo>({
        p1Moved: false,
        p2Moved: false,
        p2Choice: 0, // Defaults to Null
        stake: "",
    });
    const [timer, setTimer] = useState<TimerSettings>({
        status: "Null",
        time: new Date(),
        reset: false,
        expired: false
    });

    const sendP2Choice = async (
    ) => {
        if (contractAddress === undefined) return;
        try {
            const { request } = await props.publicClient.simulateContract({
                ...rpsContract,
                account: props.playerAddress as Address,
                address: contractAddress,
                functionName: "play",
                args: [Number(choice)],
                value: parseEther(requiredStake)
            });

            const hash = await props.walletClient.writeContract(request);
            const receipt = await props.publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status !== "success") throw Error(`Transaction failed: ${receipt}`);

            setResponseSent(true);

            let peerMessage: PeerMessage = {
                _type: "Player2Responded"
            };

            console.log("Sent response to Player One");

            connected?.send(peerMessage);

            await timeSinceLastAction();
        } catch (err) {
            console.log(`Error sending choice: ${err}`);
            console.log("Please remember to stake the correct Ether value");
        }
    };

    const getBlockchainInfo = async () => {
        if (contractAddress !== undefined) {

            try {
                await timeSinceLastAction();
                
                // We set the p1Moved to true in the createRPSLSGame function and therefore do not have to check again -
                // the contract will not deploy without the hash
                const [p1MoveHash, stake, p2Move] = await Promise.all([
                    props.publicClient.readContract({
                        ...rpsContract,
                        address: contractAddress,
                        functionName: "c1Hash"
                    }),
                    props.publicClient.readContract({
                        ...rpsContract,
                        address: contractAddress,
                        functionName: "stake"
                    }),
                    props.publicClient.readContract({
                        ...rpsContract,
                        address: contractAddress,
                        functionName: "c2"
                    })
                ]);
    
                if (p1MoveHash !== "") {
                    setMoveInfo({
                        ...moveInfo,
                        p1Moved: true,
                        stake: stake,
                    });
                    //setRequiredStake(stake as unknown as string);
                }

                if (p2Move) {
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
    
    useInterval(async () => {
        if (contractAddress && winner === "Null") getBlockchainInfo();
    }, 15000);

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

                const now: number = Math.round(Date.now() / 1000);
                const secondsElapsed: number = now - Number(lastAction);
                const secondsToTimeout: number = Number(timeout) - secondsElapsed;               
                const newTime: Date = new Date();

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

    const p1Timeout = async (): Promise<Boolean> => {
        console.log("Checking if Player 2 timed out...");

        try {
            const { request } = await props.publicClient.simulateContract({
                ...rpsContract,
                account: props.playerAddress as Address,
                address: contractAddress,
                functionName: "j1Timeout",
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
                        Player 1 has timed out!
                    </div>
                    <button onClick={async () => p1Timeout()}>
                        Click here to get both stakes
                    </button>
                </div>
            )
        }

        return (
            <span></span>
        )
    };

    // Connecting with Player One
    useEffect(() => {
        console.log("Trying to connect with Player One...");

        ;(async () => {
            if (!props.peerId) return;

            const peer = await initializePeer(); 
            const conn = peer.connect(props.peerId, { reliable: true });
            setConnected(conn);

            conn.on("error", (e) => console.log(`Error: ${e}`));
            conn.on("open", () => {
                let peerMessage: PeerMessage = {
                    _type: "Connected"
                };
                conn.send(peerMessage);

                peerMessage = {
                    _type: "Player2Address",
                    address: props.playerAddress,
                };
                conn.send(peerMessage);

                /*
                    We can ignore TypeScript's concerns of data being type unknown as the only 
                    data we will be passing P2P will be of type PeerMessage
                */
                //@ts-ignore
                conn.on("data", (data: PeerMessage) => {
                    if (data._type === "Player1Address") {
                        console.log(`Player1's address: ${data.address}`);
                        return setP1Address(data.address);
                    } else if (data._type === "ContractAddress") {
                        getBlockchainInfo();
                        return setContractAddress(data.address as Address);
                    } else if (data._type === "Player1Choice") {
                        return setP1Choice(data.choice);
                    } else if (data._type === "Winner") {
                        setTimer({ ...timer, status: "Null", reset: true });
                        return setWinner(data.player)
                    } else if (data._type === "requiredStake") {
                        console.log(`amountStaked: ${data.amountStaked}`);
                        console.log(`Type: ${typeof(data.amountStaked)}`);
                        return setRequiredStake(data.amountStaked);
                    } else {
                        return;
                    }
                });
            });
        })()
        // eslint-disable-next-line
    }, [props.peerId, props.playerAddress]);


    return (
        <>
            {typeof(props.peerId) === null && (
               <div className="flex flex-col items-center justify-center mt-4">Error! The peer ID is of type null: {props.peerId}</div>
            )}
            {connected && p1Address !== "" && winner === "Null" && (
                <div className="flex flex-col items-center justify-center mt-4">
                    <div className="flex flex-col justify-center items-center mt-4">
                        <div className="">
                            Connected with Player One!
                        </div>
                        <div>
                            Your opponent: <a target="_blank" href={`https://sepolia.etherscan.io/address/${p1Address}`}>{p1Address}</a>
                        </div>

                        {contractAddress !== undefined && (
                            <>
                                <div className="flex flex-row mt-10">
                                    {IMAGES.map((image, index) => {
                                        if (index === 0) return;
                                        return (
                                            <div
                                                key={index}
                                                onClick={() => {
                                                    setChoice(index)
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
                                        Ether to stake: {requiredStake}
                                    </div>
                                </div>
                                {Weapon[choice] !== "Null" && (
                                    <div>
                                        You have selected: {Weapon[choice]}
                                    </div>
                                )}
                                <button
                                    className="mt-4"
                                    onClick={() => sendP2Choice()}
                                >
                                    Send Response
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            {contractAddress !== undefined && responseSent && winner === "Null" && (
                <>
                    <div className="flex flex-col items-center justify-center mt-4">
                        {timerComponent(timer, setTimer)}
                        {timerExpired(winner, timer, p1Timeout)}
                    </div>
                    <div className="mt-4">
                        <a href={`https://sepolia.etherscan.io/address/${contractAddress}`}>
                            Match: {contractAddress}
                        </a>
                    </div>
                </>
            )}
            {winner === "Player2" ? (
                <>
                    <div>Congrats, you won!</div>
                    <div>You picked {Weapon[choice ?? 0]} while your opponnent picked {Weapon[Number(p1Choice ?? 0)]}</div>
                    <div>Your winnings of {Number(requiredStake) * 2} ETH will be sent over! Check your wallet momentarily</div>
                </>
            ) : winner === "Player1" ? (
                <>
                    <div>You lost!</div>
                    <div>You picked {Weapon[choice ?? 0]} while your opponnent picked {Weapon[Number(p1Choice ?? 0)]}</div>
                    <div>Your wager of {requiredStake} ETH has been sent to {p1Address}</div>
                </>
            ) : winner === "Draw" ? (
                <>
                    <div>It is a draw!</div>
                    <div>You both picked {Weapon[choice ?? 0]}!</div>
                    <div>Your stake of {requiredStake} ETH will be sent over; check your wallet momentarily</div>
                </>
            ) : (
                <span></span>
            )}
        </>
    )
}

export default P2UI;