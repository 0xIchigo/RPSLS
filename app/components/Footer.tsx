import Link from "next/link";
import { VscAccount } from "react-icons/vsc";
import { FaGithub } from "react-icons/fa";

export default function Footer() {
    return (
        <footer className="fixed bottom-0 min-w-full px-4 py-1 z-10 text-white">
            <div className="flex items-center justify-center mx-auto p-4 text-2xl">
                <Link href="https://0xichigo.xyz">
                    <VscAccount />
                </Link>
                <Link href="https://github.com/0xIchigo/rpsls" className="text-white mx-2">
                    <FaGithub />
                </Link>
            </div>
        </footer>
    )
}