const request = require('request');
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
    this.log.info('MultiSwitcheroo plugin initialized');
    this.name = config.name;
    this.onUrl = config.onUrl;
    this.offUrl = config.offUrl;
    this.statusUrl = config.statusUrl;
    this.pollingInterval = config.pollingInterval || 3000;
    this.statusPattern = config.statusPattern || "/1/";
    this.manufacturer = config.manufacturer || 'iSteve-O';
    this.model = config.model || 'MultiSwitcheroo';
    this.serialNumber = config.serialNumber || this.name;
    this.firmwareRevision = config.firmwareRevision || pkgVersion;
    this.switches = [];
    this.log.info('MultiSwitcheroo plugin initialization completed');

    for (const switchConfig of config.switches) {
      this.log.info(`Creating switch: ${switchConfig.name}`); //log each switch creation
      const switchName = switchConfig.name;
      const switchService = new Service.Switch(switchName, switchName);
      switchService
        .getCharacteristic(Characteristic.On)
        .on('set', (on, callback) => { this.setOn(on, callback, switchConfig); })
        .on('get', (callback) => { this.getOn(callback, switchConfig); });

      if (this.config.statusUrl && switchConfig.statusPattern) { // Use this.config.statusUrl
        const statusemitter = pollingtoevent((done) => {
          request.get({
            url: this.config.statusUrl, // Use this.config.statusUrl
            rejectUnauthorized: false
          }, (err, response, body) => {
            if (err) return done(err, null);
            done(null, body);
          });
        }, { longpolling: true, interval: this.config.pollingInterval });

        statusemitter.on('longpoll', (data) => {
          const isOn = !!data.match(switchConfig.statusPattern);
          switchService.getCharacteristic(Characteristic.On).updateValue(isOn);
          this.log.info(`Polling status for ${switchConfig.name}: ${isOn}`); //log polling status
        });

        statusemitter.on('error', (error) => {
          this.log.warn(`Polling error: ${error}`);
        });
      }

      this.switches.push(switchService);
      this.log.info(`Switch created: ${switchConfig.name}`); //log each switch when done
    }
    this.log.info('MultiSwitcheroo device creation completed'); //log creation of the device
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision);
    this.log.info(`${this.name} initialized...\nModel: ${this.model}\nManufacturer: ${this.manufacturer}\nSerial Number: ${this.serialNumber}\nFirmware Version: ${this.firmwareRevision}`); // Log the device details
  }

  setOn(on, callback, switchConfig) {
    request.get({
      url: on ? switchConfig.onUrl : switchConfig.offUrl,
      rejectUnauthorized: false
    }, (err, response, body) => {
      if (!err && response.statusCode === 200) {
        this.log.info(`${switchConfig.name} toggled successfully`); // log the request
        callback(null);
      } else {
        this.log.warn(`ERROR SETTING ${switchConfig.name}, CODE: ${response ? response.statusCode : 'N/A'}`); //log any errors
        callback(err || new Error(`Invalid response: ${response.statusCode}`));
      }
    });
  }

  getOn(callback, switchConfig) {
    if (!this.config.statusUrl || !switchConfig.statusPattern) return callback(null, false);
    request.get({
      url: this.config.statusUrl, // Use this.config.statusUrl
      rejectUnauthorized: false
    }, (err, response, body) => {
      if (!err && response.statusCode === 200) {
        const isOn = !!body.match(switchConfig.statusPattern);
        this.log.info(`Status Request: ${this.config.statusUrl}`); // log the request
        callback(null, isOn);
      } else {
        this.log.warn(`REQUEST ERROR: ${this.config.statusUrl}, CODE: ${response ? response.statusCode : 'N/A'}`); //log any errors
        callback(err || new Error(`Invalid response: ${response.statusCode}`));
      }
    });
  }

  getServices() {
    return [this.informationService, ...this.switches];
  }
}
