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
import getRandomVal from "@/public/utils/getRandomVal";
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

    const createRPSLSGame = async (
        choice: number,
        p2Address: string,
        stake: string,
    ) => {
        if (!props.playerAddress) return;
        
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
        }
    }, [])

    return (
        <div>Hello!</div>
    )
}

export default P1UI;