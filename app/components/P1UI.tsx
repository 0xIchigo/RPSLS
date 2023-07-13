import { useState, useEffect, useRef } from "react";
import { Peer, DataConnection } from "peerjs";
import { nanoid } from "nanoid";
import {
    keccak256,
    encodePacked,
    parseEther,
    Address,
    Hash,
    Hex
} from "viem";
import { rpsContract } from "../contracts/rpsContract";
import getRandomVal from "../../public/utils/getRandomVal";
import initializePeer from "../../public/utils/initializePeer";
import { Winner, PeerMessage, MoveInfo } from "../@types/types";

enum Weapon {
    "Null",
    "Rock",
    "Paper",
    "Scissors",
    "Spock",
    "Lizard",
}



const P1UI = (props: { playerAddress: String, publicClient: any, walletClient: any }) => {
    const DEFAULT_STAKE = "0.0001";

    const [stake, setStake] = useState<String>(DEFAULT_STAKE);
    const [peerId, setPeerId] = useState<String>("");
    const [connected, setConnected] = useState<DataConnection>();
    const [p2Address, setP2Address] = useState<String>("");
    const [p2Response, setP2Response] = useState<Number>(0);
    const [winner, setWinner] = useState<Winner>("Null");
    const [hash, setHash] = useState<Hash>();
    const [contractAddress, setContractAddress] = useState<Hash>();
    const [generateNewSalt, setGenerateNewSalt] = useState<Boolean>(false);
    const [moveInfo, setMoveInfo] = useState<MoveInfo>({
        p1Moved: false,
        p2Moved: false,
        p2Choice: 0, // Defaults to Null
    });

    /*
        The value stored in a useRef() hook is not part of the component's state and is not directly
        accessible from outside the component or the browser's console. This way we can persist the
        value of the salt between functions.
    */
    let saltRef = useRef<bigint | undefined>();

    /*
        We generate a new salt every game such that any sort of pass the hash (PtH) attack is prevented -
        an attacker that knows the salt of the first game has no insight into the salt used in the second
        game
    */
    useEffect(() => {
        if (generateNewSalt) saltRef.current = getRandomVal();
    }, [generateNewSalt])

    /*
        Using the logic above, we can also use a useRef() hook to keep track of Player 1's move so we can 
        pass it in later to determine a winner via the solve() function in rps.sol
    */
   let moveRef = useRef<Weapon | undefined>();

    const createRPSLSGame = async (
        choice: number,
        p2Address: string,
        stake: string,
    ) => {
        if (!props.playerAddress) return;
        moveRef.current = choice;

        const account = props.playerAddress as Address;
        setGenerateNewSalt(true);
        const p1Hash: Hex = keccak256(encodePacked(["uint8", "uint256"], [choice, saltRef.current as bigint])) as Hex;

        try {
            const hash = await props.walletClient.deployContract({
                ...rpsContract,
                account,
                args: [p1Hash, p2Address as Address],
                value: parseEther(stake),
            });

            setHash(hash);

            // Resetting moveInfo for the new game after Player One moves
            setMoveInfo({
                p1Moved: true,
                p2Moved: false,
                p2Choice: 0,
            });

            const receipt = await props.publicClient.waitForTransactionReceipt({ hash });
            setContractAddress(receipt.contractAddress);
            console.log(`Game Address: ${contractAddress}`);

            let peerMessage: PeerMessage = {
                _type: "ContractAddress",
                address: contractAddress!,
            };

            connected?.send(peerMessage);


        } catch {
            console.log("Failed to deploy contract - invalid data provided!");
            console.log("Please ensure to pass the correct Player 2 address (with the leading 0x prefix), and the numeric value of Ether you wish to stake");
        }
        setGenerateNewSalt(false);
    }

    useEffect(() => {
        console.log("Trying to create a connection with your peer...");

        const createPeer = async () => {
            const id = `RPSLS-${nanoid()}`;
            const peer = await initializePeer(id);
            setPeerId(peer.id);

            peer.on("error", (e) => console.log(`Error: ${e}`));
            peer.on("open", () => {});

            peer.on("connection", (connection) => {
                connection.on("error", (e) => console.log(`Connection Error: ${e}`));

                connection.on("open", () => {
                    connection.send("Connection established with Player 1");
                    const peerMessage: PeerMessage = {
                        _type: "Player1Address",
                        address: props.playerAddress,
                    }
                    connection.send(peerMessage);
                });

                setConnected(connection);

                /*
                    We can ignore TypeScript's concerns of data being type unknown as the only 
                    data we will be passing P2P will be of type PeerMessage
                */
                //@ts-ignore
                connection.on("data", (data: PeerMessage) => {
                    if (data._type === "Connected") {
                        return console.log("Player 2 has connected");
                    } else if (data._type === "Player2Address") {
                        // SET TIMER
                        return setP2Address(data.address)
                    } else {
                        return console.log("");
                    }
                })
            });
        };

        createPeer();
    }, []);

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
                console.log(`Error getting game info from Sepolia: ${err}`);
            }
        }
    }

    return (
        <div>Hello!</div>
    )
}

export default P1UI;