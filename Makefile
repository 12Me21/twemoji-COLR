MAKEFLAGS += --no-builtin-rules
temp != mkdir -p build/layers

.SUFFIXES:

.NOTPARALLEL:

build/Twemoji.otf: build/glyphs.otf build/cpal.ttx build/colr.ttx data/import.ttx
	ttx -b -v -m build/glyphs.otf -o build/Twemoji.otf data/import.ttx

data/edata.mjs: data/emoji-test.txt scripts/parse-emoji-test.js
	node scripts/parse-emoji-test.js >data/edata.mjs

build/colr.ttx build/cpal.ttx: data/layers.mjs scripts/make-colr.js scripts/xml.js
	node scripts/make-colr.js

data/layers.mjs build/glyphs.json: data/edata.mjs scripts/layerize.js scripts/xml.js
	node scripts/layerize.js

build/glyphs.otf: build/glyphs.json scripts/fontforge.py
	fontforge -script scripts/fontforge.py <build/glyphs.json
