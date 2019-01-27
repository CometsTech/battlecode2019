
import {BCAbstractRobot, SPECS} from 'battlecode';
import util from "./util.js";

let pilgrim = {};

let log_times = false;
let verbosity = 2;

let built = false;
let step = -1;
const max_dist = 100000;
const PATHING_TO_NODE = 0;
const JUST_REACHED_NODE = 1;
const PATHING_TO_MAKE_CHURCH = 2;
const PATHING_BACK = 3;
const PATHING_TO_CHURCH = 4;
const MINING = 5;
const PATHING_TO_RESET = 6;


pilgrim.init = (self) => {

    let d;
    let tic;
    if (log_times) {
        d = new Date();
        tic = d.getTime();
    }
    /* State variables.*/
    self.state = 0;
    if (verbosity > 0) {
        self.log('init_pilgrim');
    }
    // return;
    /** Init move list. Similar to crusader*/
    let inv_diff_list = util.make_array(-1, [5, 5]);
    let diff_list = [];
    let rev_diff_list = [];
    for (let j = -2; j < 3; j++){
        for (let i = -2; i < 3; i++){
            if ((i * i + j * j <= 4) && (i !== 0 || j !== 0)){
                inv_diff_list[j + 2][i + 2] = diff_list.length;
                diff_list.push({x:i, y:j});
                rev_diff_list.push({x:-i, y:-j});
            }
        }
    }
    self.diff_list = diff_list;
    self.rev_diff_list = rev_diff_list;
    self.inv_diff_list = inv_diff_list;
    if (verbosity > 1){self.log('made move list');}

    self.parent_castle = undefined;
    let nearby_bots = self.getVisibleRobots();
    for (let i = 0; i < nearby_bots.length; i++){
        if (nearby_bots[i].team === self.me.team &&
            (nearby_bots[i].unit === SPECS.CASTLE || nearby_bots[i].unit === SPECS.CHURCH)){
            if (Math.abs(nearby_bots[i].x - self.me.x) <= 1 && Math.abs(nearby_bots[i].y - self.me.y) <= 1){
                self.parent_castle = nearby_bots[i];
            }
            self.map[nearby_bots[i].y][nearby_bots[i].x] = false; // This probably doesn't carry over to next turn
        }
    }
    let parent_castle_neighbors = [];
    for (let dy = -1; dy < 2; dy++){
        for (let dx = -1; dx < 2; dx++){
            let p = util.add_pos(self.parent_castle, {x: dx, y: dy});
            if (util.on_map(self, p) && self.map[p.y][p.x]){
                parent_castle_neighbors.push(p);
            }
        }
    }
    self.parent_castle_path = util.bfs(self, parent_castle_neighbors);




    if (log_times){
        d = new Date();
        self.log(d.getTime() - tic);
    }
    /** BFS distances*/
    let inv_loc_list = util.make_array(-1, [self.map_s_y, self.map_s_x]);
    let loc_list = [self.me];
    let fuel_locs = [];
    for (let j = 0; j < self.map_s_y; j++){
        for (let i = 0; i < self.map_s_x; i++){
            if (self.fuel_map[j][i]){
                fuel_locs.push({x:i, y:j});
                if (i !== self.me.x || j !== self.me.y){
                    inv_loc_list[j][i] = loc_list.length;
                    loc_list.push({x:i, y:j});
                }
            }
        }
    }
    // self.path_fuel = util.bfs(self, fuel_locs);
    let karb_locs = [];
    for (let j = 0; j < self.map_s_y; j++){
        for (let i = 0; i < self.map_s_x; i++){
            if (self.karbonite_map[j][i]){
                karb_locs.push({x:i, y:j});
                if (i !== self.me.x || j !== self.me.y){
                    inv_loc_list[j][i] = loc_list.length;
                    loc_list.push({x:i, y:j});
                }
            }
        }

    }
    self.inv_loc_list = inv_loc_list;
    // return;
    // self.path_karb = util.bfs(self, karb_locs);
    if (verbosity > 1){self.log('made bfs distances');}
    // this.fuel_tree_data = this.pilgrim_make_tree([this.me].concat(fuel_locs));
    // this.karb_tree_data = this.pilgrim_make_tree([this.me].concat(karb_locs));
    // self.gather_karb = true; // TODO: make some algo for this
    // if (self.me.turn === 1){
    //     self.gather_karb = true;
    // }
    // else if (self.me.turn === 2){
    //     self.gather_karb = false;
    // }
    // else{
    //     let fuel_weight = self.fuel / 10;
    //     let karb_weight = self.karbonite / 2;
    //     self.gather_karb = Math.random() * (fuel_weight + karb_weight) < fuel_weight;
    // }
    // return;
    if (log_times){
        d = new Date();
        self.log(d.getTime() - tic);
    }
    // return;
    let meta_loc_list = [];
    // let meta_id = util.make_array(-1, [self.map_s_y, self.map_s_x]);
    let loc_id = util.make_array(-1, [loc_list.length]);
    for (let i = 0; i < loc_list.length; i++){ // note how code relies on self.me being first
        let pos = loc_list[i];
        let my_id = meta_loc_list.length;
        if (loc_id[i] > -1){
            my_id = loc_id[i];
            meta_loc_list[my_id].push({p: pos, i: i});
        }
        else {
            loc_id[i] = meta_loc_list.length;
            meta_loc_list.push([{p: pos, i: i}]);
            let q = [pos];
            while (q.length > 0){
                let pop = q.shift();
                for (let dy = -2; dy < 3; dy++){
                    for (let dx = -2; dx < 3; dx++){
                        let p = util.add_pos(pop, {x: dx, y: dy});
                        if (util.on_map(self, p)){
                            let inv_i = inv_loc_list[p.y][p.x];
                            if (inv_i > -1 && loc_id[inv_i] === -1){
                                loc_id[inv_i] = my_id;
                                q.push(p);
                            }
                        }
                    }
                }
            }
        }
    }
    // self.log(meta_loc_list);
    // for (let i = 0; i < meta_loc_list.length; i++){
    //     self.log(meta_loc_list[i]);
    // }
    if (log_times){
        d = new Date();
        self.log(d.getTime() - tic);
    }
    let center_nodes = util.make_array(-1, meta_loc_list.length);
    let center_loc_list = util.make_array(-1, meta_loc_list.length);
    for (let i = 0; i < meta_loc_list.length; i++){
        let node_list = meta_loc_list[i];
        let min_max_dist = max_dist;
        let best_j = -1;
        for (let j = 0; j < node_list.length; j++){ // should be fine so long as map isn't one big resource deposit
            let max_dist = 0;
            for (let k = 0; k < node_list.length; k++){
                let dist = util.squared_distance(node_list[j].p, node_list[k].p);
                if (dist > max_dist){
                    max_dist = dist;
                }
            }
            if (max_dist < min_max_dist){
                min_max_dist = max_dist;
                best_j = j;
            }
        }
        // self.log(best_j);
        center_nodes[i] = best_j;
        center_loc_list[i] = node_list[best_j].p;
    }

    self.loc_list = loc_list;
    self.meta_loc_list = meta_loc_list;

    if (log_times){
        d = new Date();
        self.log(d.getTime() - tic);
    }
    self.tree_data = util.pilgrim_make_tree(self, center_loc_list);

    // self.log(self.tree_data.tree_info);
    // for (let i = 0; i < self.tree_data.tree_info.length; i++){
    //     let pos = self.tree_data.tree_info[i];
    //     self.tree_data.tree_info[i].is_karb = self.karbonite_map[pos.y][pos.x];
    // }
    self.last_node = -1;
    self.current_node = 0;
    if (verbosity > 1){
        self.log('fin init_pilgrim');
    }
    if (log_times){
        d = new Date();
        self.log(d.getTime() - tic);
    }
    self.made_voronoi_dist = false;
    self.has_init_node_vars = false;
    self.last_health = self.me.health;
};
function turn_reset(self){
    self.log('resettting');
    let tree_info = self.tree_data.tree_info;
    if (self.tree_data.voronoi_id[self.me.y][self.me.x] === tree_info[self.last_node].parent){
        // self.tree_data.tree_info[self.me.]
        self.current_node = tree_info[self.last_node].parent;
        self.state = PATHING_TO_NODE;
        return turn_path_to_node(self);
    }
    if (!self.made_voronoi_dist){
        let path_q = [];
        for (let y = 0; y < self.map_s_y; y++){
            for (let x = 0; x < self.map_s_x; x++){
                if (self.tree_data.voronoi_id[y][x] === tree_info[self.last_node].parent){
                    path_q.push({x: x, y: y});
                }
            }
        }
        self.voronoi_dist = util.bfs(self, path_q);
    }
    // this.log('a');
    let curr_dist = self.voronoi_dist[self.me.y][self.me.x];
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.voronoi_dist[p.y][p.x] === curr_dist - 1 && self.diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length > 0){
        let dir = valid_dirs[util.rand_int(valid_dirs.length)];
        return self.move(dir.x, dir.y);
    }
    valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && this.map[p.y][p.x] && self.voronoi_dist[p.y][p.x] === curr_dist && self.diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length === 0){
        self.log('path_reset blocked');
        return;
    }
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
}
function turn_path_to_node(self) {
    // for (let i = 0; i < self.vis_bots.length; i++){
    //     if (self.vis_bots[i].team !== self.me.team && self.vis_bots[i].unit !== SPECS.PILGRIM){
    //         self.last_node = self.current_node;
    //         self.log('aah theres a bot!');
    //         self.tree_data.tree_info[self.last_node].weight = 0;
    //         self.state = PATHING_TO_RESET;
    //         return turn_reset(self);
    //     }
    // }
    if (self.current_node < 0) {
        self.log('end of line');
        self.tree_data.tree_info[self.last_node].weight = 0;
        self.state = PATHING_TO_RESET;
        return turn_reset(self);
        // if (Math.random() < 0.1){
        //     let valid_dirs = [];
        //     for (let i = 0; i < self.diff_list.length; i++) {
        //         let p = util.add_pos(self.me, self.diff_list[i]);
        //         if (util.on_map(self, p) && self.map[p.y][p.x] && self.diff_vis[i] <= 0) {
        //             valid_dirs.push(self.diff_list[i]);
        //         }
        //     }
        //     // return;
        //     if (valid_dirs.length === 0){
        //         return;
        //     }
        //     // return;
        //     let i = util.rand_int(valid_dirs.length);
        //     return self.move(valid_dirs[i].x, valid_dirs[i].y);
        // }
        // return; // ditto as above
    }
    let tree_info = self.tree_data.tree_info;
    let target = tree_info[self.current_node];
    let curr_dist = util.get_tree_dist(self, {x: self.me.x, y: self.me.y, i: self.current_node});
    let node_list = self.meta_loc_list[self.current_node];
    if (curr_dist <= 1){
        self.log('at node');
        let fuel_weight = 10 / (self.fuel + 500);
        let karb_weight = 2 / (self.karbonite);
        let open_res = [];
        let open_weights = [];

        for (let i = 0; i < node_list.length; i++){
            let node = node_list[i];
            if (util.squared_distance(node.p, self.me) <= 100 && node.i > 0 &&
                (util.pos_eq(self.me, node.p) || self.loc_vis[node.i] <= 0)){
                self.log(node);
                open_res.push(node.p);
                open_weights.push((self.karbonite_map[node.p.y][node.p.x]? karb_weight: fuel_weight) *
                    (util.pos_eq(self.me, node.p)? 1000: 1));
            }
        }

        if (open_res.length > 0){
            self.log('pathing to sub node');
            let i = util.rand_weight(open_weights);
            self.log(open_res[i]);
            self.path_to_node = util.bfs(self, [open_res[i]]);
            self.state = PATHING_BACK;
            return turn_path_back(self);
        }
        self.log("couldn't find sub_node");
        let weights = [];
        let children = tree_info[self.current_node].children;
        for (let i = 0; i < children.length; i++){
            if (tree_info[children[i]].node_weight > 0) {
                weights.push(tree_info[children[i]].node_weight);
            }
        }
        let child = -1;
        if (children.length > 0){
            let i = util.rand_weight(weights);
            // self.log(i);
            child = children[i];
        }
        self.last_node = self.current_node;
        self.current_node = child;
        if (child === -1){
            self.log('end of line');
            return;
        }
        target = tree_info[self.current_node];
    }
    /*if ((self.current_node === 0 && !(self.karbonite_map[target.y][target.x] || self.fuel_map[target.y][target.x])) ||
        (self.tree_data.voronoi_id[self.me.y][self.me.x] === self.current_node && target_occupied)) {
        let weights = [];
        let children = tree_info[self.current_node].children;
        let fuel_weight = 10 / (self.fuel);
        let karb_weight = 2 / (self.karbonite);
        for (let i = 0; i < children.length; i++){
            weights.push(tree_info[children[i]].node_weight *
                (tree_info[children[i]].is_karb? karb_weight: fuel_weight));
        }
        let child = -1;
        if (children.length > 0){
            let i = util.rand_weight(weights);
            // self.log(i);
            child = children[i];
        }
        self.current_node = child;
        if (child === -1){
            self.log('end of line');
            return;
        }
        target = tree_info[self.current_node];

    }
*/
    // self.log(self.current_node);
    curr_dist = util.get_tree_dist(self, {x: self.me.x, y: self.me.y, i: self.current_node});
    if (curr_dist === max_dist){
        self.current_node = self.tree_data.voronoi_id[self.me.y][self.me.x];
        return turn_path_to_node(self);
    }
    /*if (curr_dist === 0){
        self.log('arrived');
        self.log([self.me.x, self.me.y]);
        self.state = JUST_REACHED_NODE;
        return turn_on_reaching_node(self);
    }*/
    // this.log(curr_dist);
    let diff_vis = self.diff_vis;
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.map[p.y][p.x] &&
            util.get_tree_dist(self, p) === curr_dist - 1 && diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length > 0){
        let dir = valid_dirs[util.rand_int(valid_dirs.length)];
        return self.move(dir.x, dir.y);
    }
    // return;
    if (Math.random() < 0.8){
        return;
    }
    valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.map[p.y][p.x] && util.get_tree_dist(self, p) === curr_dist && diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    // return;
    if (valid_dirs.length === 0){
        self.log('path_to_node blocked');
        return;
    }
    // return;
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
    // this.log("Help! I'm lost!"); // TODO: make lost contingincy
}
function turn_on_reaching_node(self){
    self.has_init_node_vars = true;
    self.log('turn_on_reaching_node');
    // self.path_to_node = util.bfs(self, [self.me]);
    let nearby_units = self.vis_bots;
    let best_dist = max_dist + 1;
    let best_church = -1;
    // self.log(nearby_units);
    // self.log(self.me.team);
    for (let i = 0; i < nearby_units.length; i++){ // TODO: detect enemy castles
        if (nearby_units[i].team === self.me.team &&
            util.squared_distance(nearby_units[i], self.me) < 52 &&(nearby_units[i].unit === SPECS.CHURCH || nearby_units[i].unit === SPECS.CASTLE)){
            let church = nearby_units[i];
            let dist = self.path_to_node[church.y][church.x];
            if (dist < best_dist){
                best_church = church;
                best_dist = dist;
            }
        }
    }
    if (best_church === -1){
        self.has_church = false;
        return init_make_church(self);
    }
    else{
        self.has_church = true;
        let church_neighbors = [];
        for (let dy = -1; dy < 2; dy++){
            for (let dx = -1; dx < 2; dx++){
                let p = util.add_pos({x: dx, y:dy}, best_church);
                if (util.on_map(self, p) && (dx !== 0 || dy !== 0) && self.map[p.y][p.x]){
                    church_neighbors.push(p);
                }
            }
        }
        self.church = best_church;
        // this.log(church_neighbors);
        self.path_to_church = util.bfs(self, church_neighbors);
        self.log('init_at_node to mining');
        self.log(self.me);
        self.state = MINING;
        return turn_mine(self);
    }
}
function init_make_church(self){
    self.log(self.fuel);
    self.log(self.karbonite);
    self.log(self.has_church);

    if (self.fuel < 200 || self.karbonite < 50 || self.has_church){
        self.log('init_make_chuch to mining');
        self.state = MINING;
        return turn_mine(self);
    }
    //TODO: check if there is an existing church
    let build_neighbors = [];
    for (let dy = -1; dy < 2; dy++){
        for (let dx = -1; dx < 2; dx++){
            if ((dx !== 0 || dy !== 0)){
                build_neighbors.push({x:dx, y: dy});
            }
        }
    }
    let path_q = [self.me];
    let found_ok = false;
    while (path_q.length > 0){
        let pos = path_q.shift();
        let to_break = false;
        for (let i = 0; i < 8; i++){
            let p = util.add_pos(pos, build_neighbors[i]);
            if (util.on_map(self, p) && self.map[p.y][p.x] && !self.fuel_map[p.y][p.x] && !self.karbonite_map[p.y][p.x]) {
                self.church_target = pos;
                self.build_church_dir = build_neighbors[i];
                found_ok = true;
                to_break = true;
                break;
            }
        }
        if (to_break){break;}
        for (let i = 0; i < self.diff_list.length; i++) {
            let p = util.add_pos(pos, self.diff_list[i]);
            let p_d = self.path_to_node[pos.y][pos.x] + 1;
            self.log(p_d + " " + self.path_to_node[p.y][p.x]);
            if (util.on_map(self, p) && self.map[p.y][p.x] && p_d === self.path_to_node[p.y][p.x]) {
                path_q.push(p);
            }
        }
    }
    if (!found_ok){
        self.log('no tile found');
    }
    self.log("target pos:");
    // this.log(this.church_target);
    self.path_to_church_build = util.bfs(self,[self.church_target]); // TODO: Optimize
    // for (let y = 0; y < this.map_s_y; y++){
    //     let s = "";
    //     for (let x = 0; x < this.map_s_x; x++){
    //         let dist = this.path_to_church_build[y][x];
    //         s += (dist === max_dist)? 'X': dist%10;
    //     }
    //     this.log(s);
    // }
    self.state = PATHING_TO_MAKE_CHURCH;
    return turn_path_to_make_church(self);
}
function turn_path_to_make_church(self){
    if (self.path_to_church_build[self.me.y][self.me.x] === 0){
        self.log('arrived at church build site');
        if (self.fuel < 200 || self.karbonite < 50){
            self.state = PATHING_BACK;
            return turn_path_back(self);
        }
        self.state = PATHING_BACK;
        let church_loc = util.add_pos(self.me, self.build_church_dir);
        for (let i = 0; i < self.vis_bots.length; i++){
            let bot = self.vis_bots[i];
            if (bot.x === church_loc.x && bot.y === church_loc.y){
                self.log('church build site cccupied');
                return turn_path_back(self);
            }
        }
        let church_neighbors = [];
        for (let dy = -1; dy < 2; dy++){
            for (let dx = -1; dx < 2; dx++){
                let p = util.add_pos({x: dx, y:dy}, church_loc);
                // self.log(p);
                if (util.on_map(self, p) && (dx !== 0 || dy !== 0) && self.map[p.y][p.x]){
                    church_neighbors.push(p);
                }
            }
        }
        self.log(church_neighbors);
        self.path_to_church = util.bfs(self, church_neighbors);
        self.church = util.add_pos(self.me, self.build_church_dir);
        return self.buildUnit(SPECS.CHURCH, self.build_church_dir.x, self.build_church_dir.y);
    }
    let diff_vis = util.make_array(-1, [self.diff_list.length]);
    for (let i = 0; i < self.vis_bots.length; i++) {
        let rob = self.vis_bots[i];
        if (util.squared_distance(rob, self.me) <= 4 && rob.id !== self.me.id) {
            diff_vis[self.inv_diff_list[rob.y - self.me.y + 2][rob.x - self.me.x + 2]] = rob.id;
        }
    }
    let curr_dist = self.path_to_church_build[self.me.y][self.me.x];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.path_to_church_build[p.y][p.x] === curr_dist - 1 && diff_vis[i] <= 0) {
            return self.move(self.diff_list[i].x, self.diff_list[i].y);
        }
    }
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.path_to_church_build[p.y][p.x] === curr_dist && diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length === 0){
        self.log('path_make_church blocked');
        return;
    }
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
}
function turn_path_back(self){
    let curr_dist = self.path_to_node[self.me.y][self.me.x];
    // self.log(curr_dist);
    // for (let y = 0; y < self.map_s_y; y++){
    //     let s = "";
    //     for (let x = 0; x < self.map_s_x; x++){
    //         s += self.path_to_node[y][x] === max_dist? "X": self.path_to_node[y][x] % 10;
    //     }
    //     self.log(s);
    // }
    if (curr_dist === 0){
        if (!self.has_init_node_vars){
            return turn_on_reaching_node(self);
        }
        self.log('path_back to mining');
        self.state = MINING;
        return turn_mine(self);
    }
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.path_to_node[p.y][p.x] === curr_dist - 1 && self.diff_vis[i] <= 0) {
            return self.move(self.diff_list[i].x, self.diff_list[i].y);
        }
    }
    if (curr_dist === 1){
        self.state = PATHING_TO_NODE;
        return turn_path_to_node(self);
    }
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.path_to_node[p.y][p.x] === curr_dist && self.diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length === 0){
        self.log('path_back blocked');
        return;
    }
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
}
function turn_mine(self){
    if (self.me.fuel >= 100 || self.me.karbonite >= 20 && !self.repeat){
        let nearby_units = self.vis_bots;
        let best_dist = max_dist + 1;
        let best_church = -1;
        for (let i = 0; i < nearby_units.length; i++){
            if (nearby_units[i].team === self.me.team &&
                util.squared_distance(nearby_units[i], self.me) < 52 &&(nearby_units[i].unit === SPECS.CHURCH || nearby_units[i].unit === SPECS.CASTLE)){
                let church = nearby_units[i];
                let dist = self.path_to_node[church.y][church.x];
                if (dist < best_dist){
                    best_church = church;
                    best_dist = dist;
                }
            }
        }
        if (best_church === -1){
            // self.has_church = false; TODO: revisit
        }
        else{
            self.has_church = true;
            let church_neighbors = [];
            for (let dy = -1; dy < 2; dy++){
                for (let dx = -1; dx < 2; dx++){
                    let p = util.add_pos({x: dx, y:dy}, best_church);
                    if (util.on_map(self, p) && (dx !== 0 || dy !== 0) && self.map[p.y][p.x]){
                        church_neighbors.push(p);
                    }
                }
            }
            self.church = best_church;
            // this.log(church_neighbors);
            self.path_to_church = util.bfs(self, church_neighbors);
        }
        if (!self.has_church && self.fuel >= 200 && self.karbonite >= 50){
            return init_make_church(self);
        }
        self.state  = PATHING_TO_CHURCH;
        return turn_path_to_church(self);
    }
    return self.mine();
}
function turn_path_to_church(self){

    self.log('turn_path_to_church');
    /*if (this.fuel < 200 || this.karbonite < 50){
        if (this.me.fuel >= 100 || this.me.karbonite >= 20){
            this.state = PATHING_TO_PARENT;
            return this.turn_path_to_parent();
        }
        this.state = MINING
    }*/
    // TODO: contigency if church destroyed
    let dist_map = self.has_church? self.path_to_church: self.parent_castle_path;
    let target_loc = self.has_church? self.church: self.parent_castle;
    let curr_dist = dist_map[self.me.y][self.me.x];
    if (curr_dist === 0){

        self.log('arrived at deposit point');
        // self.log(target_loc);
        // self.log(self.me.karbonite + " " + self.me.fuel);
        // self.log(self.me);
        self.state = PATHING_BACK;
        return self.give(target_loc.x - self.me.x, target_loc.y - self.me.y, self.me.karbonite, self.me.fuel);
    }
    if ((self.me.fuel < 100 && self.karbonite > 50 && self.fuel < 200) ||
        (self.me.karbonite < 20 && 4 * curr_dist > self.me.fuel)){
        self.state = PATHING_BACK;
        self.repeat = true;
        return turn_path_back(self);
    }
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && dist_map[p.y][p.x] === curr_dist - 1 && self.diff_vis[i] <= 0) {
            return self.move(self.diff_list[i].x, self.diff_list[i].y);
        }
    }
    if (Math.random() < 0.15){
        self.state = PATHING_BACK;
    }
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && dist_map[p.y][p.x] === curr_dist && self.diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length === 0){
        self.log('path_to_church blocked');
        return
    }
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
}
pilgrim.turn = (self) => {
    // self.log((self.me.unit << 5) + (self.state << 2));
    self.repeat = false;
    self.castleTalk((self.me.unit << 5) + (self.state << 1));
    self.vis_bots = self.getVisibleRobots();

    let diff_vis = util.make_array(-1, [self.diff_list.length]);
    let loc_vis = util.make_array(-1, [self.loc_list.length]);
    for (let i = 0; i < self.vis_bots.length; i++) {
        let rob = self.vis_bots[i];
        if (util.squared_distance(rob, self.me) <= 4 && rob.id !== self.me.id) {
            diff_vis[self.inv_diff_list[rob.y - self.me.y + 2][rob.x - self.me.x + 2]] = rob.id;
        }
        if (self.inv_loc_list[rob.y][rob.x] >= 0){
            loc_vis[self.inv_loc_list[rob.y][rob.x]] = rob.id;
        }
    }
    self.diff_vis = diff_vis;
    self.loc_vis = loc_vis;
    // self.vis_map = self.getVisibleRobotMap(); // TODO slow
    switch (self.state){
        case PATHING_TO_NODE:
            // this.log('pathing to node');
            return turn_path_to_node(self);
        case PATHING_TO_MAKE_CHURCH:
            // this.log('pathing to make church');
            return turn_path_to_make_church(self);
        case PATHING_BACK:
            // this.log('pathing back');
            return turn_path_back(self);
        case MINING:
            // this.log('mining');
            return turn_mine(self);
        case PATHING_TO_CHURCH:
            // this.log('pathing to church');
            return turn_path_to_church(self);
        case PATHING_TO_RESET:
            return turn_reset(self);

    }
    self.log('halp!');
};

export default pilgrim;