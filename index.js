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
        //this.log.debug(`Emitter calling URL`);
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
    }, { longpolling: true, interval: this.config.pollingInterval });

    statusemitter.on('longpoll', (data) => {
      //this.log.debug(`Parsing URL data`);
      //this.log.debug(`Received status data:`, data);
      const statusData = JSON.stringify(data);
      for (const switchService of this.switches) {
        const switchConfig = switchService.switchConfig;
        if (switchConfig.statusPattern) {
          const isOn = !!statusData.match(switchConfig.statusPattern);
          switchService.getCharacteristic(Characteristic.On).updateValue(isOn);
          //if (!isOn && switchService.getCharacteristic(Characteristic.On).value) {
            //this.log.warn(`$(switchConfig.name) is off in the Home app, but should be on bsed on server respone.`);
            //switchService.getCharacteristic(Characteristic.On).setValue(true);
          //}
        }
      }
    });

    statusemitter.on('error', (error) => {
      this.log.error(`Polling error: ${error}`);
    });

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

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision);

    this.log.info(`${this.name} initialized...\n\t|Model: ${this.model}\n\t|Manufacturer: ${this.manufacturer}\n\t|Serial Number: ${this.serialNumber}\n\t|Firmware Version: ${this.firmwareRevision}`);
  }

  setOn(on, callback, switchConfig) {
   //this.log.debug(`setOn calling URL`);
   axios.get(on ? switchConfig.onUrl : switchConfig.offUrl, { rejectUnauthorized: false })
      .then((response) => {
        if (response.status === 200) {
          //this.log.debug(`${switchConfig.name} toggled successfully ${response.status}`);
          setTimeout(() => {
            this.getOn((error, isOn) => {
              if (!error) {
                this.log.info(`${switchConfig.name} refreshed status: ${isOn}`);
              } else {
                this.log.error(`Error refreshing status after setOn: ${error}`);
              }
              callback(null);
            }, switchConfig);
          }, 500); // Adjust getOn delay after setOn
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
    //this.log.debug(`getOn URL Rec'd: ${this.config.statusUrl}`);
    //this.log.debug(`getOn Pattern Rec'd: ${switchConfig.statusPattern}`);

    if (!this.config.statusUrl || !switchConfig.statusPattern) {
      return callback(null, false);
      this.log.warn(`Make sure statusUrl & statusPattern are defined properly in your config`);
    }

    //this.log.debug(`getOn statusPattern: ${switchConfig.statusPattern}`);
    //this.log.debug(`getOn calling URL`);
    axios.get(this.config.statusUrl, { rejectUnauthorized: false })
      .then((response) => {
        if (response.status === 200) {
          //this.log.debug(`getOn Response Data:`, response.data);

          const statusData = JSON.stringify(response.data); // Parse the response data
          const isOn = !!statusData.match(switchConfig.statusPattern);

          //this.log.debug(`getOn Status URL: ${this.config.statusUrl}`);
          //this.log.debug(`getOn switchConfig Pattern: ${switchConfig.statusPattern}`);

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
