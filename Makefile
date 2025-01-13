MAKEFLAGS += --no-builtin-rules
temp != mkdir -p build/layers

twemoji_repo = https://github.com/jdecked/twemoji.git
twemoji_commit = c82a400de008d671167a73d82cddd37de3d583e1

.SUFFIXES:

.NOTPARALLEL:

.PHONY: main
main: build/Twemoji.otf

# (sparse checkout so it doesn't take 50 years to download)
twemoji/assets/svg:
	rm -rf twemoji
	git clone --filter=blob:none --depth=1 --no-checkout -- $(twemoji_repo) twemoji
	cd twemoji && git sparse-checkout init && git sparse-checkout set assets/svg && git checkout $(twemoji_commit)

data/emoji-test.txt:
	curl --compressed 'https://www.unicode.org/Public/emoji/15.1/emoji-test.txt' -o data/emoji-test.txt


# parse unicode's emoji-test.txt file to create a list of emojis (and other supporting glyphs)
build/edata.json: data/emoji-test.txt data/extra-emoji-test.txt scripts/parse-emoji-test.js
	node scripts/parse-emoji-test.js >build/edata.json

# load the svg files and split them into layers
build/layers.json build/glyphs.json: build/edata.json scripts/layerize.js scripts/xml.js scripts/read-svg.js twemoji/assets/svg
	node scripts/layerize.js

# generate the COLR and CPAL tables
build/colr.ttx build/cpal.ttx: build/layers.json scripts/make-colr.js scripts/xml.js
	node scripts/make-colr.js

# todo: i would like to split this one into 2 steps
#  so we can adjust metrics without having to re-import all the layers.
# 1: create glyphs, import the layers, simplify outlines, etc.
# 2: apply metrics to that font file (which does involve shifting the outlines around, to set the descent/bearings)
# use the fontforge api to create the font file and import the layers
build/glyphs.otf: build/glyphs.json scripts/fontforge.py
	fontforge -script scripts/fontforge.py <build/glyphs.json

# generate the final font file (adding the CPAL and COLR tables because fontforge doesn't support that)
build/Twemoji.otf: build/glyphs.otf build/cpal.ttx build/colr.ttx data/import.ttx
	ttx -b -v -m build/glyphs.otf -o build/Twemoji.otf data/import.ttx


clean:
	rm -rf build
