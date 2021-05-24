import { TreeNode } from './Tree.mjs';
import { generateDH } from './Utils.mjs';
import { updateNode } from './Utils.mjs';

export function mergeNodes(left, right) {
    const root = new TreeNode();

    root.setLeft(left);
    root.setRight(right);

    updateNode(root);

    return root;
}

export function buildTree(items) {
    const left = items.shift();
    const right = items.shift();

    if (!left || !right) {
        return left;
    }

    items.push(mergeNodes(left, right));

    return buildTree(items);
}

export function refreshLeaf(leafId, tree) {
    const update = {
        keyId: leafId,
        path: [],
    };

    const newDH = generateDH();
    const myLeaf = tree.findLeaf(leafId);

    myLeaf.setPub(newDH.getPublicKey());
    myLeaf.setPriv(newDH.getPrivateKey());

    update.path.push(myLeaf.getPub());

    let current = myLeaf.getParent();

    try {
        while (current) {
            current.setPriv(null);
            current.setPub(null);

            updateNode(current);

            update.path.push(current.getPub());

            current = current.getParent();
        }
    } catch (err) {
        console.log('Could not update tree', err);
        return;
    }

    return [update, myLeaf];
}