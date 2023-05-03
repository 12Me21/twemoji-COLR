// todo: does SVG allow doing e.g. "M 10 10 m 2,-2" as equivalent to M 12,8 ?  (i know it /works/ but like.. )

function fmt(num) {
	return String(+(num/1e5).toFixed(5))//.replace(/^[^-]/,'+$&')).join("")
}
function pnum(ns) {
	let n = Number(ns+"e5")
	if (n != (n|0)) //if (isNaN(n))
		throw new Error('invalid number: '+ns)
	return n
}

function round(x) {
	return Math.round(x/100)*100
}

function rotation_matrix(a) {
	let cos, sin
	if (a==45) {
		cos = sin = Math.SQRT1_2
	} else if (a==-45) {
		cos = Math.SQRT1_2
		sin = -cos
	} else {
		let r = Math.PI*2*a/360
		console.log(a,r)
		cos = Math.cos(r)
		sin = Math.sin(r)
	}
	return {
		xx: cos,	yy: cos,
		yx: -sin, xy: sin,
		x: 0, y: 0,
	}
}

class Point {
	constructor(x, y) {
		this.x = x
		this.y = y
	}
	fmt(rel) {
		let {x,y} = this
		if (rel) {
			x -= rel.x
			y -= rel.y
		}
		return fmt(x)+","+fmt(y)
	}
	Add(p) {
		return new Point(this.x+p.x, this.y+p.y)
	}
	Divide(s) {
		return new Point(this.x/s, this.y/s)
	}
	Middle(p) {
		return new Point((this.x+p.x)/2, (this.y+p.y)/2)
	}
	Subtract(p) {
		return new Point(this.x-p.x, this.y-p.y)
	}
	Copy() {
		return new Point(this.x, this.y)
	}
	static Parse(x, y, pos) {
		return new this(pos.x+pnum(x), pos.y+pnum(y))
	}
	transform(matrix) {
		let x = this.x
		this.x = matrix.xx*x + matrix.yx*this.y + matrix.x
		this.y = matrix.yy*this.y + matrix.xy*x + matrix.y
	}
	round() {
		this.x = round(this.x)
		this.y = round(this.y)
	}
	equal(p) {
		return this.x==p.x && this.y==p.y
	}
}

// todo: contour class, has flag for if it's a hole

class Seg {
	reverse() {
	}
}

class SegL extends Seg {
	transform(matrix) {
	}
	round() {
	}
}
SegL.prototype.letter = "l"

class SegGap extends Seg {
	transform(matrix) {
	}
}

class SegC extends Seg {
	constructor(c1, c2) {
		super()
		this.c1 = c1
		this.c2 = c2
	}
	reverse() {
		let temp = this.c1
		this.c1 = this.c2
		this.c2 = temp
	}
	static Parse(pos, args) {
		return new this(
			Point.Parse(args[1], args[2], pos),
			Point.Parse(args[3], args[4], pos),
		)
	}
	static ParseShorthand(pos, args, contour) {
		let ppos = contour[contour.length-1]
		let pseg = contour[contour.length-2]
		let c1
		if (pseg instanceof SegC)
			c1 = ppos.Subtract(pseg.c2).Add(ppos)
		else
			c1 = ppos.Copy()
		let c2 = Point.Parse(args[1], args[2], pos)
		return new this(c1, c2)
	}
	transform(matrix) {
		this.c1.transform(matrix)
		this.c2.transform(matrix)
	}
	round() {
		this.c1.round()
		this.c2.round()
	}
}
SegC.prototype.letter = "c"

class SegQ extends Seg {
	constructor(c) {
		super()
		this.c = c
	}
	static Parse(pos, args) {
		let c = Point.Parse(args[1], args[2], pos)
		return new this(c)
	}
	static ParseShorthand(pos, args, contour) {
		let ppos = contour[contour.length-1]
		let pseg = contour[contour.length-2]
		let c
		if (pseg instanceof SegQ)
			c = ppos.Subtract(pseg.c).Add(ppos)
		else
			c = ppos.Copy()
		return new this(c)
	}
	transform(matrix) {
		this.c.transform(matrix)
	}
	round() {
		this.c.round()
	}
}
SegQ.prototype.letter = "q"

class SegA extends Seg {
	constructor(radius,angle,large,sweep) {
		super()
		this.radius = radius
		this.angle = angle
		this.large = large
		this.sweep = sweep
	}
	reverse() {
		this.sweep = !this.sweep
	}
	// todo: transform??
}
SegA.prototype.letter = "a"

let rx_num = /[\s,]*([-+]?\d*(?:[.]\d+(?!\d)|\d(?![\d.]))(?:[Ee][-+]?\d+(?!\d))?)/

let rx_x = new RegExp(rx_num.source+"(){0}", 'y')
let rx_y = new RegExp("(){0}"+rx_num.source, 'y')
let rx_num2 = new RegExp(rx_num.source.repeat(2), 'y')
let rx_num4 = new RegExp(rx_num.source.repeat(4), 'y')
let rx_num6 = new RegExp(rx_num.source.repeat(6), 'y')
let rx_arc = new RegExp(rx_num.source.repeat(3)+/[\s,]*([01])[\s,]*([01])/.source+rx_num.source.repeat(2), 'y')
let rx_cmd = new RegExp(/\s*[MmLlHhVvCcSsQqTtAaZz]/,'y')

let argtypes = {
	M: rx_num2,
	L: rx_num2,
	H: rx_x,
	V: rx_y,
	C: rx_num6,
	S: rx_num4,
	Q: rx_num4,
	T: rx_num2,
	A: rx_arc,
}

function parse(str) {
	let m
	let i = 0
	function eat(rx) {
		rx.lastIndex = i
		let m = rx.exec(str)
		if (m) {
			i = rx.lastIndex
			return m
		}
	}
	
	let contours = [], contour = null
	
	let pos = new Point(0, 0) // current pen pos
	let start = new Point(0, 0) // contour start
	
	function autoclose() {
		if (contour) {
			if (pos.x==start.x && pos.y==start.y)
				contour.pop()
			else {
				//if (dist(pos,start) < 0.01e5)
				console.warn('path end misalign?', start.Subtract(pos).fmt())
				contour.push(new SegL())
			}
			//contour.push(['M']) // gap (unclosed contour)
			if (contour.length) { // filter out e.g. d="M 11,14 Z"
				contours.push(contour)
			} else {
				console.warn('null contour in:', str)
			}
			contour = null
		}
	}
	
	while (1) {
		if (i==str.length)
			break
		let cmd = eat(rx_cmd)
		if (!cmd) {
			if (i == str.search(/\s+$/))
				break
			throw new Error('unknown thing in path: '+str.slice(i-3, i+3+1))
		}
		cmd = str.charAt(i-1)
		let rel
		if (cmd>='a') {
			rel = true
			cmd = cmd.toUpperCase()
		}
		
		if (cmd=='Z') {
			
			autoclose()
			pos = start.Copy()
			continue
		}
		let rx_arg = argtypes[cmd]
		
		let args = eat(rx_arg)
		if (!args)
			throw new Error('not enough args'+str.slice(i-1, i+20))
		do {
			if (!rel) {
				if (cmd!='V')
					pos.x = 0
				if (cmd!='H')
					pos.y = 0
			}
			let next = pos.Add({
				x: pnum(args[args.length-2]??'0'),
				y: pnum(args[args.length-1]??'0'),
			})
			
			if (cmd=='M') {
				autoclose()
				contour = []
				start = next.Copy()
				cmd="L"
			} else if (cmd=='H'||cmd=='V'||cmd=='L') {
				contour.push(new SegL())
			} else if (cmd=='A') {
				contour.push(new SegA(
					new Point(pnum(args[1]), pnum(args[2])),
					pnum(args[3]),
					args[4]!=0, args[5]!=0,
				))
			} else if (cmd=='C') {
				contour.push(SegC.Parse(pos, args))
			} else if (cmd=='Q') {
				contour.push(SegQ.Parse(pos, args))
			} else if (cmd=='S') {
				contour.push(SegC.ParseShorthand(pos, args, contour))
			} else if (cmd=='T') {
				contour.push(SegQ.ParseShorthand(pos, args, contour))
			}
			pos = next.Copy()
			contour.push(pos.Copy())
		} while (args = eat(rx_arg))
	}
	autoclose()
	return contours
}

function rev1(c) {
	c.reverse()
	c.unshift(c.pop())
	for (let i=1; i<c.length; i+=2)
		c[i].reverse()
	return rev1
}

function to_rrect(c) {
	let s
	let corners = {
		
	}
	let rads = []
	for (s=1; s<c.length; s+=2) {
		if (c[s] instanceof SegC) {
			let p1 = get(c, s-1)
			let p2 = get(c, s+1)
			let d = new Point(p2.x-p1.x, p2.y-p1.y)
			// found corner
			if (1 || Math.abs(Math.abs(d.x)-Math.abs(d.y)) <= 1000) {
				rads.push(new Point(Math.abs(d.x),Math.abs(d.y)))
				//console.warn("corner", d)
				if (d.x < 0) {
					if (d.y < 0) {
						corners.bottomleft = new Point(p2.x,p1.y)
					} else {
						corners.bottomright = new Point(p1.x,p2.y)
					}
				} else {
					if (d.y < 0) {
						corners.topleft = new Point(p1.x,p2.y)
					} else {
						corners.topright = new Point(p2.x,p1.y)
					}
				}
			}
		}
	}
	//console.log("corners", corners, rads)
	let rx = 0, ry=0
	for (let r of rads) {
		rx += r.x
		ry += r.y
	}
	rx /= rads.length
	ry /= rads.length
	let rr = new Point(rx,ry)
	for (let r of rads) {
		if (dist(rr, r) >= 400)
			throw new Error('bad corners')
	}
	let x = corners.topleft.x
	let y = corners.topleft.y
	let w = corners.bottomright.x - x
	let h = corners.bottomright.y - y
	//console.warn("corners", corners, rads)
	if (corners.topleft.x != corners.bottomleft.x || corners.topright.x != corners.bottomright.x || corners.topleft.y != corners.topright.y || corners.bottomleft.y != corners.bottomright.y) {
		throw new Error('not rectangle')
	}
	if (rx*2 == w && ry*2 == h) {
		if (w==h)
			return `<circle cx="${fmt(x+w/2)}" cy="${fmt(y+h/2)}" r="${fmt((w+h)/4)}"`
		return `<ellipse cx="${fmt(x+w/2)}" cy="${fmt(y+h/2)}" rx="${fmt(w/2)}" ry="${fmt(h/2)}"`
	}
	if (rx==ry)
		return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt((rx+ry)/2)}"`
	else
		return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(rx)}" ry="${fmt(ry)}"`
}

function solve_rrect_stroke(c) {
	for (let i=1; i<c.length; i+=2) {
		let seg = get(c,i)
		if (seg instanceof SegL) {
			let i2 = i+3*2
			let seg2 = get(c,i2)
			if (!(seg2 instanceof SegL)) // try +4 in case we have an extra
				seg2 = get(c,i2 += 2)
			if (seg2 instanceof SegL) {
				console.warn('line',get(c, i-1),get(c, i-1))
				let a = get(c, i-1)
				let b = get(c,i2+1)
				let e1 = a.Middle(b)
				let d1 = dist(a,b)
				a = get(c, i+1)
				b = get(c,i2-1)
				let e2 = a.Middle(b)
				let d2 = dist(a,b)
				return [e1, e2, d1,d2]
			}
		}
	}
	return null
}

function check(c) {
	for (let i=1; i<c.length; i+=2) {
		let seg = c
		let pp = c[i-1]
		let np = get(c, i+1)
		if (seg instanceof SegC) {
			let o1 = orientation(pp,seg.c1,np)
			let o2 = orientation(pp,seg.c2,np)
			if (o1==0 && o2==0)
				console.warn('degenerate cubic bezier')
		}
		if (seg instanceof SegQ) {
			let o1 = orientation(pp,seg.c,np)
			if (o1==0)
				console.warn('degenerate quadratic bezier')
		}
		if (pp.x==np.x && pp.y==np.y) {
			console.warn('consecutive coincident points around '+seg)
		} else if (seg instanceof SegL && get(c, i+2) instanceof SegL) {
			let np2 = get(c, i+3)
			let o1 = orientation(pp,np,np2)
			if (o1==0)
				console.warn('consecutive collinear line segments')
		}
		
		if (half_arc_at(c, i-1)) {
			if (i==1) {
				rotate(c, 2)
				i += 2
			}
			;
			let diameter = dist(get(c,i-3), np)
			c.splice(i-2, 3, new SegA(new Point(diameter/2, diameter/2), 0, 0, 1))
			i -= 2
		}
	}
}

function get(c, i) {
	let l = c.length
	return c[(i % l + l) % l]
}

function dist(p1, p2) {
	return Math.hypot(p2.x-p1.x, p2.y-p1.y)
}

function half_arc_at(c, i) {
	let seg0 = get(c, i-1)
	let seg1 = get(c, i+1)
	
	if (!(seg0 instanceof SegC && seg1 instanceof SegC))
		return
	
	let p0 = get(c, i-2)
	let p1 = get(c, i)
	let p2 = get(c, i+2)
	let d1 = new Point(p0.x-p1.x,p0.y-p1.y)
	let d2 = new Point(p2.x-p1.x,p2.y-p1.y)
	// eg: d1 is [68,235], d2 is [235,-70] or [-235,70]
	// ideal distance 2's
	let id2a = new Point(d1.y,-d1.x)
	let id2b = new Point(-d1.y,d1.x)
	//console.log(p0,p1,p2,d1, d2,'|',id2a,id2b)
	let ea = dist(id2a,d2)
	if (ea < 10000) {
		console.warn('half arc?', i, ea, dist(p0, p2))
		return true
	} else {
		let eb = dist(id2a,d2)
		if (eb < 10000) {
			console.warn('half arc?', i, eb, dist(p0, p2))
			return true
		}
	}
}

function transform(c, matrix) {
	for (let x of c)
		x.transform(matrix)
}

function round_contour(c, matrix) {
	for (let x of c)
		x.round()
}

function unparse_rel(contours) {
	let out = ""
	for (let c of contours) {
		//console.warn('m', c.length)
		let prev = c[0]
		out += "M "+prev.fmt()+" "
		for (let i=1; i<c.length; i+=2) {
			let seg = c[i]
			//let [cmd, ...args] = c[i]
			/*if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
				}*/
			let short
			if (seg instanceof SegC) {
				
				let pp = c[i-1]
				let pc = c[i-2]
				let dx = seg.c1.x-pp.x
				let dy = seg.c1.y-pp.y
				
				if (pc instanceof SegC) {
					let ex = pp.x - dx - pc.c2.x
					let ey = pp.y - dy - pc.c2.y
					// todo: we should average the err between the prev and nex controlpoints
					//console.warn("S try. current point:", pp, "prev command:", pc, "command:", seg)
					
					//if (ex*ex + ey*ey <= 100*100 *1000) {
						console.warn('S try', ex,ey)
					//}
					if (ex*ex + ey*ey <= 0.001e5*0.001e5 *0) {
						//if (pp[0]-dx == pc[3] && pp[1]-dy == pc[4]) {
						//console.warn('S try', ex,ey)
						short = true
					}
				} else {
					if (dx==0 && dy==0) {
						short = true
					}
				}
			} else if (seg instanceof SegQ) {
				let pp = c[i-1]
				let pc = c[i-2]
				let dx = seg.c.x-pp.x
				let dy = seg.c.y-pp.y
				
				if (pc instanceof SegQ) {
					let ex = pp.x - dx - pc.c.x
					let ey = pp.y - dy - pc.c.y
					// todo: we should average the err between the prev and nex controlpoints
					if (ex*ex + ey*ey <= 100000*100000*0) {
						//if (pp[0]-dx == pc[3] && pp[1]-dy == pc[4]) {
						short = true
					}
				} else {
					if (dx==0 && dy==0) {
						short = true
					}
				}
			}
			let pos = get(c, i+1)
			if (seg instanceof SegL) {
				if (prev && pos.x==prev.x)
					out += "v" + fmt(pos.y-prev.y) + " "
				else if (prev && pos.y==prev.y)
					out += "h" + fmt(pos.x-prev.x) + " "
				else {
					out += "l " + pos.fmt(prev) + " "
				}
			} else {
				if (seg instanceof SegA) {
					out += "a " + seg.radius.fmt() + " " + fmt(seg.angle) + " " + (seg.large ? "1" : "0") + (seg.sweep ? "1" : "0") + " "
				} else if (seg instanceof SegC) {
					if (short)
						out += "s " + seg.c2.fmt(prev) + " "
					else
						out += "c " + seg.c1.fmt(prev) + " " + seg.c2.fmt(prev) + " "
				} else if (seg instanceof SegQ) {
					if (short)
						out += "t "
					else
						out += "q " + seg.c.fmt(prev) + " "
				}
				out += pos.fmt(prev) + " "
			}
			prev = pos
		}
		out += "Z"
	}
	return out
}

function unparse_abs(contours) {
	let out = ""
	for (let c of contours) {
		//console.warn('m', c.length)
		let prev = c[0]
		out += "M "+prev.fmt()
		for (let i=1; i<c.length; i+=2) {
			let seg = c[i]
			//let [cmd, ...args] = c[i]
			/*if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
				}*/
			if (seg instanceof SegC)
				out += " C "+seg.c1.fmt()+" "+seg.c2.fmt()
			else if (seg instanceof SegQ)
				out += " Q "+seg.c.fmt()
			else if (seg instanceof SegL)
				out += " L"
			else if (seg instanceof SegA)
				out += " A " + seg.radius.fmt() + " " + fmt(seg.angle) + " " + (seg.large ? "1" : "0") + (seg.sweep ? "1" : "0")
			let pos = get(c, i+1)
			out += " "+pos.fmt()
			prev = pos
		}
		out += " Z"
	}
	return out
}



function orientation(a, b, c) {
	return ((b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x))/1e5
	//return (a.x*b.y + b.x*c.y + c.x*a.y) - (a.y*b.x + b.y*c.x + c.y*a.x)
}

// nnhh this is supposed to make it so that we don't interrupt smooth (missing out on the chance for a 's' command but nnh..
function pick_good_start(c) {
	//console.warn('spin?', c)
	if (!c.some(seg=>seg instanceof SegL))
		return
	while (!(c[1] instanceof SegL)) {
		//console.warn('spin!')
		c.push(c.shift())
		c.push(c.shift())
	}
}

function find_top(con) {
	let best
	for (let i=0; i<con.length; i+=2) {
		if (!best || con[i].y > con[best].y)
			best = i
	}
	//rotate(con, -best)
	//best -= best
	
	let a = get(con, best-2)
	let b = get(con, best)
	let c = get(con, best+2)
	
	if (a==c) {
		console.warn("bad angle!")
		let seg0 = get(con, best-1)
		let seg1 = get(con, best+1)
		if (seg0 instanceof SegC && !seg0.c2.equal(b)) {
			a = seg0.c2
		}
		if (seg1 instanceof SegC && !seg1.c1.equal(b)) {
			c = seg1.c1
		}
	}
	//console.warn(a,b,c)
	let o = orientation(a,b,c)
	console.warn('top orientation', o)
	return o
}

function or(seg) {
	let sl = seg.length-1
	for (let i=0; i<sl; i+=2) {
		let a = get(seg, i)
		let b = get(seg, i+2)
		let c = get(seg, i+4)
		let o = orientation(a,b,c)
		//console.warn(o)
	}
}

function rotate(list, amount) {
	amount %= list.length
	amount += list.length
	amount %= list.length
	let s=0, i=0
	for (let n=0; n<list.length; n++) {
		i+=amount
		i%=list.length
		if (i==s)
			i = ++s
		else
			0,[list[s],list[i]] = [list[i],list[s]]
	}
}

// idea: store contour as linked list? each point links to a prev/next point as well as a prev/next segment ? nnhh

function findscale(c1, c2) {
	let scales = []
	function compare(p1, p2) {
		let x2 = (p2.x)
		let x1 = (p1.x)
		let y2 = (p2.y)
		let y1 = (p1.y)
		let size = Math.hypot(x1,x2)
		//if (size > 1000000)
		scales.push([size, new Point(x2/x1,y2/y1)])
	}
	for (let i=0; i<c1.length; i++) {
		let u1 = c1[i]
		let u2 = c2[i]
		
		if (u1 instanceof Point)
			compare(u1, u2)
		if (u1.c instanceof Point)
			compare(u1.c, u2.c)
		if (u1.c1 instanceof Point)
			compare(u1.c1, u2.c1)
		if (u1.c2 instanceof Point)
			compare(u1.c2, u2.c2)
	}
	let ax=0,ay=0,axc=0,ayc=0
	for (let [,p] of scales) {
		if (!isNaN(p.x))
			ax += p.x, axc++
		if (!isNaN(p.y))
			ay += p.y, ayc++
	}
	return [ax/axc, ay/ayc]
}

function rotate_until(c, fn) {
	for (let i=0; i<c.length; i+=2) {
		if (fn(c))
			return true
		rotate(c, 2)
	}
	console.warn("couldn't choose starting point")
}
/* SunriseOverMountains, FaceWithHeadBandage */
function merge_lines(c) {
	for (let i=0;i<c.length;i+=2) {
		if (get(c,i-1) instanceof SegL && get(c,i+1) instanceof SegL) {
			let det = orientation(get(c, i-2), get(c, i), get(c, i+2))
			console.warn('det ', det)
			if (Math.abs(det) < 100000) {
				c.splice(i, 2)
				i-=2
			}
		}
	}
}

function replace_corner_arcs(c) {
	for (let i=1; i<c.length; i++) {
		let seg = c[i]
		if (seg instanceof SegC) {
			let p1 = get(c,i-1)
			let p2 = get(c,i+1)
			let d = p2.Subtract(p1)
			let c1d = seg.c1.Subtract(p1)
			let c2d = seg.c2.Subtract(p2)
			let f1,f2
			if (c1d.x==0 && c2d.y==0) {
				f1 = c1d.y / d.y
				f2 = -c2d.x / d.x
			} else if (c1d.y==0 && c2d.x==0) {
				f1 = c1d.x / d.x
				f2 = -c2d.y / d.y
			} else {
				continue
			}
			let err = Math.hypot(f1-0.5523, f2-0.5523)
			if (err > 0.005)
				continue
			console.log('corner?', err)
			c[i] = new SegA(new Point(Math.abs(d.x), Math.abs(d.y)), 0, false, true) // todo: correct sweep
		}
	}
}

let xml
let first = true
xml = process.argv[2]
xml = xml.replace(/<path(\s[^>]*?)?\s+d="([^">]*)"\s?([^>]*)>/g, (m,b=" ",d,a)=>{
	let cc = parse(d)
	let out = ""
	//let color = m.match(' fill="(#[^"]+)"')
	console.warn('heck?')
	
	//rev1(cc[0])
	for (let c of cc) {
		console.warn(c.length)
		
		if (first ? (find_top(c) < 0) : (find_top(c) > 0)) {
			console.warn('COUNTER CLOCK WISE')
			//rev1(c)
		}
		or(c)
		//
		
		
		/*let best, bestscore, besty=0
		for (let i=0; i<c.length; i+=2) {
			let {x,y} = c[i]
			let score
			if (x==18e5)
				score = -Infinity
			else
				score = Math.min(Math.abs(x-Math.round(x/0.25e5)*0.25e5), Math.abs(y-Math.round(y/0.25e5)*0.25e5))
			console.log(c[i], score)
			if (best==undefined || score < bestscore || (y>besty && score == bestscore)) {
				best = i, bestscore = score, besty = y
			}
		}
		best /= 2
		console.warn('ROTATED, ', best)
		rotate(c, -best*2)
		//*/
		
		/*let matrix = {
			xx: 1/100,
			yy: 1/100,
			yx: 0,
			xy: 0,
			x: 0,
			y: 36e5,
			}*/
		/*
		let matrix = rotation_matrix(45)
		transform(c, {xx:1,yy:1,xy:0,yx:0,x:-2.468e5,y:-2.468e5})
		transform(c, matrix)
		//*/
		//transform(c, {xx:2/1.912/1.633*1.5,yy:2/2.274/1.633*1.5,xy:0,yx:0,x:0,y:0})
		//merge_lines(c)
		
		/*
		  used for Hedgehog
		  replace small arc-like segments with arcs (radius 0.5)
		for (let i=0; i<c.length; i+=2) {
			let s1 = get(c,i-1)
			let s2 = get(c,i+1)
			
			if (s1 instanceof SegC && s2 instanceof SegC) {
				let p1 = get(c,i-2)
				let p2 = get(c,i+2)
				if (dist(p1,p2) < 1e5) {
					c.splice(i-1,3,new SegA(new Point(0.5e5,0.5e5), 0, 0, true))
					i -= 2
				}
			}
		}
		*/
		
		/*
		let avg = new Point(0,0)
		
		for (let i=0; i<c.length; i+=2) {
			avg = avg.Add(c[i])
		}
		avg = avg.Divide(c.length/2)
		
		let rads = []
		let aang=0
		for (let i=0; i<4; i+=2) {
			let p1 = c[i]
			let p2 = get(c, i+4)
			let d = p2.Subtract(p1)
			let ang = Math.atan2(d.x, d.y)*360/(Math.PI*2)
			if (i>0) {
				ang += 90
			}
			ang += 360
			ang %= 180
			if (ang > 90)
				ang = ang - 180
			let diam = Math.hypot(d.x, d.y)
			rads.push(diam/2)
			aang += ang
			//console.log('angle, diameter', ang, diam)
		}
		aang /= 2
		console.log(`<ellipse rx="${fmt(rads[1])}" ry="${fmt(rads[0])}" transform="translate(${avg.fmt()}) rotate(${-aang})"  fill="#292F33"/>`)
		//*/
		
		/*{
			let best = null
			for (let i=0; i<c.length; i+=2) {
				if (!best || c[i].y > c[best].y)
					best = i
			}
			c.splice(best, 2)
		}*/
		
		/*
		{
			let rad = 1e5
			let rr = false
			for (let i=1; i<c.length; i+=2) {
				let seg = get(c,i)
				let short = seg instanceof SegC && dist(get(c,i-1), get(c,i+1)) <= rad*3
				if (short) {
					console.warn('spliced arc', rr)
					if (!rr) {
						c[i] = new SegL()//SegA(new Point(rad, rad), 0, false, true)
						rr = true
					} else {
						c.splice(i-1, 2)
						i-=2
					}
				} else {
					rr = false
				}
			}
		}//*/
		
		/* let's
		let s = solve_rrect_stroke(c)
		if (s) {
			let d = (s[2]+s[3])/2
			console.warn(s,`<path d="M ${s[0].fmt()} L ${s[1].fmt()}" stroke-linecap="round" fill="none" stroke-width="${fmt(d)}" stroke=""/>`)
		}//*/
		
		//transform(c, {xx:1,yy:-1,xy:0,yx:0,x:0,y:36e5})
		
		//rotate(c, 2*-2); console.log('rotate!')
		//c.splice(0,2)
		//check(c)
		
		//pick_good_start(c)
		//replace_corner_arcs(c)
		//round_contour(c)
		let ok
		try {
			//let d = to_rrect(c)
			//out += `${d}${b}${a}>`
			//ok = true
			//console.warn('! ', d)
		} catch (e) {
		}
		if (!ok) {
			let d = unparse_abs([c])
			out += `<path d="${d}"${b} ${a}>`
		}
		first = !1//first
	}
	
	
	return out
})

//[0-9]+\.999[0-9]+

//process.stdout.write(xml.replace(/></g, ">\n\t<")+"\n")
process.stdout.write(xml.replace(/Z"[^]*? d="/g, "Z ")+"\n")
