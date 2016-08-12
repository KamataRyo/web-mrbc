#! /bin/bash
set -eu

# build mrbc with bytecode format version.3
if [[ -d "mruby" ]]; then
    rm -rf mruby
fi
git clone --depth=1 https://github.com/mruby/mruby.git
## this enable travis to build mruby
if [[ $TRAVIS == "true" ]]; then
    echo 'MRuby::Build.new do |conf|' > mruby/build_config.rb
    echo 'toolchain :gcc' >> mruby/build_config.rb
    echo "conf.gembox 'default'" >> mruby/build_config.rb
    echo "conf.gem '..'" >> mruby/build_config.rb
    echo 'end' >> mruby/build_config.rb
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
