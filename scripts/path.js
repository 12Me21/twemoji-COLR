let rx_num = /[\s,]*([-+]?\d*[.]?\d+(?:[Ee][-+]?\d+)?)/

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

function pnum(ns) {
	return Number(ns+"e+5")
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
	
	let px=0, py=0 // current pen pos
	let sx=0, sy=0 // contour start
	
	function autoclose() {
		if (contour) {
			if (px==sx && py==sy)
				contour.pop()
			else
				contour.push(['L'])
			//contour.push(['M']) // gap (unclosed contour)
			contours.push(contour)
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
			if (contour) {
				if (px==sx && py==sy)
					contour.pop()
				else
					contour.push(['L'])
				contours.push(contour)
				contour = null
				px = sx
				py = sy
			}
			continue
			//
		}
		let rx_arg = argtypes[cmd]
		
		let args = eat(rx_arg)
		if (!args)
			throw new Error('not enough args'+str.slice(i-1, i+20))
		do {
			if (!rel) {
				if (cmd!='V')
					px = 0
				if (cmd!='H')
					py = 0
			}
			let nx = px + pnum(args[args.length-2]??'0')
			let ny = py + pnum(args[args.length-1]??'0')
			
			if (cmd=='M') {
				autoclose()
				contour = []
				sx=nx
				sy=ny
				cmd = 'L'
			} else if (cmd=='H'||cmd=='V'||cmd=='L') {
				contour.push(['L'])
			} else if (cmd=='A') {
				contour.push(['A',args[1],args[2],args[3],args[4],args[5]])
			} else if (cmd=='C') {
				contour.push(['C',px+pnum(args[1]),py+pnum(args[2]),px+pnum(args[3]),py+pnum(args[4])])
			} else if (cmd=='Q') {
				contour.push(['Q',px+pnum(args[1]),py+pnum(args[2])])
			} else if (cmd=='S') {
				let last = contour[contour.length-1]
				let lastc = contour[contour.length-2]
				let [x,y] = last
				if (lastc && lastc[0]=="C") {
					x += x-lastc[3]
					y += y-lastc[4]
				}
				contour.push(['C',x,y,px+pnum(args[1]),py+pnum(args[2])])
			} else if (cmd=='T') {
				let last = contour[contour.length-1]
				let lastc = contour[contour.length-2]
				let [x,y] = last
				if (lastc && lastc[0]=="Q") {
					x += x-lastc[1]
					y += y-lastc[2]
				}
				contour.push(['Q',x,y])
			}
			px = nx
			py = ny
			contour.push([nx,ny])
		} while (args = eat(rx_arg))
	}
	autoclose()
	return contours
}

function rev1(c) {
	c.reverse()
	c.unshift(c.pop())
	for (let i=1; i<c.length; i+=2) {
		let seg = c[i]
		if (seg[0]=='C')
			c[i] = ['C',seg[3],seg[4],seg[1],seg[2]]
		if (seg[0]=='A')
			seg[0][5] = +!seg[0][5]
	}
	return rev1
}

function to_rrect(c) {
	let s
	let corners = {
		
	}
	let rads = []
	for (s=1; s<c.length; s+=2) {
		if (c[s][0]=="C") {
			let p1 = get(c, s-1)
			let p2 = get(c, s+1)
			let d = [p2[0]-p1[0], p2[1]-p1[1]]
			// found corner
			if (1 || Math.abs(Math.abs(d[0])-Math.abs(d[1])) <= 1000) {
				rads.push([Math.abs(d[0]),Math.abs(d[1])])
				console.warn("corner", d)
				if (d[0] < 0) {
					if (d[1] < 0) {
						corners.bottomleft = [p2[0],p1[1]]
					} else {
						corners.bottomright = [p1[0],p2[1]]
					}
				} else {
					if (d[1] < 0) {
						corners.topleft = [p1[0],p2[1]]
					} else {
						corners.topright = [p2[0],p1[1]]
					}
				}
			}
		}
	}
	//console.log("corners", corners, rads)
	let rx = 0, ry=0
	for (let r of rads) {
		rx += r[0]
		ry += r[1]
	}
	rx /= rads.length
	ry /= rads.length
	for (let r of rads) {
		if (dist([rx,ry], r) >= 400)
			throw new Error('bad corners')
	}
	let x = corners.topleft[0]
	let y = corners.topleft[1]
	let w = corners.bottomright[0] - x
	let h = corners.bottomright[1] - y
	console.warn("corners", corners, rads)
	if (
		corners.topleft[0] != corners.bottomleft[0] ||
			corners.topright[0] != corners.bottomright[0] ||
		corners.topleft[1] != corners.topright[1] ||
			corners.bottomleft[1] != corners.bottomright[1]) {
		throw new Error('not rectangle')
	}
	if (rx*2 == w && ry*2 == h)
		return `<ellipse cx="${fmt([x+w/2])}" cy="${fmt([y+h/2])}" rx="${fmt([w/2])}" ry="${fmt([h/2])}"`
	if (rx==ry)
		return `<rect x="${fmt([x])}" y="${fmt([y])}" width="${fmt([w])}" height="${fmt([h])}" rx="${fmt([(rx+ry)/2])}"`
	else
		return `<rect x="${fmt([x])}" y="${fmt([y])}" width="${fmt([w])}" height="${fmt([h])}" rx="${fmt([rx])}" ry="${fmt([ry])}"`
}

function fmt(list) {
	return list.map(x=>String(x/1e5)).join(",")//.replace(/^[^-]/,'+$&')).join("")
}

function next(c, i) {
	return c[(i+1) % c.length]
}

function check(c) {
	for (let i=1; i<c.length; i+=2) {
		let cmd = c[i]
		let pp = c[i-1]
		let np = next(c, i)
		if (cmd[0]=='C') {
			let [,x1,y1,x2,y2] = cmd
			let o1 = orientation(pp,[x1,y1],np)
			let o2 = orientation(pp,[x2,y2],np)
			if (o1==0 && o2==0)
				console.warn('degenerate cubic bezier')
		}
		if (cmd[0]=='Q') {
			let [,x1,y1] = cmd
			let o1 = orientation(pp,[x1,y1],np)
			if (o1==0)
				console.warn('degenerate quadratic bezier')
		}
		if (pp[0]==np[0] && pp[1]==np[1]) {
			console.warn('consecutive coincident points around '+cmd)
		} else if (cmd[0]=='L' && next(c, i+1)[0]=='L') {
			let np2 = next(c, i+2)
			let o1 = orientation(pp,np,np2)
			if (o1==0)
				console.warn('consecutive collinear line segments')
		}
		
		if (half_arc_at(c, i-1))
			;
	}
}

function get(c, i) {
	let l = c.length
	return c[(i % l + l) % l]
}

function dist(p1, p2) {
	return Math.hypot(p2[0]-p1[0], p2[1]-p1[1])
}

function half_arc_at(c, i) {
	let p0 = get(c, i-2)
	let p1 = get(c, i)
	let p2 = get(c, i+2)
	let d1 = [p0[0]-p1[0],p0[1]-p1[1]]
	let d2 = [p2[0]-p1[0],p2[1]-p1[1]]
	// eg: d1 is [68,235], d2 is [235,-70] or [-235,70]
	// ideal distance 2's
	let id2a = [d1[1],-d1[0]]
	let id2b = [-d1[1],d1[0]]
	//console.log(p0,p1,p2,d1, d2,'|',id2a,id2b)
	let ea = dist(id2a,d2)
	if (ea < 10000) {
		console.warn('half arc?', ea, dist(p0, p2))
	} else {
		let eb = dist(id2a,d2)
		if (eb < 10000) {
			console.warn('half arc?', eb, dist(p0, p2))
		}
	}
}

function unparse_rel(contours) {
	let out = ""
	for (let c of contours) {
		console.warn('m')
		out += "\nM "+fmt(c[0])+" "
		let [sx,sy] = c[0]
		for (let i=1; i<c.length; i+=2) {
			let [cmd, ...args] = c[i]
			/*if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
			}*/
			if (cmd=='C') {
				let pp = c[i-1]
				let pc = c[i-2]
				let dx = args[0]-pp[0]
				let dy = args[1]-pp[1]
				
				if (pc && pc[0]=='C') {
					console.warn('s',pp[0]-dx-pc[3],pp[1]-dy-pc[4])
					let ex = pp[0]-dx-pc[3]
					let ey = pp[1]-dy-pc[4]
					// todo: we should average the err between the prev and nex controlpoints
					if (ex*ex + ey*ey <= 100*100) {
					//if (pp[0]-dx == pc[3] && pp[1]-dy == pc[4]) {
						cmd = "S"
						args = args.slice(2)
					}
				} else {
					if (dx==0 && dy==0) {
						cmd = "S"
						args = args.slice(2)
					}
				}
			}
			if (cmd=='Q') {
				let pp = c[i-1]
				let pc = c[i-2]
				let dx = args[0]-pp[0]
				let dy = args[1]-pp[1]
				
				if (pc && pc[0]=='Q') {
					console.warn('t',pp[0]-dx-pc[1],pp[1]-dy-pc[2])
					let ex = pp[0]-dx-pc[1]
					let ey = pp[1]-dy-pc[2]
					// todo: we should average the err between the prev and nex controlpoints
					if (ex*ex + ey*ey <= 100000*100000) {
					//if (pp[0]-dx == pc[3] && pp[1]-dy == pc[4]) {
						cmd = "T"
						args = []
					}
				} else {
					if (dx==0 && dy==0) {
						cmd = "T"
						args = []
					}
				}
			}
			let pos = c[(i+1) % c.length]
			let [nx,ny] = pos
			if (cmd=='L') {
				if (nx==sx)
					out += "\nv " + fmt([pos[1]-sy]) + " "
				else if (ny==sy)
					out += "\nh " + fmt([pos[0]-sx]) + " "
				else {
					out += "\nl " + fmt([pos[0]-sx,pos[1]-sy]) + " "
				}
			} else {
				out += "\n"+cmd.toLowerCase() + " "
				if (cmd=='A') {
					out += fmt(args) // todo: custom formatting for A
				} else {
					for (let j=0;j<args.length;j+=2) {
						args[j+0] -= sx
						args[j+1] -= sy // hnm maybe args should be like ['C',[x,y],[x,y]]...
					}
					
					out += fmt(args)
				}
				if (args.length)
					out += " "
				out += fmt([pos[0]-sx,pos[1]-sy]) + " "
			}
			0,[sx,sy] = [nx,ny]
		}
		out += "\nZ"
	}
	return out
}

function unparse(contours) {
	let out = ""
	for (let c of contours) {
		out += "\nM "+c[0]+" "
		for (let i=1; i<c.length; i+=2) {
			let [cmd, ...args] = c[i]
			if (cmd=='L' && i==c.length-1) {
				out += "Z"
				break
			}
			let pos = c[(i+1) % c.length]
			out += cmd + " "
			out += args + " "
			out += pos + " "
		}
	}
	return out
}

function orientation(a, b, c) {
	return (a[0]*b[1] + b[0]*c[1] + c[0]*a[1]) - (a[1]*b[0] + b[1]*c[0] + c[1]*a[0])
}

// nnhh this is supposed to make it so that we don't interrupt smooth (missing out on the chance for a 's' command but nnh..
function pick_good_start(c) {
	//console.warn('spin?', c)
	if (!c.some(x=>x[0]==='L'))
		return
	while (c[1][0]!='L') {
		console.warn('spin!')
		c.push(c.shift())
		c.push(c.shift())
	}
}

function find_top(seg) {
	let best
	for (let i=0; i<seg.length; i+=2) {
		if (!best || seg[i][1] < seg[best][1])
			best = i
	}
	let a = get(seg, best-2)
	let b = get(seg, best)
	let c = get(seg, best+2)
	let o = orientation(a,b,c)
	console.warn('top orientation', o)
	return o
}

function or(seg) {
	let sl = seg.length-1
	for (let i=0; i<sl; i+=2) {
		let a = seg[i % seg.length]
		let b = seg[(i+2) % seg.length]
		let c = seg[(i+4) % seg.length]
		let o = orientation(a,b,c)
		console.warn(o)
	}
}

let xml = process.argv[2]
xml = xml.replace(/<path d="([^">]*)" ?([^>]*>)/g, (m,d,a)=>{
	let cc = parse(d)
	//let s = unparse(cc)
	console.warn(cc)
	
	let out = ""
	
	//rev1(cc[0])
	for (let c of cc) {
		//pick_good_start(c)
		if (find_top(c) < 0)
			rev1(c)
		or(c)
		check(c)
		out += to_rrect(c)+" "+a+""
	}
	return out//out+" "+a
})
process.stdout.write(xml+"\n")
//let s = unparse_rel(cc)
//console.log(s)
// todo: check if console.log is slowing down startup
//
//M20.896,18.375 c0.318,1.396,2.009,4.729 2.009,4.729 c0,0,-1.639,1.477 -2.987,1.437 l-1.955,-2.841 l-1.735,2.446 c0,0,-1.713,-1.274 -2.931,-1.485 c0,0,1.666,-3.182 2.023,-3.856 c0.357,-0.674,1.057,-1.547 1.057,-1.547 c0,0,4.271,0.028 4.519,1.117 Z

//M100 100 L 200 200 500 500 500 500 L 600 50 z - warnings
/*
test s command generation:
M12.45 21.329s-2.459 4.086-1.78 5.652c.409.945 1.123 2.064 2.389 2.271.423.069.623.898.501 1.505-.139.686-.621 1.646-.886 2.132-.265.487-.777.481-1.411 1.041-.442.39-.597 1.075.153 1.082l3.545.029c.664.006 1.093-.398 1.24-1.067.204-.928.76-4.461.551-5.146-.15-.491-.667-.886-.995-1.835-.243-.703.343-1.803.343-1.803l-3.65-3.861zm-5.748-5.571s.824-.146 1.272-.061c.448.086 1.705 1.019 2.085 1.16.38.141 1.299-.075 1.299-.075s1.065 1.436.995 1.581c-.07.145-1.617.47-1.981.579-.363.109-1.755-2.081-2.146-2.327s-.98.359-1.373.341c-.392-.018-.282-.298-.005-.374 0 0-.467.157-.483-.019-.016-.176.388-.281.388-.281s-.409.146-.475-.026c-.064-.172.063-.38.424-.498z **/
