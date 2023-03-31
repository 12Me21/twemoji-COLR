import palette from "../data/palette.js"

let map = {__proto__:null}
let m2 = new Array(256).fill(0)

let p2 = palette.map(([n,c])=>{
	c = parseInt(c.slice(1), 16)
	let r = c>>16 & 0xFF
	let g = c>>8 & 0xFF
	let b = c & 0xFF
	c = [r,g,b]
	let s = c.join(",")
	map[s] ??= 0
	map[s] += n
	
	return c
})
//console.log(m2.map(x=>"#".repeat(Math.min(x/4,140))).join("\n"))
//process.exit()
let count = palette.length

let fix = {}

function hex(r,g,b) {
	let c = r<<16 | g<<8 | b | 0x1000000
	return c.toString(16).slice(1).toUpperCase()
}

for (let [r,g,b] of p2) {
	let s = [r,g,b].join(",")
	let best = 0, bestc = null
	for (let q=-1;q<=1;q++)
		for (let w=-1;w<=1;w++)
			for (let e=-1;e<=1;e++) {
				let c2 = [r+q,g+w,b+e]
				let s = c2.join(",")
				let n = map[s]
				if (n && n>best) {
					best = n
					bestc = c2
				}
			}
	if (bestc != s) {
		count--
		fix[hex(r,g,b)] = hex(...bestc)
		//console.log("corrected",s," (",map[s],")","to",bestc," (",map[bestc],")")
	}
}
console.log("export default",JSON.stringify(fix, null, "\t"))
