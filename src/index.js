import path from 'path';
import { TreeNode } from './Tree.mjs';
import { generateDH } from './Utils.mjs';
import { Worker, BroadcastChannel } from 'worker_threads';
import { buildTree } from './TreeBuilder.mjs';
import { Tree } from './Tree.mjs';

const NUM_USER = process.env.SIZE ? parseInt(process.env.SIZE, 10) : 4;
const nodes = [];
const dh = generateDH();
const node = new TreeNode(dh.getPublicKey(), dh.getPrivateKey());
const treeBroadcast = new BroadcastChannel('tree');
const messageBroadcast = new BroadcastChannel('message');

let tree;

let messageCounter = 0;

const sendingTimes = [];
const workers = [];

messageBroadcast.onmessage = ({ data }) => {
    messageCounter++;

    sendingTimes.push(data.sendingTime);

    if (messageCounter >= Math.max(6 * NUM_USER, 100)) {
        const avg = sendingTimes.reduce( ( p, c ) => p + c, 0 ) / sendingTimes.length;

        console.log(`To send ${sendingTimes.length} messages it took in average ${avg}ms.`);

        console.log(`${NUM_USER},${avg}`);

        workers.forEach(worker => worker.terminate());

        treeBroadcast.close();
        messageBroadcast.close();
    }
}

function initGroup() {
    const root = buildTree(nodes.flat());
    tree = new Tree(root);

    console.log('Tree ready');

    treeBroadcast.postMessage(tree.export());
}

for (let i = 0; i < NUM_USER; i++) {
    const worker = new Worker(path.join(path.resolve(), 'src', 'worker.mjs'), { workerData: { id: i, workerCount: NUM_USER } });

    worker.on('error', (error) => {
        console.log('Worker error', error);
    });

    worker.on('message', (pub) => {
        nodes.push([new TreeNode(pub), node]);

        if (nodes.length === NUM_USER) {
            console.log('All users are ready.');

            initGroup();
        }
    });

    workers.push(worker);
}
