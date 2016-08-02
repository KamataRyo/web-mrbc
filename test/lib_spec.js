import lib from '../src/lib'
import { expect, should } from 'chai'
should()

describe('test of `getResource` function: ', () => {

    it('should be a function', () => {
        expect(lib.getResource).to.be.a('function')
    })

    describe('Case if type `source` given', () => {

        it('should retrun output', () => {
            const req = {
                query: {
                    type: 'source',
                    output: 'outputname.mrb'
                }
            }
            const res = {}
            const result = lib.getResource(req, res)
            const actual = req.query
            expect(result.output).to.equal(actual.output)
        })

        it('should retrun content', () => {
            const req = {
                query: {
                    type: 'source',
                    content: 'some content included'
                }
            }
            const res = {}
            const result = lib.getResource(req, res)
            const actual = req.query
            expect(result.content).to.equal(actual.content)
        })

        it('should retrun default output', () => {
            const req = {
                query: {
                    type: 'source'
                }
            }
            const res = {}
            const result = lib.getResource(req, res)

            expect(result.output).to.equal('noname.mrb')
        })
    })

    describe('Case if type `url` given', () => {

        let result
        const req = {}
        before((done) => {
            req.query = {
                type: 'url',
                // plain text with 'hello mruby'
                content: 'https://gist.githubusercontent.com/KamataRyo/2ae4eae8ec2c8c1645bd986de5eccccb/raw/2bf965388a25aa08a573566c13c196fc6dc33092/web-mrbc-api-test-case-001'
            }
            const res = {}
            result = lib.getResource(req, res)
            done()
        })

        it('should return new Promise', () => {
            expect(result.constructor).to.equal(Promise)
        })

        it('should return content on URL', (done) => {
            result.then(arg => {
                expect(arg.content).to.equal('hello mruby')
                done()
            }).catch(done)
        })


    })
})
