const request = require('request');
const pollingtoevent = require('polling-to-event');

let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-switcheroo', 'Switcheroo', Switcheroo);
};

class Switcheroo {
  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    this.onUrl = config.onUrl;
    this.offUrl = config.offUrl;
    this.statusUrl = config.statusUrl;
    this.pollingInterval = config.pollingInterval || 3000;
    this.statusPattern = config.statusPattern || /1/;
    this.manufacturer = config.manufacturer || 'Default Manufacturer';
    this.model = config.model || 'Default Model';
    this.serialNumber = config.serialNumber || this.name;
    this.switchService = new Service.Switch(this.name);
    this.switchService
      .getCharacteristic(Characteristic.On)
      .on('set', this.setOn.bind(this))
      .on('get', this.getOn.bind(this));
    if (this.statusUrl) {
      const statusemitter = pollingtoevent((done) => {
        request.get({
          url: this.statusUrl,
          rejectUnauthorized: false
        }, (err, response, body) => {
          if (err) return done(err, null);
          done(null, body);
        });
      }, { longpolling: true, interval: this.pollingInterval });
      statusemitter.on('longpoll', (data) => {
        const isOn = !!data.match(this.statusPattern);
        this.switchService.getCharacteristic(Characteristic.On).updateValue(isOn);
      });
      statusemitter.on('error', (error) => {
        this.log(`Polling error: ${error}`);
      });
    }
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);
  }

  setOn(on, callback) {
    request.get({
      url: on ? this.onUrl : this.offUrl,
      rejectUnauthorized: false
    }, (err, response, body) => {
      if (!err && response.statusCode === 200) {
        callback(null);
      } else {
        callback(err || new Error(`Invalid response: ${response.statusCode}`));
      }
    });
  }

  getOn(callback) {
    if (!this.statusUrl) return callback(null, false);
    request.get({
      url: this.statusUrl,
      rejectUnauthorized: false
    }, (err, response, body) => {
      if (!err && response.statusCode === 200) {
        const isOn = !!body.match(this.statusPattern);
        callback(null, isOn);
      } else {
        callback(err || new Error(`Invalid response: ${response.statusCode}`));
      }
    });
  }

  getServices() {
    return [this.switchService, this.informationService];
  }
}

class MultiSwitcheroo extends Switcheroo {
  constructor(log, config) {
    super(log, config);
    this.switches = [];
    for (const switchConfig of config.switches) {
      const switchName = switchConfig.name;
      const switchService = new Service.Switch(switchName, switchName);
      switchService
        .getCharacteristic(Characteristic.On)
        .on('set', (on, callback) => { this.setOn(on, callback, switchConfig); })
        .on('get', (callback) => { this.getOn(callback, switchConfig); });
      if (this.statusUrl && switchConfig.statusPattern) {
        const statusemitter = pollingtoevent((done) => {
          request.get({
            url: this.statusUrl,
            rejectUnauthorized: false
          }, (err, response, body) => {
            if (err) return done(err, null);
            done(null, body);
          });
        }, { longpolling: true, interval: this.pollingInterval });
        statusemitter.on('longpoll', (data) => {
          const isOn = !!data.match(switchConfig.statusPattern);
          switchService.getCharacteristic(Characteristic.On).updateValue(isOn);
        });
        statusemitter.on('error', (error) => {
          this.log(`Polling error: ${error}`);
        });
      }
      this.switches.push(switchService);
    }
  }

  setOn(on, callback, switchConfig) {
    request.get({
      url: on ? switchConfig.onUrl : switchConfig.offUrl,
      rejectUnauthorized: false
    }, (err, response, body) => {
      if (!err && response.statusCode === 200) {
        callback(null);
      } else {
        callback(err || new Error(`Invalid response: ${response.statusCode}`));
      }
    });
  }

  getOn(callback, switchConfig) {
    if (!this.statusUrl || !switchConfig.statusPattern) return callback(null, false);
    request.get({
      url: this.statusUrl,
      rejectUnauthorized: false
    }, (err, response, body) => {
      if (!err && response.statusCode === 200) {
        const isOn = !!body.match(switchConfig.statusPattern);
        callback(null, isOn);
      } else {
        callback(err || new Error(`Invalid response: ${response.statusCode}`));
      }
    });
  }

  getServices() {
    return [this.informationService, ...this.switches];
  }
}

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-switcheroo', 'Switcheroo', Switcheroo);
  homebridge.registerAccessory('homebridge-switcheroo', 'MultiSwitcheroo', MultiSwitcheroo);
};
