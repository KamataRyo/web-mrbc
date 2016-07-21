#! /bin/bash
set -eu

# build mrbc with bytecode format version.3
git clone --depth=1 https://github.com/mruby/mruby.git
cd mruby && make
cd ..
ln -s mruby/bin/mrbc ./bin/mrbc3

# build mrbc with bytecode format version.2
git clone --depth=1 git@bitbucket.org:tarosay/mrbc.git
cd mrbc && make
cd ..
ln -s mrubc/mrbc ./bin/mrbc2
