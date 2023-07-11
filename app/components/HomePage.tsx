"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import "viem/window";

const SEPOLIA_ID = "0xaa36a7";

export default function HomePage() {
    const [currentAccount, setCurrentAccount] = useState("");
    const [onRightChain, setOnRightChain] = useState(false);

    const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum!)
    });

    const handleConnect = async () => {
        const [address] = await walletClient.requestAddresses();
        setCurrentAccount(address);
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
        {onRightChain && (
            <div>
                You are on the right chain!
            </div>
        )}
    </main>
  )
}

// Spock: <span className="font-Icons">v</span>
