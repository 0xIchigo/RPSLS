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
import { Winner, MoveInfo, TimerSettings, Weapon } from "../@types/types";


const P2UI = (props: { playerAddress: String, publicClient: any, walletClient: any, peerId: string | null }) => {
    const DEFAULT_STAKE = "0.0001";
    /*
        Since Player 1's move is already hashed and committed, we don't have to worry about making Player
        Two's move hidden. Here, we can use the useState() hook to have the value persist
    */
    const [choice, setChoice] = useState<Number>(0);
    const [requiredStake, setRequiredStake] = useState<string>(DEFAULT_STAKE);
    const [contractAddress, setContractAddress] = useState<Hash>();
    const [connected, setConnected] = useState<DataConnection>();
    const [p1Address, setP1Address] = useState<String>("");
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
        setChoice(choice);
        try {
            const { request } = await props.publicClient.simulateContract({
                ...rpsContract,
                account: props.playerAddress as Address,
                address: contractAddress,
                functionName: "play",
                args: [choice],
                value: parseEther(requiredStake)
            });

            await props.walletClient.writeContract(request);

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

    const p1Timeout = async () => {
        console.log("Checking if Player 2 timed out...");

        try {
            const { request } = await props.publicClient.simulateContract({
                ...rpsContract,
                account: props.playerAddress as Address,
                address: contractAddress,
                functionName: "j1Timeout",
            });

            await props.walletClient.writeContract(request);
        } catch (err) {
            console.log(`Error checking if Player 2 timed out: ${err}`);
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

    return (
        <>
            {typeof(props.peerId) === null ? (
                <div>Error! The peer ID is of type null: {props.peerId}</div>
            ):
                <div>Hello!</div>
            }
        </>
    )
}

export default P2UI;