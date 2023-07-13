import Peer from "peerjs";

const initializePeer = async (id: string): Promise<Peer> => {
    const peer = new Peer(id);

    try {
        await new Promise<void>((resolve, reject) => {
            peer.on("error", (err) => {
                console.error(err);
                reject(`Could not create peer: ${err.toString()}`);
            });

            peer.on("open", () => {
                resolve();
            });
        });
    } catch (err) {
        throw new Error(`Peer initialization failed: ${err}`);
    }

    return peer;
} 

export default initializePeer;