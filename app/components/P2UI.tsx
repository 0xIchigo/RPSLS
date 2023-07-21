import { useState, useEffect } from "react";
import { 
    Hash, 
    Address, 
    parseEther 
} from "viem";
import { DataConnection } from "peerjs";
import { useInterval } from "usehooks-ts";
import { rpsContract } from "../contracts/rpsContract";
import Timer from "../../public/utils/Timer";
import { Winner, MoveInfo, TimerSettings, Weapon, PeerMessage } from "../@types/types";
import initializePeer from "@/public/utils/initializePeer";


const P2UI = (props: { playerAddress: string, publicClient: any, walletClient: any, peerId: string | null }) => {
    const DEFAULT_STAKE = "0.0001";
    /*
        Since Player 1's move is already hashed and committed, we don't have to worry about making Player
        Two's move hidden. Here, we can use the useState() hook to have the value persist
    */
    const [choice, setChoice] = useState<Number>(0);
    const [requiredStake, setRequiredStake] = useState<string>(DEFAULT_STAKE);
    const [contractAddress, setContractAddress] = useState<string>();
    const [connected, setConnected] = useState<DataConnection>();
    const [winner, setWinner] = useState<Winner>();
    const [p1Address, setP1Address] = useState<string>("");
    const [p1Choice, setP1Choice] = useState<Number>();
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
        choice: number,
    ) => {
        try {
            const { request } = await props.publicClient.simulateContract({
                ...rpsContract,
                account: props.playerAddress as Address,
                address: contractAddress,
                functionName: "play",
                args: [choice],
                value: parseEther(requiredStake)
            });

            const hash = await props.walletClient.writeContract(request);
            const receipt = await props.publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status !== "success") throw Error(`Transaction failed: ${receipt}`);

            setChoice(choice);
            timeSinceLastAction();
        } catch (err) {
            console.log(`Error sending choice: ${err}`);
            console.log("Please remember to stake the correct Ether value");
        }
    };

    const getBlockchainInfo = async () => {
        if (contractAddress) {

            try {
                // We set the p1Moved to true in the createRPSLSGame function and therefore do not have to check again -
                // the contract will not deploy without the hash
                const [p1MoveHash, stake, p2Move] = await Promise.all([
                    props.publicClient.readContract({
                        ...rpsContract,
                        address: contractAddress,
                        functionName: "c1"
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
                    setRequiredStake(stake);
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
        if (contractAddress) getBlockchainInfo();
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
                        functionName: "",
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
                        return setContractAddress(data.address);
                    } else if (data._type === "Player1Choice") {
                        return setP1Choice(data.choice);
                    } else if (data._type === "Winner") {
                        setTimer({ ...timer, status: "Null", reset: true });
                        return setWinner(data.player)
                    } else {
                        return;
                    }
                });
            });
        })()
    }, [props.peerId, props.playerAddress, timer]);


    return (
        <>
            {typeof(props.peerId) === null ? (
                <div>Error! The peer ID is of type null: {props.peerId}</div>
            ):
                <div>Hello!</div>
            }
            {connected && p1Address && (
                <div>Player Ones address is {p1Address}</div>
            )}
        </>
    )
}

export default P2UI;