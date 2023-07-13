"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/dist/client/router";
import { 
    createPublicClient,
    createWalletClient, 
    custom,
    http,
    Hash,
    Address,
    TransactionReceipt,
    stringify,
    encodePacked,
    keccak256, 
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

    const router = useRouter();

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

    const createRPSLSGame = async (
        choice: number,
        p2Address: string,
        stake: string,
    ) => {
        if (!currentAccount) return;
        
        const account = currentAccount as Address;
        const salt = getRandomVal();
        const p1Hash = keccak256(encodePacked(["uint8", "uint256"], [choice, salt]))

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
                // @ts-ignore
                args: [p1Hash, p2Address],
                value: BigInt(stake),
            });
            setHash(hash);
            console.log(hash);
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
            {currentAccount && onRightChain && !receipt && (
                <button onClick={() => createRPSLSGame(1, "", "")}>
                    Deploy Contract
                </button>
            )}
            {receipt && (
                <>
                    <div>
                        Contract address: {receipt.contractAddress}
                    </div>
                    <div>
                        Receipt:{' '}
                        <pre>
                            <code>{stringify(receipt, null, 2)}</code>
                        </pre>
                    </div>
                </>
            )}


            {router.query.peerId === undefined ? (
                { /* Display Player1 UI and pass in current account */ }
            ) : (
                { /* Display Player2 UI and pass in peerID and current account*/ }
            )}
        </main>
    )
}

// Spock: <span className="font-Icons">v</span>
