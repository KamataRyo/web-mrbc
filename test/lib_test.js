import lib from '../src/lib'
import fs  from 'fs'
import { expect, should } from 'chai'
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
            const result = lib.getResource(req.query)
            const actual = req.query

            return result.then(resource => {
                expect(resource.output).to.equal(actual.output)
                expect(resource.content).to.equal(actual.content)
            })
        })

        it('should return default output', () => {
            const result = lib.getResource(req.query)

            return result.then(resource => {
                expect(resource.output).to.equal(lib.DEFAULT_OUTPUT_NAME)
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
            const result = lib.getResource(req.query)

            expect(result.constructor).to.equal(Promise)
        })

        it('should be resolved', () => {
            const result = lib.getResource(req.query)

            return result.then(resource => {
                expect(resource.content).to.equal('print \'hello mruby\'')
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
            const result = lib.getResource(req.query)

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
            const result = lib.getResource(req.query)

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

        return result.then(dir => {
            fs.mkdirSync(dir.path) // assert if directory already created
            dir.cleanupCallback()
        }).catch((err) => {
            expect(err.constructor).to.equal(Error)
        })
    })

    it('should be rejected if internal error occured', () => {
        const errorInterruption = true
        const result = lib.createTempDirectory(errorInterruption)

        return result.then()
            .catch( err => {
                expect(err.constructor).to.equal(HttpError)
                expect(err.code).to.equal(500)
            })
    })
})

describe('test of `writeFile`', () => {

    const resource = {}
    const dir = {}
    beforeEach(done => {
        resource.content = 'the content'
        resource.output = 'test.mrb'
        dir.path = __dirname
        dir.cleanupCallback = () => {
            fs.unlinkSync(`${__dirname}/${resource.output}.rb`)
        } // this mimic cleanupCallback which may be passed.
        done()
    })

    it('should return IO object about the file', () => {
        const result = lib.writeFile([resource, dir])

        return result.then(fileIO => {
            expect(fileIO.input).to.equal(`${__dirname}/${resource.output}.rb`)
            expect(fileIO.output).to.equal(`${__dirname}/${resource.output}`)
            expect(fileIO.cleanup).to.be.a('function')
            fileIO.cleanup()
        })
    })

    it('should generate file', () => {
        const result = lib.writeFile([resource, dir])

        return result.then(fileIO => {
            const actual = fs.readFileSync(fileIO.input).toString()

            expect(actual).to.equal(resource.content)
            fileIO.cleanup()
        })
    })

})

describe('test of `execCompile`', () => {

    it('should do compile', () => {
        const format = 3
        const options = []
        const fileIO = {}
        fileIO.input = `${__dirname}/test2.rb`
        fileIO.output = `${__dirname}/test2.mrb`
        fileIO.cleanup = () => {
            fs.unlinkSync(fileIO.input)
            fs.unlinkSync(fileIO.output)
        }
        fs.writeFileSync(fileIO.input, 'print \'hello mruby\'')

        return lib.execCompile(format, options)(fileIO)
            .then(({fileIO, stdout}) => {
                fs.readFileSync(fileIO.output) // error throwen if file not exists
                fileIO.cleanup()
            })
    })
})
