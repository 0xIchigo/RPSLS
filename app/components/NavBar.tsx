import Link from "next/link";

export default function NavBar() {
    return (
        <nav className="min-w-full px-4 py-1 top-0 z-10 text-white">
            <div className="max-w-5xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="sm:text-2xl text-lg font-semibold text-white hover:text-orange mr-2 no-underline">RPSLS</Link>
                    <button className="rounded-lg border-white border-2 px-4 py-2 hover:text-orange">
                        Connect Wallet
                    </button>
                </div>
            </div>
        </nav>
    )
}