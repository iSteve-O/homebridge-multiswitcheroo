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
    this.statusPattern = config.statusPattern || '/1/';
    this.manufacturer = config.manufacturer || 'iSteve-O';
    this.model = config.model || 'MultiSwitcheroo';
    this.serialNumber = config.serialNumber || this.name;
    this.firmwareRevision = config.firmwareRevision || pkgVersion;
    this.switches = [];

    const statusemitter = pollingtoevent((done) => {
      if (this.config.statusUrl) {
        axios.get(this.config.statusUrl, { rejectUnauthorized: false })
          .then((response) => done(null, response.data))
          .catch((error) => {
            this.log.error(`Error fetching status data: ${error.message}`);
            done(error, null);
          });
      } else {
        this.log.warn(`Error: No statusURL defined in config.json`);
        done(null, null); // No status URL defined
      }
    }, { longpolling: false, interval: this.config.pollingInterval });

    statusemitter.on('poll', (data) => {
      const statusData = JSON.stringify(data);
      for (const switchService of this.switches) {
        const switchConfig = switchService.switchConfig;
        if (switchConfig.statusPattern) {
          const isOn = !!statusData.match(switchConfig.statusPattern);
          switchService.getCharacteristic(Characteristic.On).updateValue(isOn);
        }
      }
    });

    statusemitter.on('error', (error) => {
      this.log.error(`Polling error: ${error}`);
    });

    if (!Array.isArray(config.switches)) { //check for a valid array of switches before trying to create them
      this.log.error('MultiSwitcheroo switches array is not properly defined. Please define switches in the config & restart, or disable the plugin.');
    } else {
      for (const switchConfig of config.switches) {
        const switchName = switchConfig.name;
        const switchService = new Service.Switch(switchName, switchName);
        switchService.switchConfig = switchConfig; // Attach switchConfig to the service
        switchService
          .getCharacteristic(Characteristic.On)
          .on('set', (on, callback) => { this.setOn(on, callback, switchConfig); })
          .on('get', (callback) => { this.getOn(callback, switchConfig); });

        this.switches.push(switchService);
        this.log.info(`Switch created: ${switchConfig.name}`);
      }
    }

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision);

    this.log.info(`${this.name} initialized...\n\t|Model: ${this.model}\n\t|Manufacturer: ${this.manufacturer}\n\t|Serial Number: ${this.serialNumber}\n\t|Firmware Version: ${this.firmwareRevision}`);
  }

  setOn(on, callback, switchConfig) {
    axios.get(on ? switchConfig.onUrl : switchConfig.offUrl, { rejectUnauthorized: false })
      .then((response) => {
        if (response.status === 200 || response.status === 204) {
          callback(null);
        } else {
          this.log.warn(`ERROR SETTING ${switchConfig.name}, CODE: ${response.status}`);
          callback(new Error(`setOn Invalid response: ${response.status}`));
        }
      })
      .catch((error) => {
        this.log.error(`setOn ERROR SETTING ${switchConfig.name}: ${error}`);
        callback(error);
      });
  }

  getOn(callback, switchConfig) {

    if (!this.config.statusUrl || !switchConfig.statusPattern) {
      return callback(null, false);
      this.log.warn(`Make sure statusUrl & statusPattern are defined properly in your config`);
    }


    axios.get(this.config.statusUrl, { rejectUnauthorized: false })
      .then((response) => {
        if (response.status === 200 || response.status === 204) {
          
          const statusData = JSON.stringify(response.data); // Parse the response data
          const isOn = !!statusData.match(switchConfig.statusPattern);


          callback(null, isOn);
          
        } else {
          this.log.warn(`getOn REQUEST ERROR: ${this.config.statusUrl}, CODE: ${response.status}`);
          callback(new Error(`getOn Invalid response: ${response.status}`));
        }
      })
      .catch((error) => {
        this.log.error(`getOn REQUEST ERROR: ${this.config.statusUrl}, CODE: ${error}`);
        callback(error);
      });
  }

  getServices() {
    return [this.informationService, ...this.switches];
  }
}
