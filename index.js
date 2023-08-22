const http = require("homebridge-http-base").http;
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
    this.config = config;

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
    this.currentStatus = {}; // Store the current status of each switch

    for (const switchConfig of config.switches) {
      const switchName = switchConfig.name;
      const switchService = new Service.Switch(switchName, switchName);
      switchService.switchConfig = switchConfig;

      switchService
        .getCharacteristic(Characteristic.On)
        .on('set', (on, callback) => { this.setOn(on, callback, switchConfig); })
        .on('get', (callback) => { this.getOn(callback, switchConfig); });

      this.switches.push(switchService);
      this.log.info(`Switch created: ${switchConfig.name}`);
    }

    if (config.pollingInterval) {
      this.setupStatusPolling();
    }
  }

  setupStatusPolling() {
    setInterval(() => {
      this.updateAllStatus();
    }, this.config.pollingInterval);
  }

  updateAllStatus() {
    http.httpRequest(this.config.statusUrl, (error, response, body) => {
      if (error) {
        this.log("updateAllStatus() failed: %s", error.message);
      } else if (!http.isHttpSuccessCode(response.statusCode)) {
        this.log("updateAllStatus() http request returned http error code: %s", response.statusCode);
      } else {
        const statusData = body;
        for (const switchService of this.switches) {
          const switchConfig = switchService.switchConfig;
          const isOn = statusData.includes(switchConfig.statusPattern);
          this.currentStatus[switchConfig.name] = isOn;
          switchService.getCharacteristic(Characteristic.On).updateValue(isOn);
        }
      }
    });
  }

  setOn(on, callback, switchConfig) {
    const url = on ? switchConfig.onUrl : switchConfig.offUrl;
    http.httpRequest(url, (error, response, body) => {
      if (error) {
        this.log("setOn() failed: %s", error.message);
        callback(error);
      } else if (!http.isHttpSuccessCode(response.statusCode)) {
        this.log("setOn() http request returned http error code: %s", response.statusCode);
        callback(new Error("Got html error code " + response.statusCode));
      } else {
        this.log("Switch set to %s", on ? "ON" : "OFF");
        this.updateAllStatus(); // Update all statuses after setting
        callback();
      }
    });
  }

  getOn(callback, switchConfig) {
    const isOn = this.currentStatus[switchConfig.name] || false;
    callback(null, isOn);
  }

  getServices() {
    const informationService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision);

    return [informationService, ...this.switches];
  }
}
