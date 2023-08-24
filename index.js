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
    this.statusRequestType = config.statusRequestType || `GET`;
    this.onRequestType = config.onRequestType || `GET`;
    this.offRequestType = config.offRequestType || `GET`;
    this.onRequestHeaders = config.onRequestHeaders || {};
    this.onRequestBody = config.onRequestBody || {};
    this.offRequestHeaders = config.offRequestHeaders || {};
    this.offRequestBody = config.offRequestBody || {};
    this.statusRequestHeaders = config.statusRequestHeaders || {};
    this.statusRequestBody = config.statusRequestBody || {};
    this.disabled = config.disabled || false;
    this.switches = [];

    const statusemitter = pollingtoevent((done) => {
        if (this.config.statusUrl) {
          const requestType = this.config.statusRequestType || 'GET';
          const requestConfig = {
            method: requestType,
            url: this.config.statusUrl,
            rejectUnauthorized: false,
          };
      
          if (requestType === 'POST' || requestType === 'PUT' || requestType === 'DELETE' || requestType === 'GET') {
            if (this.config.requestHeaders) {
              requestConfig.headers = this.config.requestHeaders;
            }
          }
          if (requestType === 'POST' || requestType === 'PUT') {
            requestConfig.data = this.config.statusRequestBody;
        }
      
          axios(requestConfig)
            .then((response) => done(null, response.data))
            .catch((error) => {
              this.log.error(`Error fetching status data: ${error.message}`);
              done(error, null);
            });
        } else {
          this.log.warn(`Error: No statusURL defined in config.json`);
          done(null, null);
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

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, config.manufacturer || 'iSteve-O')
      .setCharacteristic(Characteristic.Model, config.model || 'MultiSwitcheroo')
      .setCharacteristic(Characteristic.SerialNumber, config.serialNumber || this.name)
      .setCharacteristic(Characteristic.FirmwareRevision, config.firmwareRevision || pkgVersion);

    this.log.info(`${this.name} initialized...`);
  }

  setOn(on, callback, switchConfig) {
    const requestType = on ? (switchConfig.onRequestType || 'GET') : (switchConfig.offRequestType || 'GET');
    const requestConfig = {
      method: requestType,
      url: on ? switchConfig.onUrl : switchConfig.offUrl,
      rejectUnauthorized: false,
    };

    const headersKey = on ? (switchConfig.onRequestHeaders) : (switchConfig.offRequestHeaders);
    if (requestType === 'POST' || requestType === 'PUT' || requestType === 'DELETE' || requestType === 'GET') {
      if (switchConfig[headersKey]) {
        requestConfig.headers = switchConfig[headersKey];
      }
    }

    const requestBodyKey = on ? (switchConfig.onRequestBody) : (switchConfig.offRequestBody);
    if (requestType === 'POST' || requestType === 'PUT') {
      requestConfig.data = switchConfig[requestBodyKey];
  }

    axios(requestConfig)
      .then((response) => {
        if (response.status === 200) {
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
  
    const requestType = switchConfig.statusRequestType || 'GET';
    const requestConfig = {
      method: requestType,
      url: this.config.statusUrl,
      rejectUnauthorized: false,
    };
  
    if (requestType === 'POST' || requestType === 'PUT' || requestType === 'DELETE' || requestType === 'GET') {
        if (this.config.statusRequestHeaders) {
          requestConfig.headers = this.config.statusRequestHeaders;
        }
      }

      if (requestType === 'POST' || requestType === 'PUT') {
        requestConfig.data = this.config.statusRequestBody;
    }
  
    axios(requestConfig)
      .then((response) => {
        if (response.status === 200) {
          const statusData = JSON.stringify(response.data);
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
    if (this.disabled) {
      this.log.info(`${this.config.name} is disabled`);
      return [];
    }
    return [this.informationService, ...this.switches];
  }
}
