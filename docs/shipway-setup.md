# Shipway backend setup

Shipway is installed beside Shiprocket. Booking stays inactive until all required
Supabase Edge Function secrets are present and the database migration is applied.

## Required secrets

```text
SHIPWAY_EMAIL
SHIPWAY_LICENSE_KEY
```

Find the license key under Shipway > Profile > Manage profile. `SHIPWAY_EMAIL` must
be the email registered against that license key. The backend discovers the default
warehouse through Shipway after authentication.

## Optional warehouse overrides

```text
SHIPWAY_WAREHOUSE_ID
SHIPWAY_RETURN_WAREHOUSE_ID
```

Use these only when pickup or return should differ from the account default. Admin
Settings displays the warehouse selected by the backend.

## Optional parcel defaults

```text
SHIPWAY_PICKUP_PINCODE=683579
SHIPWAY_PACKAGING_WEIGHT_KG=0.1
SHIPWAY_MIN_BOX_LENGTH_CM=13
SHIPWAY_MIN_BOX_BREADTH_CM=7
SHIPWAY_MIN_BOX_HEIGHT_CM=3
```

Product weight remains 0.2 kg each. Booking adds packaging weight, stacks product
heights, calculates volumetric weight as L x B x H / 5000, and stores the higher
chargeable weight on the order.

## Functions

- `shipway-admin`: authenticated setup status, warehouse lookup, shipment booking,
  and cancellation. Requires an active admin with Orders permission.
- `shipway-rates`: validates a destination and returns prepaid and COD carrier rates.
- `shipway-track`: returns current status and scan history for Shipway orders.

## Activation sequence

1. Apply `20260911000000_shipway_backend.sql`.
2. Set `SHIPWAY_EMAIL` and `SHIPWAY_LICENSE_KEY`.
3. Deploy the three functions.
4. Check Admin > Settings > Shipway Backend.
5. Confirm the detected warehouse and run one internal test order.
6. In Admin > Orders, choose Shiprocket or Shipway for each unbooked order.

Shiprocket remains installed. Existing automatic Shiprocket booking continues, and
manual provider buttons prevent a second provider from booking an order that already
has an AWB.
