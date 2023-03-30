import Fs from 'fs'
import Readline from 'readline'


export function lines(path) {
	return Readline.createInterface({input: Fs.createReadStream(path)})
}
