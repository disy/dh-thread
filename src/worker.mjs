import crypto from 'crypto';
import { workerData, parentPort, BroadcastChannel } from 'worker_threads';
import { Thread } from './Thread.mjs';
import { Tree } from './Tree.mjs';
import { TreeNode } from './Tree.mjs';
import { refreshLeaf } from './TreeBuilder.mjs';
import { applyLeafUpdate } from './Utils.mjs';
import { decrypt } from './Utils.mjs';
import { encrypt } from './Utils.mjs';
import { updateNode } from './Utils.mjs';
import { generateDH } from './Utils.mjs';

const { id, workerCount } = workerData;

const messageBroadcast = new BroadcastChannel('message');
const treeBroadcast = new BroadcastChannel('tree');
const dh = generateDH();
const node = new TreeNode(dh.getPublicKey(), dh.getPrivateKey());

let thread = new Thread(workerCount);
let tree = new Tree();

treeBroadcast.onmessage = ({ data }) => {
    tree.import(data);

    const myLeaf = tree.findLeaf(node.getId());

    if (!myLeaf) {
        throw new Error('I am not part of the group');
    }

    myLeaf.setPriv(node.getPriv());

    let current = myLeaf.getParent();

    try {
        while (current) {
            updateNode(current);

            current = current.getParent();
        }
    } catch (err) {
        console.log('Could not update tree', err);
        return;
    }

    if (id === 0) {
        sendMessage();
    }
}

parentPort.postMessage(dh.getPublicKey());

messageBroadcast.onmessage = (({ data }) => {
    const messageKey = crypto.createHash('sha256').update(tree.getRoot().getPriv());

    if (data.sender !== id && data.update) {
        applyLeafUpdate(tree, data.update.keyId, data.update.path, node.getId());
    }

    if (data.sender !== id && data.thread) {
        thread.add(data.thread, data.threadContribution);
    }

    if ((data.sender + 1) % workerCount === id) {
        const { encrypted, update } = data;

        if (update) {
            messageKey.update(tree.getRoot().getPriv());
        }

        if (data.threadId) {
            if (data.threadId !== thread.getId()) {
                console.log('>>>> Thread ID differs', data.threadId, thread.getId());
                console.log('Receiving thread');
                const threadTree = new Tree(thread.getRoot());
                threadTree.print();
            }
            messageKey.update(thread.getSecret());
        }

        decrypt(messageKey.digest(), encrypted).then(decrypted => {
            sendMessage();
        });
    }
});

function sendMessage() {
    let startTime = new Date();

    const messageKey = crypto.createHash('sha256').update(tree.getRoot().getPriv());

    const [update, myLeaf] = process.env.THREAD ? [undefined, undefined] : refreshLeaf(node.getId(), tree);

    if (!process.env.THREAD) {
        node.setPub(myLeaf.getPub());
        node.setPriv(myLeaf.getPriv());
        messageKey.update(tree.getRoot().getPriv());
    }

    const threadContribution = process.env.THREAD ? thread.contribute() : undefined;

    if (thread.hasMinSize()) {
        messageKey.update(thread.getSecret());
    }

    encrypt(messageKey.digest(), `My name is ${id}.`).then(encrypted => {
        messageBroadcast.postMessage({
            encrypted,
            sender: id,
            update,
            threadId: thread.getId(),
            thread: thread.getRoot()?.getPub(),
            threadContribution: threadContribution?.getPub(),
            sendingTime: (new Date()) - startTime,
        });
    });
}
