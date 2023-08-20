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
    this.firmwareRevision = config.firmwareRevision || pkgVersion;
    this.switches = [];

    for (const switchConfig of config.switches) {
      const switchName = switchConfig.name;
      const switchService = new Service.Switch(switchName, switchName);
      switchService
        .getCharacteristic(Characteristic.On)
        .on('set', (on, callback) => { this.setOn(on, callback, switchConfig); })
        .on('get', (callback) => { this.getOn(callback, switchConfig); });

      if (this.config.statusUrl && switchConfig.statusPattern) {
        const statusemitter = pollingtoevent((done) => {
          axios.get(this.config.statusUrl, { rejectUnauthorized: false })
            .then((response) => done(null, response.data))
            .catch((error) => done(error, null));
        }, { longpolling: true, interval: this.config.pollingInterval });

        statusemitter.on('longpoll', (data) => {
          const dataString = JSON.stringify(data); // Convert response data to string
          this.log.info(`Received status data: ${dataString}`);
          const isOn = responseData.includes(switchConfig.statusPattern);
          switchService.getCharacteristic(Characteristic.On).updateValue(isOn);
          this.log.info(`Polling status for ${switchConfig.name}: ${isOn}`);
        });

        statusemitter.on('error', (error) => {
          this.log.warn(`Polling error: ${error}`);
        });
      }

      this.switches.push(switchService);
      this.log.info(`Switch created: ${switchConfig.name}`);
    }

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision);

    this.log.info(`${this.name} initialized...\nModel: ${this.model}\nManufacturer: ${this.manufacturer}\nSerial Number: ${this.serialNumber}\nFirmware Version: ${this.firmwareRevision}`);
  }

  setOn(on, callback, switchConfig) {
    axios.get(on ? switchConfig.onUrl : switchConfig.offUrl, { rejectUnauthorized: false })
      .then((response) => {
        if (response.status === 200) {
          this.log.info(`${switchConfig.name} toggled successfully`);
          callback(null);
        } else {
          this.log.warn(`ERROR SETTING ${switchConfig.name}, CODE: ${response.status}`);
          callback(new Error(`Invalid response: ${response.status}`));
        }
      })
      .catch((error) => {
        this.log.warn(`ERROR SETTING ${switchConfig.name}: ${error}`);
        callback(error);
      });
  }

  getOn(callback, switchConfig) {
    if (!this.config.statusUrl || !switchConfig.statusPattern) return callback(null, false);
    axios.get(this.config.statusUrl, { rejectUnauthorized: false })
      .then((response) => {
        if (response.status === 200) {
          const isOn = !!String(response.data).match(switchConfig.statusPattern);
          this.log.info(`Status Request: ${this.config.statusUrl}`);
          callback(null, isOn);
        } else {
          this.log.warn(`REQUEST ERROR: ${this.config.statusUrl}, CODE: ${response.status}`);
          callback(new Error(`Invalid response: ${response.status}`));
        }
      })
      .catch((error) => {
        this.log.warn(`REQUEST ERROR: ${this.config.statusUrl}, CODE: ${error}`);
        callback(error);
      });
  }

  getServices() {
    return [this.informationService, ...this.switches];
  }
}
