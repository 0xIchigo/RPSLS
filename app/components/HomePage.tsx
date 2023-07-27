"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
    createPublicClient,
    createWalletClient, 
    custom,
    webSocket
} from "viem";
import { sepolia } from "viem/chains";
import "viem/window";
import { AiOutlineClose } from "react-icons/ai";
import  P1UI  from "./P1UI";
import  P2UI from "./P2UI";

import dotenv from "dotenv";
dotenv.config();

const SEPOLIA_ID = "0xaa36a7";
const transport = webSocket(process.env.REACT_APP_SEPOLIA as string);

export default function HomePage() {
    const [currentAccount, setCurrentAccount] = useState<string>("");
    const [onRightChain, setOnRightChain] = useState<Boolean>(false);
    const [toggleRulesPopup, setToggleRulesPopup] = useState<Boolean>(false);

    const searchParams = useSearchParams();

    const RulesPopup = () => {
        
        const handleClose = () => setToggleRulesPopup(false);

        return (
            <div className="fixed top-0 left-0 z-999 w-screen h-screen bg-black bg-opacity-75 flex items-center justify-content">
                <div className=" max-h-1/2-screen w-120 rounded bg-black px-4 py-2 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 overflow-y-scroll border-white border-2"> 
                    <div className="flex flex-row-reverse text-center mt-1 mb-2 cursor-pointer hover:text-green" onClick={handleClose}>
                        <AiOutlineClose />
                    </div>
                    <div className="text-xl font-semibold font-FinalFrontier mb-4">
                        Rules
                    </div>
                    <div className="pl-2 mb-4">
                        To play RPSLS each player must pick either Rock, Paper, Scissors, Lizard, or Spock and reveal it at the same time as the other player. A winning hand is determined as follows:
                    </div>
                    <ul className="pl-8 list-disc list-inside mb-4">
                        <li>Scissors cuts Paper</li>
                        <li>Paper covers Rock</li>
                        <li>Rock crushes Lizard</li>
                        <li>Lizard poisons Spock</li>
                        <li>Spock smashes Scissors</li>
                        <li>Scissors decapitates Lizard</li>
                        <li>Lizard eats paper</li>
                        <li>Paper disproves Spock</li>
                        <li>Spock vaporizes Rock</li>
                        <li>Rock crushes scissors</li>
                    </ul>
                    <div className="pl-2 mb-4">
                        To play RPSLS using this app, Player One creates the game, commitmenting their move as a hash, staking some Ether, and inputs the address of the player they wish to play against. Player Two stakes the same amount of Ether as the Player One and submits their move. Then, Player One reveals their move and the contract distributes the Ether to the winner based on the winning combination, or splits the Ether in the case of a tie.
                    </div>
                    <div className="pl-2 mb-4">
                        If a party does not respond for more than 5 minutes then there is a timeout. If Player Two times out then Player One is able to retrieve their own stake. If, however, Player One times out, Player Two receives both of their stakes as Player One can only time out after a game has been created.
                    </div>
                    <div className="pl-2 mb-4">
                        If Player One does not enter an amount for the required stake and starts the game, there is a default stake of 0.0001 ETH.
                    </div>
                </div>
            </div>
        )
    }

    const publicClient = createPublicClient({
        chain: sepolia,
        transport,
    });

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

    const shortenAddress = (chars = 4): string => {
        return `${currentAccount.slice(0, chars + 2)}...${currentAccount.slice(-chars)}`;
    }


    return (
        <main className="flex flex-col justify-center items-center p-4 max-w-5xl mx-auto">
            <nav className="min-w-full px-4 py-1 top-0 z-10 text-white">
                <div className="max-w-5xl mx-auto px-4 mb-10">
                    <div className="flex flex-row-reverse justify-between items-center h-16">
                        { currentAccount 
                        ?   <button className="rounded-lg border-white border-2 px-4 py-2 hover:text-green">
                                Connected: {shortenAddress()}
                            </button> 
                        :   <button onClick={handleConnect} className="rounded-lg border-white border-2 px-4 py-2 hover:text-green">
                                Connect Wallet
                            </button>
                        }
                        <div className="font-FinalFrontier cursor-pointer hover:text-green text-lg" onClick={() => setToggleRulesPopup(true)}>
                            Rules
                        </div>
                    </div>
                </div>
            </nav>
            <div className="flex flex-row justify-center items-center text-5xl">
                <h1 className="font-FinalFrontier">
                    RPSLS
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
                <P2UI playerAddress={currentAccount} publicClient={publicClient} walletClient={walletClient} peerId={searchParams.get("peerId") as string} />
            )}
            {toggleRulesPopup && (
                <RulesPopup />
            )}
        </main>
    )
}