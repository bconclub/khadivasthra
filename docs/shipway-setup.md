# Shipway backend setup

Shipway is installed beside Shiprocket. Booking stays inactive until all required
Supabase Edge Function secrets are present and the database migration is applied.

## Required secrets

```text
SHIPWAY_EMAIL
SHIPWAY_LICENSE_KEY
SHIPWAY_WAREHOUSE_ID
SHIPWAY_RETURN_WAREHOUSE_ID
```

Find the license key under Shipway > Profile > Manage profile. Find warehouse IDs
under Shipway > Warehouse, or use the authenticated `warehouses` action exposed by
the `shipway-admin` function.

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
2. Set the four required Supabase secrets.
3. Deploy the three functions.
4. Check Admin > Settings > Shipway Backend.
5. Confirm the warehouse IDs and run one internal test order.
6. Only then connect Shipway booking buttons or checkout rate selection.
