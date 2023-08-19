<p align="left">
  <a href="https://homebridge.io"><img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" height="140"></a>
</p>

[![NPM version](https://badge.fury.io/js/homebridge-multiswitcheroo.svg)](https://npmjs.org/package/homebridge-multiswitcheroo)

# **MultiSwitcheroo**

### homebridge-multiswitcheroo
</br>

### User defined multi-switch accessories for http GET requests.

</br>
Useful for lights, A/V systems, home automation, and includes live status polling & parsing custom responses!
</br>
</br>
</br>
</br>

Ideally, you would use this to set a characteristic, like volume. For example, our config below outlines a single accessory with a mute, high, medium & low switch for a Yamaha receiver's volume.
</br>
</br>

# You can create new switches in the Homebridge ConfigUi now (as of version 2.0), but if you want to do it manually, everything is explained below.

</br>
</br>
Define your `MultiSwitcheroo` with whatever `name` you want to appear as the main switch title in the home app. This is what is visible if left displayed as a single tile (default). The `name` for each switch is what the individual switches should show. Sometimes these transfer to the home app, and sometimes not, so you may have to rename them all once in the home app, but only once. 

Then, set the appropriate `statusUrl` to call for the status at the set `pollingInterval` (default `3000`).

The `statusPattern` is a regular expression string (regexp) sought in the response from the server to get an accurate status for each switch (see the `Mute` switch in the `MultiSwitcheroo` config example below for a really good example of a complex pattern where an unknown number is present in the string).

Set the `onUrl` & `offUrl` as appropriate. Must be the full URL, including `http://` & port.

The `manufacturer`, `model`, and `serialNumber` are all optional, but it is best to set them. Controller for HomeKit will throw errors about duplicate serial numbers if you have multiple devices using `DEFAULT-SERIAL`. Plus, it's fun to set these with your name!

Currently only built to support the `GET` http method. 

```json
  {
        "accessory": "MultiSwitcheroo",   // remember this *must* be 'MultiSwitcheroo' for multi
        "name": "Volume Switch",
        "manufacturer": "Manufacturer",
        "model": "Model",
        "serialNumber": "VOLUMESW01",   // best to specify a SN to avoid conflicts
        "statusUrl": "http://192.168.1.91/YamahaExtendedControl/v1/main/getStatus",
        "pollingInterval": 5000,
        "switches": [
            {
                "name": "Mute",
                "onUrl": "http://192.168.1.91/YamahaExtendedControl/v1/main/setMute?enable=true",
                "offUrl": "http://192.168.1.91/YamahaExtendedControl/v1/main/setMute?enable=false",
                "statusPattern": "{\"response_code\":0,\"power\":\"on\",\"sleep\":0,\"volume\":[0-9]+,\"mute\":true"
            },
            {
                "name": "Low",
                "onUrl": "http://192.168.1.91/YamahaExtendedControl/v1/main/setVolume?volume=51",
                "offUrl": "http://192.168.1.91/YamahaExtendedControl/v1/system/getFuncStatus",
                "statusPattern": "{\"response_code\":0,\"power\":\"on\",\"sleep\":0,\"volume\":51,\"mute\":false"
            },
            {
                "name": "Medium",
                "onUrl": "http://192.168.1.91/YamahaExtendedControl/v1/main/setVolume?volume=81",
                "offUrl": "http://192.168.1.91/YamahaExtendedControl/v1/system/getFuncStatus",
                "statusPattern": "{\"response_code\":0,\"power\":\"on\",\"sleep\":0,\"volume\":81,\"mute\":false"
            },
            {
                "name": "High",
                "onUrl": "http://192.168.1.91/YamahaExtendedControl/v1/main/setVolume?volume=111",
                "offUrl": "http://192.168.1.91/YamahaExtendedControl/v1/system/getFuncStatus",
                "statusPattern": "{\"response_code\":0,\"power\":\"on\",\"sleep\":0,\"volume\":111,\"mute\":false"
            }
        ]
  }
```



### Standard Switch (`Switcheroo`)
This switch version had to be removed from the plugin to fix the code. If you need a single switch install `homebridge-http-switch` or revert to version 1.0.3 of `homebridge-multiswitcheroo` and it will continue  to work.

If you already had a `Switcheroo` accessory defined & wish to update, simply change the `accessory` type from `Switcheroo` to `HTTP-SWITCH` then install the `homebridge-http-switch` plugin and reboot. The switch should continue to work (scenes & automations may need to be rebuilt but I am unsure. Sorry about this.



## Configuration Params

|        Parameter       |                                     Description                                     | Required |
| -----------------------| ----------------------------------------------------------------------------------- |:--------:|
| `name`                 | name of the switch or switches                                                      |     ✓    |
| `accessory`            | must be `MultiSwitcheroo`                                                           |     ✓    |
| `statusUrl`            | url for status requests                                                             |     ✓    |
| `statusPattern`        | regex sought in `statusUrl` response body                                           |     ✓    |
| `onUrl`                | endpoint path for the on state                                                      |     ✓    |
| `offUrl`               | endpoint path for the off state                                                     |     ✓    |
| `pollingInterval`      | interval to poll for status updates in milliseconds (default 3000ms or 3 seconds)   |     ✓    |
| `switches`             | array of switches required for `MultiSwitcheroo` devices (see axample config)       |     ✓    |
| `manufacturer`         | will show in Home app description of this Homekit accessory, ex. 'Yamaha'           |          |
| `model`                | will show in Home app description of this Homekit accessory, ex. 'Default Model'    |          |
| `serialNumber`         | will show in Home app description of this Homekit accessory, ex. 'SERIALNUMBER1'    |          |


## Tips

  - Make sure specify the full URL in the `statusURL`. (i.e. `"statusUrl" : "http://192.168.0.XXX:2000"`).
  - Must prepend 'http://' to all URLs.
  - Verify your server only uses `GET`. This plugin only does `GET` requests.
  - Use this plugin in a child bridge. It's just better.
  - You can expose multiple switches on the same child bridge, just use the same `_bridge` `username` & `port` in the config.
  - Name your child bridge using `name` under bridge settings. Defining multple switches will cause this to look bad so fix it in the config.

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install homebridge-http using: `npm install -g homebridge-multiswitcheroo`
    *  if in `hb-shell` environment use: `hb-service add homebridge-multiswitcheroo`
4. Update your `config.json` file or add swithces using plugin settings in the Homebridge ConfigUI.


### This plugin was generated with a lot of help from ChatGPT.
