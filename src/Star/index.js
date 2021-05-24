import path from 'path';
import { Worker, BroadcastChannel } from 'worker_threads';

const NUM_USER = process.env.SIZE ? parseInt(process.env.SIZE, 10) : 4;

const keyBroadcast = new BroadcastChannel('key');
const messageBroadcast = new BroadcastChannel('message');

const peers = [];
const peerCounter = [];
const workers = [];
const sendingTimes = [];

let messageCounter = 0;

messageBroadcast.onmessage = ({ data }) => {
    messageCounter++;

    sendingTimes.push(data.sendingTime);

    if (messageCounter >= Math.max(6 * NUM_USER, 100)) {
        const avg = sendingTimes.reduce( ( p, c ) => p + c, 0 ) / sendingTimes.length;

        console.log(`To send ${sendingTimes.length} messages it took in average ${avg}ms.`);

        console.log(`${NUM_USER},${avg}`);

        workers.forEach(worker => worker.terminate());

        keyBroadcast.close();
        messageBroadcast.close();
    }
}

for (let i = 0; i < NUM_USER; i++) {
    const worker = new Worker(path.join(path.resolve(), 'src', 'Star', 'worker.mjs'), { workerData: { id: i, workerCount: NUM_USER } });

    worker.on('error', (error) => {
        console.log('Worker error', error);
    });

    worker.on('message', (data) => {
        peers[data.id] = {
            pub: data.pub,
        };

        peerCounter.push(data.id);

        if (peerCounter.length === NUM_USER) {
            console.log('All users are ready.');

            keyBroadcast.postMessage(peers);
        }
    });

    workers.push(worker);
}
