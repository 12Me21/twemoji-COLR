MAKEFLAGS += --no-builtin-rules
temp != mkdir -p build/layers

twemoji_repo = https://github.com/jdecked/twemoji.git
twemoji_commit = c82a400de008d671167a73d82cddd37de3d583e1

.SUFFIXES:

.NOTPARALLEL:

build/Twemoji.otf: build/glyphs.otf build/cpal.ttx build/colr.ttx data/import.ttx
	ttx -b -v -m build/glyphs.otf -o build/Twemoji.otf data/import.ttx

data/edata.mjs: data/emoji-test.txt scripts/parse-emoji-test.js
	node scripts/parse-emoji-test.js >data/edata.mjs

build/colr.ttx build/cpal.ttx: build/layers.mjs scripts/make-colr.js scripts/xml.js
	node scripts/make-colr.js

build/layers.mjs build/glyphs.json: data/edata.mjs scripts/layerize.js scripts/xml.js scripts/read-svg.js twemoji/assets/svg
	node scripts/layerize.js

# todo: i would like to split this one into 2 steps
#  so we can adjust metrics without having to re-import all the layers.
# 1: create glyphs, import the layers, simplify outlines, etc.
# 2: apply metrics to that font file (which does involve shifting the outlines around, to set the descent/bearings)
build/glyphs.otf: build/glyphs.json scripts/fontforge.py
	fontforge -script scripts/fontforge.py <build/glyphs.json

# sparse checkout so it doesn't take 50 years to download
twemoji/assets/svg:
	git clone -c 'remote.origin.fetch=+$(twemoji_commit):refs/remotes/origin/$(twemoji_commit)' --filter=blob:none --depth=1 --no-checkout -- $(twemoji_repo) twemoji
	cd twemoji && git sparse-checkout init && git sparse-checkout set assets/svg && git checkout $(twemoji_commit)

clean:
	rm -rf build
