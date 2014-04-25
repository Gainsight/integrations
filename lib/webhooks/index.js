
/**
 * Module dependencies.
 */

var transform = require('segmentio-transform-legacy');
var integration = require('segmentio-integration');
var ValidationError = integration.errors.Validation;
var url = require('url');
var ms = require('ms');

/**
 * Expose `Webhooks`
 */

var Webhooks = module.exports = integration('Webhooks')
  .retries(1)
  .timeout(ms('3s'));

/**
 * Enabled.
 *
 * @param {Facade} message
 * @param {Object} settings
 * @return {Boolean}
 * @api public
 */

Webhooks.prototype.enabled = function(message, settings){
  return message.enabled(this.name);
};

/**
 * Validate.
 *
 * @param {Facade} message
 * @param {Object} settings
 * @return {Error}
 * @api public
 */

Webhooks.prototype.validate = function(message, settings){
  var hook = settings.globalHook;
  var err = this.ensure(hook, 'globalHook');
  if (err) return err;
  if (isUrl(hook)) return;
  return new ValidationError('Webhook "globalHook" setting must be a valid url');
};

/**
 * Expose our methods
 */

Webhooks.prototype.identify = request;
Webhooks.prototype.alias = request;
Webhooks.prototype.group = request;
Webhooks.prototype.track = request;
Webhooks.prototype.page = request;

/**
 * Request.
 *
 * TODO: remove context / options normalization.
 *
 * @param {Facade} message
 * @param {Object} settings
 * @param {Function} fn
 * @api private
 */

function request(message, settings, fn){
  var json = message.json();
  json.options = json.options || json.context;
  transform(json);
  return this
    .post(settings.globalHook)
    .type('json')
    .send(json)
    .end(this.handle(fn));
}

/**
 * Check if the given `value` is a valid url.
 *
 * @param {Mixed} value
 * @return {Boolean}
 * @api private
 */

function isUrl(value){
  var parsed = url.parse(String(value));
  return parsed.protocol && parsed.host;
}
