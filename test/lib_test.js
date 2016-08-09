import lib from '../src/lib'
import { expect, should } from 'chai'
import fs from 'fs'
import HttpError from 'standard-http-error'

should()

describe('test of `getResource` function: ', () => {

    it('should be a function', () => {
        expect(lib.getResource).to.be.a('function')
    })

    describe('Case if type `source` given', () => {

        const req = { query: {} }
        beforeEach(done => {
            req.query.type    = 'source'
            req.query.content = undefined
            req.query.output  = undefined
            done()
        })

        it('should retrun expected result', () => {
            req.query.content = 'some content included'
            req.query.output  = 'outputname.mrb'
            const result = lib.getResource(req)
            const actual = req.query

            return result.then(arg => {
                expect(arg.output).to.equal(actual.output)
                expect(arg.content).to.equal(actual.content)
            })
        })

        it('should return default output', () => {
            const result = lib.getResource(req)

            return result.then(arg => {
                expect(arg.output).to.equal(lib.DEFAULT_OUTPUT_NAME)
            })
        })
    })

    describe('Case if type `url` given (success)', () => {

        const req = { query: {} }
        beforeEach(done => {
            req.query.type    = 'url'
            req.query.content = 'https://gist.githubusercontent.com/KamataRyo/2ae4eae8ec2c8c1645bd986de5eccccb/raw/38839b9f1eb6e5bba978f83bbf19c8f8c19298f2/web-mrbc-api-test-case-001.rb'
            req.query.output  = undefined
            done()
        })

        it('should return new Promise', () => {
            const result = lib.getResource(req)

            expect(result.constructor).to.equal(Promise)
        })

        it('should be resolved', () => {
            const result = lib.getResource(req)

            return result.then(arg => {
                expect(arg.content).to.equal('print \'hello mruby\'')
            })
        })
    })

    describe('Case if type `url` given (failure)', () => {

        const req = { query: {} }
        beforeEach( done => {
            req.query.type    = 'url'
            req.query.content = 'https://gist.githubusercontent.com/KamataRyo/2ae4eae8ec2c8c1645bd986de5eccccb/raw/2bf965388a25aa08a573566c13c196fc6dc33092/web-mrbc-api-test-case-001_prefix_which_not_exists'
            req.query.output  = undefined
            done()
        })

        it('should be rejected', () => {
            const result = lib.getResource(req)

            return result.then()
                .catch(err => {
                    expect(err.constructor).to.equal(HttpError)
                    expect(err.code).to.equal(404)
                })
        })
    })

    describe('Case if unknown type given', () => {

        const req = { query: {} }
        beforeEach( done => {
            req.query.type    = 'Any undefined type name string'
            req.query.content = undefined
            req.query.output  = undefined
            done()
        })

        it('should be rejected', () => {
            const result = lib.getResource(req)

            return result.then()
                .catch(err => {
                    expect(err.constructor).to.equal(HttpError)
                    expect(err.code).to.equal(400)
                })
        })
    })
})

describe('test of `createTempDirectory`', () => {

    it('should be a function', () => {
        expect(lib.createTempDirectory).to.be.a('function')
    })

    it('should return new Promise', () => {
        const result = lib.createTempDirectory()

        expect(result.constructor).to.equal(Promise)
    })

    it('should return new directory path', () => {
        const result = lib.createTempDirectory()

        return result.then( arg => {
            fs.mkdir(arg.path, function(err) {
                expect(err).to.be.not.null // folder exists in other sense
                arg.cleanupCallback()
            })
        })
    })
})
