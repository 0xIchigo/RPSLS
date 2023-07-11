"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Address, createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import "viem/window";


const walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum!)
})

export default function NavBar() {
    const [currentAccount, setCurrentAccount] = useState("");

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

                const accounts = await ethereum.request({ method: "eth_accounts"});
                accounts.length !== 0 ? setCurrentAccount(accounts[0]) : console.log("No account found!");

            } else {
                console.log("Please install Metamask to play RPSLS!");
            }
        }
    }

    useEffect(() => {
        checkWalletConnected();
    }, []);

    return (
        <nav className="min-w-full px-4 py-1 top-0 z-10 text-white">
            <div className="max-w-5xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="sm:text-2xl text-lg font-semibold text-white hover:text-green mr-2 no-underline">RPSLS</Link>
                    
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
    )
}