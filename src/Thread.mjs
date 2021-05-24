import { TreeNode } from "./Tree.mjs";
import { mergeNodes } from "./TreeBuilder.mjs";
import { generateDH } from "./Utils.mjs";

export class Thread {
    constructor(minSize) {
        this.minSize = minSize;
        this.size = 0;
        this.root = null;
    }

    getSecret() {
        return this.root?.getPriv();
    }

    getRoot() {
        return this.root;
    }

    getId() {
        return this.hasMinSize() ? this.root?.getId() : undefined;
    }

    contribute() {
        const dh = generateDH();
        const node = new TreeNode(dh.getPublicKey(), dh.getPrivateKey());

        if (!this.root) {
            this.root = node;
        } else if(this.root.getPriv()) {
            this.root = mergeNodes(node, this.root);
        } else {
            this.root = mergeNodes(this.root, node);
        }

        this.size++;

        return node;
    }

    add(currentRoot, contribution) {
        if (!this.root || !this.root.getPriv()) {
            this.root = new TreeNode(currentRoot);
        } else {
            this.root = mergeNodes(new TreeNode(contribution), this.root);
        }

        this.size++;
    }

    hasMinSize() {
        return this.size >= this.minSize;
    }
}