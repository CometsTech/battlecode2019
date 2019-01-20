function make_array_helper(e, l_s, s, end) {
    /** don't use this this is to help with make_array */
    if (s === end){
        return e;
    }
    if (s + 1 === end){
        let a = [];
        for (let i = 0; i<l_s[s]; i++){
            a.push(e);
        }
        return a;
    }
    let a = [];
    for (let i = 0; i < l_s[s]; i++){
        a.push(make_array_helper(e, l_s, s + 1, end));
    }
    return a;
}
function make_array(e, l_s) {
    /** makes an n-d array. The array is filled with e.
     * To make a nxm matrix filled with zeros, call make_array(0, [n, m])*/
    return make_array_helper(e, l_s, 0, l_s.length);
}
class PriorityQueue{
    /** A min heap by its element's val property
     * This is a simple binary heap. Could be improved by using a better data structure like a fibbonacci heap.*/
    constructor(){
        this.a = [0]; // element at index 0 doesn't matter
    }
    push(e){
        let i = this.a.length;
        this.a.push(e); // kinda redundant
        while (i > 1 && this.a[i >> 1].val > e.val){
            this.a[i] = this.a[i >> 1];
            i >>= 1; // lol
        }
        this.a[i] = e;
    }
    pop(){
        let o = this.a[1];
        let e = this.a.pop(); // this is the element that is moving down the tree
        if (this.a.length === 1) {return o;}
        // maybe replace the pop with something more efficient
        let i = 1;
        while (1){
            if ((i << 1) < this.a.length && this.a[i << 1].val < e.val){
                this.a[i] = this.a[i << 1];
                i = i << 1;
            }
            else if ((i << 1) + 1 < this.a.length && this.a[(i << 1) + 1].val < e.val){
                this.a[i] = this.a[(i << 1) + 1];
                i = (i << 1) + 1;
            }
            else{
                break;
            }
        }
        this.a[i] = e;
        return o;
    }
    is_empty(){
        return this.a.length <= 1;
    }
}