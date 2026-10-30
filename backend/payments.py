"""Pricing, the platform fee, and payment providers.

The marketplace rule
--------------------
A tutor sets their own price. Meridian adds 10% on top automatically, so a
tutor who charges 20 is shown to students at 22. When the student pays 22:

    tutor    receives 20   (their full price — the "90%" share)
    Meridian receives  2   (the 10% fee)

Change PLATFORM_FEE_RATE in .env (MERIDIAN_PLATFORM_FEE) to adjust it.

Providers
---------
`test`  — the default. Nothing is charged, no card data leaves the browser
          except the brand and last four digits. Use the published test cards:
              4242 4242 4242 4242   succeeds
              4000 0000 0000 0002   is declined
`tbc` (TBC Checkout), `bog` (BOG Payments), `tap` (Tap Payments, Qatar) —
          production providers, Visa and Mastercard only. Stripe cannot onboard
          a Georgian or Qatari company; see the README payments section.
          Each is a hosted checkout: the card is typed on the bank's page, never
          on ours, which keeps Meridian outside PCI-DSS scope. Wiring one in is a
          single function below once you have merchant credentials.
"""
import os
import secrets
from datetime import datetime, timedelta

PLATFORM_FEE_RATE = float(os.environ.get("MERIDIAN_PLATFORM_FEE", "0.10"))
PROVIDER = os.environ.get("MERIDIAN_PAYMENT_PROVIDER", "test")
CURRENCY = "USD"

# Memberships. Prices in minor units (US cents). Yearly = 10 months.
PLANS = {
    "free": {"monthly": 0, "yearly": 0},
    "compass": {"monthly": 799, "yearly": 7990},
    "navigator": {"monthly": 1499, "yearly": 14990},
}

METHODS = ("card",)          # Visa and Mastercard

TEST_DECLINE = {"0002", "9995"}


def to_minor(amount):
    return int(round(float(amount) * 100))


def fee_for(base_minor):
    return int(round(base_minor * PLATFORM_FEE_RATE))


def student_price(base_minor):
    return base_minor + fee_for(base_minor)


def quote(base_minor):
    fee = fee_for(base_minor)
    return {"base_minor": base_minor, "fee_minor": fee, "total_minor": base_minor + fee,
            "fee_rate": PLATFORM_FEE_RATE, "currency": CURRENCY}


def splits_for(order):
    """How a paid order's money is divided in the ledger."""
    if order["kind"] == "lesson":
        tutor_id = order["meta"].get("tutor_id")
        return [
            ("tutor", tutor_id, order["base_minor"], "lesson payout"),
            ("platform", "meridian", order["fee_minor"], "platform fee %d%%" % round(PLATFORM_FEE_RATE * 100)),
        ]
    return [("platform", "meridian", order["total_minor"], "membership")]


def renewal_date(cycle):
    days = 365 if cycle == "yearly" else 30
    return (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d")


class PaymentError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def charge(order, method, details):
    """Take payment for an order. Returns (provider, reference, method_detail).

    `details` never contains a full card number: the browser sends only the
    brand and the last four digits, which is all a receipt needs.
    """
    if method not in METHODS:
        raise PaymentError("unknown_method")

    if PROVIDER == "test":
        detail = method
        if method == "card":
            last4 = "".join(c for c in str(details.get("last4", "")) if c.isdigit())[-4:]
            brand = (details.get("brand") or "card")[:20]
            if len(last4) != 4:
                raise PaymentError("card_invalid")
            if brand not in ("Visa", "Mastercard"):
                raise PaymentError("card_brand")
            if last4 in TEST_DECLINE:
                raise PaymentError("card_declined")
            detail = "%s •••• %s" % (brand, last4)
        return "test", "test_" + secrets.token_hex(10), detail

    # Production providers redirect to a hosted page and confirm by webhook.
    # Implement here once merchant credentials exist; until then refuse loudly.
    raise PaymentError("provider_not_configured")
