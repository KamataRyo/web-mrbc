#! /bin/bash
set -eu

# build mrbc with bytecode format version.3
if [[ -d "mruby" ]]; then
    rm -rf mruby
fi
git clone --depth=1 https://github.com/mruby/mruby.git
## this enable travis to build mruby
if [[ $TRAVIS == "true" ]]; then
    cp -fp mruby/.travis_build_config.rb mruby/build_config.rb
fi
cd mruby && make
cd ..

# build mrbc with bytecode format version.2
if [[ -d "mrbc" ]]; then
    rm -rf mrbc
fi
git clone --depth=1 https://bitbucket.org/tarosay/mrbc.git
cd mrbc && make
cd ..
