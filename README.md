# web-mrbc

Web compiler for mruby.

## deployment

How to build and deploy.

```
$ git clone --depth=1 https://github.com/tarosay/web-mrbc.git
$ cd web-mrbc/wakayamarb
$ bundle install --path=vendor/bundle
$ bundle exec rake db:migrate
```
