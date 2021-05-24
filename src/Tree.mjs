import crypto from 'crypto';

export class Tree {
    constructor(root = null) {
        this.root = root;
    }

    getRoot() {
        return this.root;
    }

    findShallowLeaf() {
        return this._findShallowLeaf(this.root, 0);
    }

    _findShallowLeaf(node, level) {
        if (!node) {
            throw new Error('Node required');
        }

        const leftNode = node.getLeft();

        if (!leftNode) {
            return {
                level,
                node,
            };
        }

        const leftShallow = this._findShallowLeaf(leftNode, level + 1);

        if (leftShallow.level === level + 1) {
            return leftShallow;
        }

        const rightShallow = this._findShallowLeaf(node.getRight(), level + 1);

        return leftShallow.level <= rightShallow.level ? leftShallow : rightShallow;
    }

    findLeaf(id) {
        return this._findLeaf(id, this.root);
    }

    _findLeaf(id, node) {
        if (!node) {
            return;
        }

        const leftNode = node.getLeft();

        if (!leftNode) {
            return id === node.getId() ? node : undefined;
        }

        return this._findLeaf(id, leftNode) || this._findLeaf(id, node.getRight());
    }

    import(items) {
        if (this.root) {
            throw new Error('Tree is not empty');
        }

        this.root = this._buildSubTree(items);
    }

    _buildSubTree(items) {
        const item = items.shift();

        const node = new TreeNode(item);

        if (items[0] !== '_') {
            node.setLeft(this._buildSubTree(items));
            node.setRight(this._buildSubTree(items));
        } else {
            items.shift();
        }

        return node;
    }

    export() {
        return this._exportSubTree(this.root);
    }

    _exportSubTree(node) {
        if (node.isLeaf()) {
            return [node.getPub(), '_'];
        }

        return [
            node.getPub(),
            ...this._exportSubTree(node.getLeft()),
            ...this._exportSubTree(node.getRight()),
        ];
    }

    update(items) {
        if (!this.root) {
            throw new Error('Tree is empty');
        }

        this._updateSubTree(this.root, items);
    }

    _updateSubTree(node, items) {
        const item = items.shift();

        if (!item) {
            return;
        }

        if (node.getPub().toString('hex') !== item.toString('hex')) {
            node.setPub(item);
            node.setPriv(null);
        }

        if (items.length === 0) {
            if (!node.isLeaf()) {
                node.setLeft(null);
                node.setRight(null);
            }

            return;
        }

        if (items[0] !== '_') {
            if (items[0] !== 'r') {
                let leftNode = node.getLeft();

                if (!leftNode) {
                    leftNode = new TreeNode();
                    node.setLeft(leftNode);
                }

                this._updateSubTree(leftNode, items);
            } else {
                items.shift();
            }

            if (items.length === 0) {
                return;
            }

            let rightNode = node.getRight();

            if (!rightNode) {
                rightNode = new TreeNode();
                node.setRight(rightNode);
            }

            this._updateSubTree(rightNode, items);
        } else {
            items.shift();
        }
    }

    print() {
        this._print(this.root, 0);
    }

    _print(node, level) {
        let line = '';

        for(let i = 0; i < level; i++) {
            line += '  ';
        }

        line += node.getId();

        console.log(line);

        if (node.isLeaf()) {
            return;
        }

        this._print(node.getLeft(), level + 1);
        this._print(node.getRight(), level + 1);
    }
}

export class TreeNode {
    constructor(pub, priv = null) {
        this.pub = pub;
        this.priv = priv;

        this.id = null;
        this.parent = null;
    }

    getId() {
        if (!this.id) {
            this.id = crypto.createHash('sha1').update(typeof this.pub === 'number' ? this.pub.toString() : this.pub).digest('hex');
        }

        return this.id;
    }

    getPub() {
        return this.pub;
    }

    setPub(pub) {
        this.pub = pub;

        this.id = null;
    }

    getPriv() {
        return this.priv;
    }

    setPriv(priv) {
        this.priv = priv;
    }

    getParent() {
        return this.parent;
    }

    setParent(parent) {
        this.parent = parent;
    }

    getRight() {
        return this.right;
    }

    setRight(right) {
        this.right = right;

        right.setParent(this);
    }

    getLeft() {
        return this.left;
    }

    setLeft(left) {
        this.left = left;

        left.setParent(this);
    }

    isLeaf() {
        return !this.left && !this.right;
    }
}
