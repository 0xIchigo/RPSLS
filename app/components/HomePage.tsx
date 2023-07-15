"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
    createPublicClient,
    createWalletClient, 
    custom,
    http,
    Hash,
    Address,
    Hex,
    TransactionReceipt,
    stringify,
    encodePacked,
    keccak256, 
    parseEther
} from "viem";
import { sepolia } from "viem/chains";
import "viem/window";
import { rpsContract } from "../contracts/rpsContract";
import getRandomVal from "../../public/utils/getRandomVal";

import  P1UI  from "./P1UI";
import  P2UI from "./P2UI"

const SEPOLIA_ID = "0xaa36a7";

export default function HomePage() {
    const [currentAccount, setCurrentAccount] = useState<String>("");
    const [hash, setHash] = useState<Hash>();
    const [receipt, setReceipt] = useState<TransactionReceipt>();
    const [onRightChain, setOnRightChain] = useState<Boolean>(false);

    let saltRef = useRef<String | undefined>();

    const searchParams = useSearchParams();

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http()
    });

    const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum!)
    });

    const handleConnect = async () => {
        const [address] = await walletClient.requestAddresses();
        setCurrentAccount(address);
    }

    saltRef.current = "testing";

    const createRPSLSGame = async (
        choice: number,
        p2Address: string,
        stake: string,
    ) => {
        if (!currentAccount) return;
        
        const account: Address = currentAccount as Address;
        const salt = getRandomVal();
        const p1Hash: Hex = keccak256(encodePacked(["uint8", "uint256"], [choice, salt])) as Hex;

        try {
            // @ts-ignore
            const hash = await walletClient.deployContract({
                ...rpsContract,
                account,
                /*
                    The user is passing in the address with the 0x hex prefix but TS doesn't like us putting in
                    just the string value as it expects type `0x${string}`
                    When you copy an address from MM it includes the prefix so it is reasonable to assume the
                    user will also include it here
                */
                
                args: [p1Hash, p2Address as Address],
                value: parseEther(stake),
            });
            setHash(hash);
        } catch {
            console.log("Failed to deploy contract - invalid data provided!");
            console.log("Please ensure to pass the correct Player 2 address (with the leading 0x prefix), and the numeric value of Ether you wish to stake");
        }
    }

    const checkWalletConnected = async () => {
        if (typeof window !== "undefined") {
            const { ethereum } = window;

            if (ethereum) {
                ethereum.on("accountsChanged", function (accounts: any) {
                    if (accounts[0] == undefined) setCurrentAccount("");
                })

                ethereum.on("chainChanged", function (chainId: string) {
                    if (chainId !== SEPOLIA_ID) setOnRightChain(false);
                })

                const accounts = await ethereum.request({ method: "eth_accounts"});
                accounts.length !== 0 ? setCurrentAccount(accounts[0]) : console.log("No account found!");

                (window as any).ethereum.chainId == SEPOLIA_ID ? setOnRightChain(true) : setOnRightChain(false);

            } else {
                console.log("Please install Metamask to play RPSLS!");
            }
        }
    }

    const peerIdCheck = () => {
        console.log("PEER ID CHECK")
        console.log(searchParams.get("peerId"));
        console.log("********************************");
        console.log(searchParams);
    }

    useEffect(() => {
        ;(async () => {
            if (hash) {
                const receipt = await publicClient.waitForTransactionReceipt({ hash })
                setReceipt(receipt);
            }
        })()
    }, [hash]);

    useEffect(() => {
        checkWalletConnected();
    }, []);


    return (
        <main className="flex flex-col justify-center items-center p-4 max-w-5xl mx-auto">
            <nav className="min-w-full px-4 py-1 top-0 z-10 text-white">
            <div className="max-w-5xl mx-auto px-4 mb-10">
                <div className="flex flex-row-reverse items-center h-16">
                    { currentAccount 
                    ?   <button className="rounded-lg border-white border-2 px-4 py-2 hover:text-green">
                            Connected: {currentAccount}
                        </button> 
                    :   <button onClick={handleConnect} className="rounded-lg border-white border-2 px-4 py-2 hover:text-green">
                            Connect Wallet
                        </button>}
                </div>
                </div>
            </nav>
            <div className="flex flex-row justify-center items-center text-5xl">
                <h1 className="font-FinalFrontier">
                    Rock, Paper, Scissors, Lizard, Spock
                </h1>
            </div>
            {(currentAccount == "") && (
                <div className="mt-4">
                    Please connect your wallet to play!
                </div>
            )}
            {currentAccount && !onRightChain && (
                <div className="mt-4">
                    Please switch to the Sepolia Testnet to play!
                </div>
            )}

            { searchParams.get("peerId") === null ? (
                <P1UI playerAddress={currentAccount} publicClient={publicClient} walletClient={walletClient} />
            ) : (
                <P2UI playerAddress={currentAccount} />
            )}

            {searchParams.get("peerId")}
        </main>
    )
}

// Spock: <span className="font-Icons">v</span>

/*
    {currentAccount && onRightChain && !receipt && (
                <button onClick={() => createRPSLSGame(1, "0xA26644Bf5797F70243C00a8f713c7979a7295BF2", "0.001")}>
                    Deploy Contract
                </button>
            )}
            {receipt && (
                <>
                    <div>
                        Contract address: {receipt.contractAddress}
                        {typeof(receipt.contractAddress)}
                    </div>
                    <div>
                        Receipt:{' '}
                        <pre>
                            <code>{stringify(receipt, null, 2)}</code>
                        </pre>
                    </div>
                </>
            )}
*/
