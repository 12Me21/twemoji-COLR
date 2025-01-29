Twitter emoji font, in OpenType COLR v0 format
- supported by all browsers and operating systems from the past 5-10 years
- relatively small filesize (1 MB)
- contains Unicode emoji v15.1 (plus extended couples emojis, and a few extras)
- font family name: "Twemoji COLR"

inspired by https://github.com/mozilla/twemoji-colr

Dependencies:
- nodejs
- fontforge
- fonttools

Building:
 run `make`
 outputs to `build/Twemoji.otf`



- emoji size: 1.125em (same as twitter.com)
- emoji vertical offset: -0.1875em
i.e. at font size 16px, the emojis will be 18px high, and descend 3px below the baseline
