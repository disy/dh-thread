import { workerData, parentPort, BroadcastChannel } from 'worker_threads';
import { decrypt } from '../Utils.mjs';
import { encrypt } from '../Utils.mjs';
import { generateDH } from '../Utils.mjs';
import crypto from 'crypto';

const { id, workerCount } = workerData;

const messageBroadcast = new BroadcastChannel('message');
const keyBroadcast = new BroadcastChannel('key');
let dh = generateDH();

let peers = [];

keyBroadcast.onmessage = ({ data }) => {
    peers = [...data];

    if (id === 0) {
        console.log('I am starting the sending queue now');

        sendMessage();
    }
}

parentPort.postMessage({
    id,
    pub: dh.getPublicKey(),
});


messageBroadcast.onmessage = (({ data }) => {
    const myMessage = data.messages[id];
    const senderId = data.sender;
    const senderPub = data.pub;
    const peer = peers[senderId];

    if (!myMessage) {
        console.log('No message for me :-(');
        return;
    }

    if (!peer) {
        console.log('Unknown sender');
        return;
    }

    if ((senderId + 1) % workerCount === id) {
        if (!peer.secret) {
            peer.secret = dh.computeSecret(peer.pub);
        }

        const messageKey = crypto.createHash('sha256').update(peer.secret);

        decrypt(messageKey.digest(), myMessage).then(decrypted => {
            sendMessage();
        });
    }

    peer.pub = senderPub;
    peer.secret = null;
});

async function sendMessage() {
    const startTime = new Date();

    const messages = await Promise.all(peers.map((peer, i) => {
        if (!peer) {
            return Promise.resolve(peer);
        }

        if (!peer.secret) {
            peer.secret = dh.computeSecret(peer.pub);
        }

        const messageKey = crypto.createHash('sha256').update(peer.secret);

        return encrypt(messageKey.digest(), `My name is ${id}.`);
    }));

    dh = generateDH();

    peers.forEach(peer => peer.secret = null);

    messageBroadcast.postMessage({
        messages,
        sender: id,
        pub: dh.getPublicKey(),
        sendingTime: (new Date()) - startTime,
    });
}
