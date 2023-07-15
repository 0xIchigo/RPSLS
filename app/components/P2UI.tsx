import { useState } from "react";


const P2UI = (props: { playerAddress: String, publicClient: any, walletClient: any, peerId: string | null }) => {
    /*
        Since Player 1's move is already hashed and committed, we don't have to worry about making Player
        Two's move hidden. Here, we can use the useState() hook to have the value persist
    */
    const [choice, setChoice] = useState<Number>(0);

    return (
        <>
            {typeof(props.peerId) === null ? (
                <div>Error! The peer ID is of type null: {props.peerId}</div>
            ):
                <div>Hello!</div>
            }
        </>
    )
}

export default P2UI;