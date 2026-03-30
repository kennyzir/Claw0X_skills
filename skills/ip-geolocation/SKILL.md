---
name: "IP Geolocation"
slug: "ip-geolocation"
description: >
  Get country, city, ISP, timezone, and proxy/VPN flag from any IP address.
  Use when agents need fraud detection, geo-targeting, analytics enrichment,
  or access control. Handles IPv4 and IPv6, detects private/reserved ranges.
category: "Data Enrichment"
tags: ["ip", "geolocation", "geo", "fraud-detection", "analytics", "security"]
price_per_call: 0.002
input_schema:
  type: object
  properties:
    ip:
      type: string
      description: "IPv4 or IPv6 address to look up"
  required: ["ip"]
output_schema:
  type: object
  properties:
    ip:
      type: string
    country:
      type: string
    country_code:
      type: string
    city:
      type: string
    timezone:
      type: string
    isp:
      type: string
    is_proxy:
      type: boolean
    is_mobile:
      type: boolean
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# IP Geolocation

Look up geographic and network information for any IP address. Returns country, city, region, ISP, timezone, coordinates, and proxy/VPN/mobile flags.

## How It Works

1. Validate IP format (IPv4 and IPv6 supported)
2. Detect private/reserved ranges (127.x, 10.x, 192.168.x) — returns immediately
3. Query geolocation service with 5s timeout
4. Return structured result with all available fields

## Use Cases

- Fraud detection (flag proxy/VPN users)
- Geo-targeting (serve localized content)
- Analytics enrichment (add location to events)
- Access control (region-based restrictions)
- Security monitoring (detect suspicious origins)

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**: `export CLAW0X_API_KEY="ck_live_..."`

## Pricing

**$0.002 per successful call.** Failed calls are free.

## Example

**Input**:
```json
{
  "ip": "8.8.8.8"
}
```

**Output**:
```json
{
  "ip": "8.8.8.8",
  "country": "United States",
  "country_code": "US",
  "region": "Virginia",
  "city": "Ashburn",
  "zip": "20149",
  "latitude": 39.03,
  "longitude": -77.5,
  "timezone": "America/New_York",
  "isp": "Google LLC",
  "org": "Google Public DNS",
  "is_proxy": false,
  "is_mobile": false
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Invalid IP format or lookup failed |
| 401 | Missing or invalid API key |
| 500 | Geolocation service error (not billed) |

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**GitHub**: [github.com/kennyzir/ip-geolocation](https://github.com/kennyzir/ip-geolocation)
