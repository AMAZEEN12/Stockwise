"""Generates service/src/main/resources/db/seed/R__seed_demo.sql, the Monday seed subset (DM16, spec R19).

Run from the repository root:  python tools/seed/generate_monday_seed.py

Everything is computed here so the seed reconciles exactly (R10, R13):
  - each product's quantity  = OPENING + SALE + SALE_REVERSAL movements
  - each customer's balance  = sum of CREDIT_SALE, REPAYMENT and REVERSAL ledger deltas
  - each customer's store credit = sum of STORE_CREDIT ledger deltas
  - each sale's total = sum of its line totals
SeedVerificationIT checks all of this, plus every awkward case, against real Postgres.

Times are relative to when the seed runs: "today" is the Africa/Lagos day (DM14), and today's
sales are spread over the part of today that has already passed, so none is in the future.
The output is deterministic: the same script gives the same file.
"""
import random
import uuid
from pathlib import Path

OUT = Path("service/src/main/resources/db/seed/R__seed_demo.sql")
NS = uuid.UUID("6f1d3b8e-4c2a-4e8f-9a51-2b7c0d9e3f14")


def uid(name):
    return str(uuid.uuid5(NS, name))


# Demo logins (R20). Password for all three: Stockwise-Demo-2026 (published in the README).
# BCrypt strength 10, made with Spring Security's BCryptPasswordEncoder.
USERS = [
    ("owner", "owner@stockwise.test", "Ngozi Okeke (Owner)", "OWNER",
     "$2a$10$eGq4oXhEXJojasiW7X.IDODGpBaZ0DEC69DMvAwNfk1h1Fh6Iru5q"),
    ("assistant", "assistant@stockwise.test", "Tunde Bello (Assistant)", "ASSISTANT",
     "$2a$10$tiq/VcLAX0.DuXZsjHDzRulxqmAU/XDC7vOKZ.45uUXmUgASSszZ6"),
    ("admin", "admin@stockwise.test", "Kemi Ade (Admin)", "ADMIN",
     "$2a$10$cXRr9CBx.9SU6Ereq3so0u7GQxjr6wPHpS9VYByPYGc0BHBf5w4Mu"),
]

LONG_NAME = ("Golden Morn Maize and Soya Breakfast Cereal with Added Vitamins and Minerals, "
             "Family Value Pack 900g (Promotional Bundle with Free Measuring Cup, Festive Edition)")
assert 150 < len(LONG_NAME) <= 200, len(LONG_NAME)

# reference, name, category, price (kobo), FINAL quantity, low-stock threshold, active
PRODUCTS = [
    ("MILK-400", "Peak Milk Powder 400g", "Dairy", 420_000, 18, 5, True),
    ("MILK-170", "Peak Evaporated Milk 170g", "Dairy", 65_000, 5, 5, True),        # at threshold
    ("YOG-HOL", "Hollandia Yoghurt 1L", "Dairy", 180_000, 0, 4, True),             # sold out
    ("RICE-5KG", "Mama Gold Rice 5kg", "Grains", 850_000, 9, 3, True),
    ("RICE-50", "Mama Gold Rice 50kg Bag", "Grains", 7_800_000, 2, 2, True),        # at threshold
    ("GARRI-W", "White Garri 2kg", "Grains", 220_000, 14, 4, True),
    ("BEANS-1", "Honey Beans 1kg", "Grains", 170_000, 0, 3, True),                 # sold out
    ("SEMO-2", "Golden Penny Semovita 2kg", "Grains", 300_000, 11, 4, True),
    ("IND-70", "Indomie Chicken Noodles 70g", "Noodles", 25_000, 96, 24, True),
    ("IND-CTN", "Indomie Chicken Noodles Carton (40)", "Noodles", 950_000, 1, 2, True),  # low
    ("MILO-500", "Milo Refill 500g", "Beverages", 390_000, 7, 3, True),
    ("COKE-50", "Coca-Cola 50cl", "Beverages", 40_000, 48, 12, True),
    ("MALT-33", "Maltina 33cl", "Beverages", 50_000, 30, 12, True),
    ("SUGAR-1", "Dangote Sugar 1kg", "Grocery", 160_000, 20, 5, True),
    ("SALT-500", "Dangote Salt 500g", "Grocery", 30_000, 25, 6, True),
    ("OIL-1L", "King's Vegetable Oil 1L", "Grocery", 280_000, 6, 4, True),
    ("MAGGI-100", "Maggi Star Seasoning (100 cubes)", "Spices", 120_000, 10, 3, True),
    ("SOAP-DET", "Ariel Detergent 900g", "Household", 330_000, 8, 3, True),
    ("CEREAL-900", LONG_NAME, "Cereals", 450_000, 6, 2, True),                     # very long name
    ("MILK-OLD", "Peak Milk Powder 400g Tin (old packaging)", "Dairy", 380_000, 3, 2, False),  # archived
]
PRICE = {p[0]: p[3] for p in PRODUCTS}

CUSTOMERS = [
    ("ada", "Ada Okafor", "Shop 14, Ariaria Market"),             # owes money
    ("bola", "Bola Adeyemi", "Opposite the church gate"),         # holds store credit (DM5)
    ("chidi", "Chidi Eze", None),                                 # fully repaid
    ("ngozi", "Mama Ngozi Provisions", "Wholesale buyer, Line 3"),  # paid sales only
    ("emeka", "Emeka Nwosu", None),                               # new, nothing yet
]

# Events: (days ago, hour or fraction-of-today, kind, details). Day 0 uses a fraction (0-1)
# of the time elapsed since Lagos midnight; earlier days use the Lagos hour of day.
EVENTS = [
    # Store-credit case, exactly the spec R12 example: N10,000 credit sale, N6,000 repaid, reversed.
    (5, 10.5, "sale", dict(key="bola-credit", user="assistant", type="CREDIT", customer="bola",
                            lines=[("MILO-500", 2), ("GARRI-W", 1)], due="+14")),
    (3, 16.0, "repayment", dict(customer="bola", amount=600_000)),
    (2, 9.25, "reversal", dict(sale="bola-credit", user="owner")),
    # Owing customer.
    (6, 11.0, "sale", dict(key="ada-credit-1", user="owner", type="CREDIT", customer="ada",
                            lines=[("IND-CTN", 2)], due="+7")),
    (2, 15.5, "repayment", dict(customer="ada", amount=500_000)),
    (1, 12.0, "sale", dict(key="ada-credit-2", user="assistant", type="CREDIT", customer="ada",
                            lines=[("OIL-1L", 2), ("SUGAR-1", 2)], due="+10")),
    # Fully repaid customer.
    (5, 14.0, "sale", dict(key="chidi-credit", user="assistant", type="CREDIT", customer="chidi",
                            lines=[("SEMO-2", 2)], due=None)),
    (1, 17.0, "repayment", dict(customer="chidi", amount=600_000)),
    # Paid sales to a named customer.
    (3, 9.0, "sale", dict(key="ngozi-paid-1", user="assistant", type="PAID", customer="ngozi",
                           lines=[("IND-70", 24)], due=None)),
    (0, 0.30, "sale", dict(key="ngozi-paid-2", user="assistant", type="PAID", customer="ngozi",
                            lines=[("COKE-50", 12), ("MALT-33", 12)], due=None)),
    # The sell-outs.
    (4, 13.0, "sale", dict(key="yoghurt-out", user="assistant", type="PAID", customer=None,
                            lines=[("YOG-HOL", 3)], due=None)),
    (0, 0.55, "sale", dict(key="beans-out", user="owner", type="PAID", customer=None,
                            lines=[("BEANS-1", 2), ("SALT-500", 1)], due=None)),
    # The archived product sold before it was retired.
    (6, 15.0, "sale", dict(key="old-tin", user="owner", type="PAID", customer=None,
                            lines=[("MILK-OLD", 1)], due=None)),
]

# Walk-in paid sales: two to four a day, from active products that aren't meant to be at 0.
rng = random.Random(26)
WALK_IN = [p[0] for p in PRODUCTS if p[6] and p[0] not in ("YOG-HOL", "BEANS-1", "RICE-50", "IND-CTN")]
for days_ago in range(6, -1, -1):
    for n in range(rng.randint(2, 4)):
        when = round(rng.uniform(0.05, 0.95), 3) if days_ago == 0 else round(rng.uniform(8.0, 19.5), 2)
        picks = rng.sample(WALK_IN, rng.randint(1, 3))
        lines = [(ref, rng.randint(1, 3)) for ref in picks]
        EVENTS.append((days_ago, when, "sale", dict(key=f"walk-in-{days_ago}-{n}",
                                                    user=rng.choice(["assistant", "assistant", "owner"]),
                                                    type="PAID", customer=None, lines=lines, due=None)))
# One sale of the 50kg bag, a big-ticket line.
EVENTS.append((4, 10.0, "sale", dict(key="rice-bag", user="owner", type="PAID", customer=None,
                                      lines=[("RICE-50", 1)], due=None)))

EVENTS.sort(key=lambda e: (-e[0], e[1]))


def when_sql(days_ago, at):
    if days_ago == 0:
        return f"today_start + elapsed * {at}"
    hours = int(at)
    minutes = round((at - hours) * 60)
    return f"today_start - interval '{days_ago} days' + interval '{hours} hours {minutes} minutes'"


def q(text):
    return "NULL" if text is None else "'" + text.replace("'", "''") + "'"


# Work through the events in time order, tracking stock and balances.
sold = {p[0]: 0 for p in PRODUCTS}
returned = {p[0]: 0 for p in PRODUCTS}
touches = {p[0]: 0 for p in PRODUCTS}
balance = {c[0]: 0 for c in CUSTOMERS}
store_credit = {c[0]: 0 for c in CUSTOMERS}
sales = {}
sql_events = []

for days_ago, at, kind, d in EVENTS:
    ts = when_sql(days_ago, at)
    if kind == "sale":
        sale_id = uid("sale:" + d["key"])
        total = sum(PRICE[ref] * qty for ref, qty in d["lines"])
        sales[d["key"]] = dict(id=sale_id, lines=d["lines"], total=total, customer=d["customer"])
        due = "NULL" if d["due"] is None else (
            f"((today_start - interval '{days_ago} days') AT TIME ZONE 'Africa/Lagos')::date + {int(d['due'])}")
        cust = "NULL" if d["customer"] is None else f"'{uid('customer:' + d['customer'])}'"
        stmt = [f"-- {d['key']}: {d['type']} sale, total {total} kobo",
                "INSERT INTO sale (id, idempotency_key, request_hash, payment_type, customer_id, due_date, "
                "total_kobo, created_by, created_at)",
                f"VALUES ('{sale_id}', '{uid('key:' + d['key'])}', 'seed', '{d['type']}', {cust}, {due}, "
                f"{total}, '{uid('user:' + d['user'])}', {ts});"]
        for ref, qty in sorted(d["lines"], key=lambda line: uid("product:" + line[0])):
            pid = uid("product:" + ref)
            stmt.append("INSERT INTO sale_line (sale_id, product_id, quantity, unit_price_kobo, line_total_kobo) "
                        f"VALUES ('{sale_id}', '{pid}', {qty}, {PRICE[ref]}, {PRICE[ref] * qty});")
            stmt.append("INSERT INTO stock_movement (product_id, delta, source_type, source_id, created_at) "
                        f"VALUES ('{pid}', {-qty}, 'SALE', '{sale_id}', {ts});")
            sold[ref] += qty
            touches[ref] += 1
        if d["type"] == "CREDIT":
            c = d["customer"]
            balance[c] += total
            stmt.append("INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, "
                        "balance_after_kobo, created_at) "
                        f"VALUES ('{uid('customer:' + c)}', {total}, 'CREDIT_SALE', '{sale_id}', {balance[c]}, {ts});")
        sql_events.append("\n    ".join(stmt))
    elif kind == "repayment":
        c, amount = d["customer"], d["amount"]
        assert balance[c] >= amount, (c, balance[c], amount)  # R9
        balance[c] -= amount
        sql_events.append(
            f"-- repayment by {c}: {amount} kobo (the repayment record itself arrives with V4)\n    "
            "INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at) "
            f"VALUES ('{uid('customer:' + c)}', {-amount}, 'REPAYMENT', NULL, {balance[c]}, {ts});")
    elif kind == "reversal":
        s = sales[d["sale"]]
        c = s["customer"]
        stmt = [f"-- reversal of {d['sale']} (DM5): stock returns; the balance falls to 0 and the excess "
                "already repaid becomes store credit (the reversal record arrives with V4)"]
        for ref, qty in sorted(s["lines"], key=lambda line: uid("product:" + line[0])):
            stmt.append("INSERT INTO stock_movement (product_id, delta, source_type, source_id, created_at) "
                        f"VALUES ('{uid('product:' + ref)}', {qty}, 'SALE_REVERSAL', '{s['id']}', {ts});")
            returned[ref] += qty
            touches[ref] += 1
        cleared = min(balance[c], s["total"])
        excess = s["total"] - cleared
        balance[c] -= cleared
        if cleared:
            stmt.append("INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, "
                        "balance_after_kobo, created_at) "
                        f"VALUES ('{uid('customer:' + c)}', {-cleared}, 'REVERSAL', '{s['id']}', {balance[c]}, {ts});")
        if excess:
            store_credit[c] += excess
            stmt.append("INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, "
                        "balance_after_kobo, created_at) "
                        f"VALUES ('{uid('customer:' + c)}', {excess}, 'STORE_CREDIT', '{s['id']}', {balance[c]}, {ts});")
        sql_events.append("\n    ".join(stmt))

# Sanity checks on the story itself.
assert balance == {"ada": 2_280_000, "bola": 0, "chidi": 0, "ngozi": 0, "emeka": 0}, balance
assert store_credit["bola"] == 600_000
assert sales["bola-credit"]["total"] == 1_000_000

lines = []
w = lines.append
w("-- Monday seed subset (DM16, spec R19). GENERATED by tools/seed/generate_monday_seed.py: edit that, not this.")
w("-- Flyway repeatable migration, run only where db/seed is on spring.flyway.locations (the demo profile).")
w("-- It does nothing if the database already holds products, customers or demo users, so a")
w("-- re-run, or a run against a real shop's data, never duplicates or overwrites anything.")
w("-- Demo logins: owner@ / assistant@ / admin@stockwise.test, password Stockwise-Demo-2026 (README).")
w("-- Store credit (DM5): ledger rows with source_type STORE_CREDIT carry the store-credit change in")
w("-- delta_kobo and leave balance_after_kobo at the balance; balances reconcile over the other rows.")
w("DO $seed$")
w("DECLARE")
w("    today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos';")
w("    elapsed     interval    := now() - date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos';")
w("    opened_at   timestamptz := date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos' - interval '8 days';")
w("BEGIN")
w("    IF EXISTS (SELECT 1 FROM product) OR EXISTS (SELECT 1 FROM customer)")
w("       OR EXISTS (SELECT 1 FROM app_user WHERE lower(email) LIKE '%@stockwise.test') THEN")
w("        RAISE NOTICE 'Stockwise demo seed skipped: the database already has data';")
w("        RETURN;")
w("    END IF;")
w("")
w("    -- One login per role (R15, R20).")
for key, email, name, role, pw in USERS:
    w(f"    INSERT INTO app_user (id, email, password_hash, display_name, role, created_at) VALUES "
      f"('{uid('user:' + key)}', {q(email)}, {q(pw)}, {q(name)}, '{role}', opened_at);")
w("")
w("    -- 20 products: sold out, at threshold, low, archived and a very long name included.")
for ref, name, cat, price, final, threshold, active in PRODUCTS:
    opening = final + sold[ref] - returned[ref]
    assert opening >= final >= 0
    w(f"    INSERT INTO product (id, reference, name, category, price_kobo, quantity, low_stock_threshold, active, "
      f"version, created_at, updated_at) VALUES ('{uid('product:' + ref)}', {q(ref)}, {q(name)}, {q(cat)}, "
      f"{price}, {final}, {threshold}, {'true' if active else 'false'}, {touches[ref] + (0 if active else 1)}, "
      f"opened_at, opened_at);")
    if opening:
        w(f"    INSERT INTO stock_movement (product_id, delta, source_type, source_id, created_at) VALUES "
          f"('{uid('product:' + ref)}', {opening}, 'OPENING', NULL, opened_at);")
w("")
w("    -- 5 customers; balances and store credit are the totals of the ledger rows below.")
for key, name, contact in CUSTOMERS:
    w(f"    INSERT INTO customer (id, display_name, contact_placeholder, balance_kobo, store_credit_kobo, created_at) "
      f"VALUES ('{uid('customer:' + key)}', {q(name)}, {q(contact)}, {balance[key]}, {store_credit[key]}, opened_at);")
w("")
w(f"    -- {sum(1 for e in EVENTS if e[2] == 'sale')} sales over 7 days, with repayments and one reversal, in time order.")
for event in sql_events:
    w("    " + event)
w("END")
w("$seed$;")
OUT.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
print(f"wrote {OUT}: {sum(1 for e in EVENTS if e[2] == 'sale')} sales")
