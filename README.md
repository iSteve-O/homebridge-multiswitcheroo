# Homebridge-MultiSwitcheroo
User defined switches for http requests. Simple on/off or multiswitch radio buttons. Useful for lights, A/V systems, home automation, and includes live status!


## Switch Types

### Switch (standard on/off)
Meant to be used as a simple on/off switch. 
 ==> light, projector, fan, etc.

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

Define your `MultiSwitcheroo` with whatever `name` you want to appear as the main switch title in the home app. This is what is visible if left being displayed as a single tile (default). Then, the appropriate endpoint `statusUrl` to call. Complete http endpoints are constructed as `host` + `path`.
Currently only built to support one http method `GET`. The status pattern is a regexp in sought in the response from the server.

```
  {
        "accessory": "MultiSwitcheroo",   // remember this *must* be 'MultiSwitcheroo' for multi
        "name": "Volume Switch",
        "manufacturer": "Manufacturer",
        "model": "Model",
        "serialNumber": "VOLUMESW01",
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
| `name`                 | name of the accessory                                                               |     ✓    |
| `accessory`            | `Switcheroo` or `MultiSwitcheroo`                                                   |     ✓    |
| `statusUrl`            | url for status requests                                                             |     ✓    |
| `onUrl`                | endpoint paths for the on state                                                     |     ✓    |
| `offUrl`               | endpoint paths for the on state                                                     |     ✓    |
| `pollingInterval`      | interval to poll for status updates in milliseconds                                 |     ✓    |
| `switches`             | array of switches for `MultiSwitcheroo` devices                                     |     ✓    |
| `manufacturer`         | will show in Home app description of this Homekit accessory, ex. 'Yamaha'           |          |
| `model`                | will show in Home app description of this Homekit accessory, ex. 'TSR-700'          |          |
| `serialNumber`         | will show in Home app description of this Homekit accessory, ex. 'SWITCH01'         |          |


## Tips

  - Make sure specify a port in the if necessary. (i.e. `"statusUrl" : "http://192.168.0.XXX:2000"`).
  - Must prepend 'http://' to all URLs.
  - Verify your server only uses `GET`.

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install homebridge-http using: `npm install -g homebridge-http-multiswitcheroo`
3. Update your config file
