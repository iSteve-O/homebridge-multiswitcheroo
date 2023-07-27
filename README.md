<p align="center">
  <a href="https://homebridge.io"><img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" height="140"></a>
</p>

# Homebridge-MultiSwitcheroo
User defined switches for http requests. Simple on/off or multiswitch devices. Useful for lights, A/V systems, home automation, and includes live status polling & parsing custom responses!


## Switch Types

### Switch (standard on/off)
Meant to be used as a simple on/off switch. 
 ==> api accessible light, outlet, fan, etc.

 Define your `Switcheroo` with whatever `name` you want to appear in the home app. 

Then, set the appropriate `statusUrl` to call for the status at the set `pollingInterval` (default `3000`).

The `statusPattern` is a regular expression string (regexp) sought in the response from the server to get an accurate status for each switch (see the `Mute` switch in the `MultiSwitcheroo` config example below for a really good example of a complex pattern where an unknown number is present in the string).

Set the `onUrl` & `offUrl` as appropriate. Must be the full URL, including `http://` & port.

The `manufacturer`, `model`, and `serialNumber` are all optional, but it is best to set them. Controller for HomeKit will throw errors about duplicate serial numbers if you have multiple devices using `DEFAULT-SERIAL`. Plus, it's fun to set these with your name!

Currently only built to support the `GET` http method. 


```
{
        "accessory": "Switcheroo",   // remember this *must* be 'Switcheroo' for single
        "name": "My Switch",
        "model": "Model",
        "manufacturer": "Manufacturer",
        "serialNumber": "SWITCH01",   // best to specify a SN to avoid conflicts
        "statusUrl": "http://192.168.0.XXX/myswitch/status",
        "statusPattern": /1/,
        "pollingInterval": 3000,
        "onUrl"  : "http://192.168.0.XXX/myswitch/1",
        "offUrl" : "http://192.168.0.XXX/myswitch/0"
}
```

### Multiswitch (radio buttons)
Ideally you would use this to set a characteristic like volume. For example, a mute switch, a high, medium & low switch for a Yamaha receiver.

Define your `MultiSwitcheroo` with whatever `name` you want to appear as the main switch title in the home app. This is what is visible if left displayed as a single tile (default). The `name` for each switch is what the individual switches should show. Sometimes these transfer to the home app, and sometimes not, so you may have to rename them all once in the home app, but only once. 

Then, set the appropriate `statusUrl` to call for the status at the set `pollingInterval` (default `3000`).

The `statusPattern` is a regular expression string (regexp) sought in the response from the server to get an accurate status for each switch (see the `Mute` switch in the `MultiSwitcheroo` config example below for a really good example of a complex pattern where an unknown number is present in the string).

Set the `onUrl` & `offUrl` as appropriate. Must be the full URL, including `http://` & port.

The `manufacturer`, `model`, and `serialNumber` are all optional, but it is best to set them. Controller for HomeKit will throw errors about duplicate serial numbers if you have multiple devices using `DEFAULT-SERIAL`. 

Currently only built to support the `GET` http method. 

```
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

## Configuration Params

|        Parameter       |                                     Description                                     | Required |
| -----------------------| ----------------------------------------------------------------------------------- |:--------:|
| `name`                 | name of the switch or switches                                                      |     ✓    |
| `accessory`            | `Switcheroo` or `MultiSwitcheroo`                                                   |     ✓    |
| `statusUrl`            | url for status requests                                                             |     ✓    |
| `statusPattern`        | regexp sought in `statusUrl` response body                                          |     ✓    |
| `onUrl`                | endpoint paths for the on state                                                     |     ✓    |
| `offUrl`               | endpoint paths for the on state                                                     |     ✓    |
| `pollingInterval`      | interval to poll for status updates in milliseconds (default 3000ms or 3 seconds)   |     ✓    |
| `switches`             | array of switches for `MultiSwitcheroo` devices (see axample config)                |     ✓    |
| `manufacturer`         | will show in Home app description of this Homekit accessory, ex. 'Yamaha'           |          |
| `model`                | will show in Home app description of this Homekit accessory, ex. 'Default Model'    |          |
| `serialNumber`         | will show in Home app description of this Homekit accessory, ex. 'SERIALNUMBER1'    |          |


## Tips

  - Make sure specify the full URL in the `statusURL`. (i.e. `"statusUrl" : "http://192.168.0.XXX:2000"`).
  - Must prepend 'http://' to all URLs.
  - Verify your server only uses `GET`. This plugin only does `GET` requests.
  - Use this plugin in a child bridge. It's just better.
  - You can expose multiple switches on the same child bridge, just use the same `_bridge` `username` & `port` in the config.

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install homebridge-http using: `npm install -g homebridge-multiswitcheroo`
3. Update your config file
