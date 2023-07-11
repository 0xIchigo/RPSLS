import Image from 'next/image'

export default function Home() {
  return (
    <main className="flex flex-col justify-center items-center p-4 max-w-5xl mx-auto">
      <div className="flex flex-row justify-center items-center text-5xl">
        <h1 className="font-FinalFrontier">
          Rock, Paper, Scissors, Lizard, Spock
        </h1>
      </div>
    </main>
  )
}

// Spock: <span className="font-Icons">v</span>
