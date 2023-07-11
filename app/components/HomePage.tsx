"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
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
    toBytes,
} from "viem";
import { sepolia } from "viem/chains";
import "viem/window";
import { rpsContract } from "../contracts/rpsContract";

const SEPOLIA_ID = "0xaa36a7";

export default function HomePage() {
    const [currentAccount, setCurrentAccount] = useState<String>("");
    const [hash, setHash] = useState<Hash>();
    const [receipt, setReceipt] = useState<TransactionReceipt>();
    const [onRightChain, setOnRightChain] = useState<Boolean>(false);

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

    const getRandomVal = () => {
        const newArray = new Uint8Array(32);
        crypto.getRandomValues(newArray);

        // Kind of annoying that viem doesn't have a built-in function for converting to a BigInt
        let value = BigInt(0);

        for (let i = 0; i < newArray.length; i++) {
            value <<= BigInt(8);
            value |= BigInt(newArray[i]);
        }

        return value;
    }

    const deployRPSContract = async () => {
        if (!currentAccount) return;
        
        const account = currentAccount as Address;
        const salt = getRandomVal();
        const playerOneTestHash = keccak256(encodePacked(["uint8", "uint256"], [1, salt]))

        // @ts-ignore
        const hash = await walletClient.deployContract({
            ...rpsContract,
            account,
            args: [playerOneTestHash, "0x" /* Pass in contract address */],
        });
        setHash(hash);
        console.log(hash);
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
                <button onClick={deployRPSContract}>
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
        </main>
    )
}

// Spock: <span className="font-Icons">v</span>
