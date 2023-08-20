const axios = require('axios');
const pollingtoevent = require('polling-to-event');
const pkgVersion = require('./package.json').version;

let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-multiswitcheroo', 'MultiSwitcheroo', MultiSwitcheroo);
};

class MultiSwitcheroo {
  constructor(log, config) {
    this.log = log;
    this.config = config; // Store the config object
    this.name = config.name;
    this.onUrl = config.onUrl;
    this.offUrl = config.offUrl;
    this.statusUrl = config.statusUrl;
    this.pollingInterval = config.pollingInterval || 3000;
    this.statusPattern = config.statusPattern || "/1/";
    this.manufacturer = config.manufacturer || 'iSteve-O';
    this.model = config.model || 'MultiSwitcheroo';
    this.serialNumber = config.serialNumber || this.name;
    this.firmwareRevision = config.firmwareRevision || pkgVersion; // Use pkgVersion from package.json
    this.switches = [];

    for (const switchConfig of config.switches) {
      const switchName = switchConfig.name;
      const switchService = new Service.Switch(switchName, switchName);
      switchService
        .getCharacteristic(Characteristic.On)
        .on('set', (on, callback) => { this.setOn(on, callback, switchConfig); })
        .on('get', (callback) => { this.getOn(callback, switchConfig); });

      if (this.config.statusUrl && switchConfig.statusPattern) { // Use this.config.statusUrl
        const statusemitter = pollingtoevent((done) => {
          axios.get(this.config.statusUrl, { rejectUnauthorized: false })
            .then((response) => done(null, response.data))
            .catch((error) => done(error, null));
        }, { longpolling: true, interval: this.config.pollingInterval });

        statusemitter.on('longpoll', (data) => {
          const isOn = !!String(data).match(switchConfig.statusPattern);
          switchService.getCharacteristic(Characteristic.On).updateValue(isOn);
        });

        statusemitter.on('error', (error) => {
          this.log(`Polling error: ${error}`);
        });
      }

      this.switches.push(switchService);
    }

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision); // Set firmware revision
  }

  setOn(on, callback, switchConfig) {
    axios.get(on ? switchConfig.onUrl : switchConfig.offUrl, { rejectUnauthorized: false })
      .then((response) => {
        if (response.status === 200) {
          callback(null);
        } else {
          callback(new Error(`Invalid response: ${response.status}`));
        }
      })
      .catch((error) => {
        callback(error);
      });
  }

  getOn(callback, switchConfig) {
    if (!this.config.statusUrl || !switchConfig.statusPattern) return callback(null, false);
    axios.get(this.config.statusUrl, { rejectUnauthorized: false })
      .then((response) => {
        if (response.status === 200) {
          const isOn = !!response.data.match(switchConfig.statusPattern);
          callback(null, isOn);
        } else {
          callback(new Error(`Invalid response: ${response.status}`));
        }
      })
      .catch((error) => {
        callback(error);
      });
  }

  getServices() {
    return [this.informationService, ...this.switches];
  }
}
