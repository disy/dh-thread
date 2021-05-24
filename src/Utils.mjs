import crypto from 'crypto';

const prime = crypto.createDiffieHellmanGroup('modp1').getPrime();

export function generateDH() {
    const dh = crypto.createDiffieHellman(prime);
    dh.generateKeys();

    return dh;
}

const childDH = crypto.createDiffieHellman(prime);
const nodeDH = crypto.createDiffieHellman(prime);

export function updateNode(node) {
    if (node.getPriv()) {
        return;
    }

    if (node.isLeaf()) {
        throw new Error('Can not update private part of a leaf');
    }

    const priv = node.getLeft().getPriv() || node.getRight().getPriv();

    if (!priv) {
        throw new Error('No private key available');
    }

    const pub = node.getLeft().getPriv() ? node.getRight().getPub() : node.getLeft().getPub();

    childDH.setPrivateKey(priv);
    childDH.generateKeys();

    const secret = childDH.computeSecret(pub);

    nodeDH.setPrivateKey(secret);
    nodeDH.generateKeys();

    if (node.getPub() && (new ArrayBuffer(node.getPub())).toString('hex') !== (new ArrayBuffer(nodeDH.getPublicKey())).toString('hex')) {
        throw new Error('Tree is outdated');
    }

    if (!node.getPub()) {
        node.setPub(nodeDH.getPublicKey());
    }

    node.setPriv(secret);
    node.getId();
}

export function applyLeafUpdate(tree, id, path, myId) {
    let changedNode = tree.findLeaf(id);

    if (!changedNode) {
        throw new Error('Node to update not found');
    }

    while (changedNode) {
        changedNode.setPub(path.shift());
        changedNode.setPriv(null);

        changedNode = changedNode.getParent();
    }

    let current = tree.findLeaf(myId);

    if (!current) {
        throw new Error('Could not found my own leaf');
    }

    while (current) {
        updateNode(current);

        current = current.getParent();
    }
}

export function decrypt(key, encrypted) {
    return new Promise(resolve => {
        const decipher = crypto.createDecipher('aes128', key);

        let decrypted = '';
        decipher.on('readable', () => {
            let chunk;

            while (null !== (chunk = decipher.read())) {
                decrypted += chunk.toString('utf8');
            }
        });
        decipher.on('end', () => {
            resolve(decrypted);
        });

        decipher.write(encrypted, 'hex');
        decipher.end();
    });
}

export function encrypt(key, plaintext) {
    return new Promise(resolve => {
        const cipher = crypto.createCipher('aes128', key);

        let encrypted = '';
        cipher.setEncoding('hex');

        cipher.on('data', (chunk) => encrypted += chunk);
        cipher.on('end', () => {
            resolve(encrypted);
        });

        cipher.write(plaintext);
        cipher.end();
    })
}