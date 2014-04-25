
var express      = require('express')
  , integrations = require('..')
  , helpers      = require('./helpers')
  , should       = require('should')
  , transform    = require('segmentio-transform-legacy')
  , webhook      = new integrations.Webhooks();


var app = express().use(express.bodyParser())
  , server;


describe('Webhooks', function () {

  before(function (done) { server = app.listen(4000, done); });
  after(function(done) { server.close(done); });


  describe('.enabled()', function () {

    it('should always be enabled', function () {
      var identify = helpers.identify;
      webhook.enabled(identify({ channel: 'server' }), {}).should.be.ok;
      webhook.enabled(identify({ channel: 'client' }), {}).should.be.ok;
      webhook.enabled(identify(), {}).should.be.ok;
    });
  });


  describe('.validate()', function () {

    it('should require a valid globalHook', function () {
      var message = {};

      should.not.exist(webhook.validate(message, {
        globalHook : 'http://www.segment.io'
      }));

      should.exist(webhook.validate(message, {}));
      should.exist(webhook.validate(message, { globalHook : true }));
      should.exist(webhook.validate(message, { globalHook : '' }));
      should.exist(webhook.validate(message, { globalHook : 'aaaa' }));
    });
  });


  /**
   * Test that our api calls forward properly
   */
  ['track', 'identify', 'alias', 'group', 'page'].forEach(testApiCall);

});


/**
 * Test an api call to make sure that it gets passed along properly
 * @param  {String} call ['identify', 'track', or 'alias']
 */
function testApiCall (call) {

  var message = helpers[call]();

  describe('.' + call + '()', function () {

    it('should succeed on an valid call', function (done) {

      var route = '/' + call + '/valid'
        , settings = { globalHook : 'http://localhost:4000' + route };

      app.post(route, function (req, res, next) {
        var json = message.json();
        json.options = json.options || json.context;
        transform(json);

        serialized(req.body).should.eql(serialized(json));
        res.send();
      });

      webhook[call](message, settings, function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not succeed on an error', function (done) {
      var route    = '/' + call + '/error'
        , settings = { globalHook : 'http://localhost:4000' + route }
        , status   = 503;

      app.post(route, function (req, res, next) {
        var json = message.json();
        json.options = json.options || json.context;
        transform(json);
        serialized(req.body).should.eql(serialized(json));
        res.send(status);
      });

      webhook[call](message, settings, function (err) {
        should.exist(err);
        err.status.should.eql(status);
        done();
      });
    });

    it('should timeout', function(done){
      var route = '/' + call + '/timeout';
      var settings = { globalHook: 'http://localhost:4000' + route };

      app.post(route, function (req, res, next) {
      });

      webhook[call](message, settings, function (err) {
        should.exist(err.timeout);
        done();
      });
    });
  });
}


function serialized (obj) {
  return JSON.parse(JSON.stringify(obj));
}
