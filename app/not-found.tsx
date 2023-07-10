import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-col justify-center items-center p-4 max-w-5xl mx-auto">
            <div className="border-white border-2 p-4">
                <p className="pb-2">
                    Sorry anon, the page you<span>&#39;</span>re looking for doesn<span>&#39;</span>t exist
                </p>
                <p>
                    <Link href="/" className="flex items-center justify-center">Click to here return home</Link>
                </p>
            </div>
        </div>
    )
}