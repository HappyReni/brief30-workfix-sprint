# Brief30 Direct Order Page

Use `order/index.html` when you want to sell without a third-party checkout page.

## Configure seller info

```bash
npm run prepare:seller -- --email="your-real-email@domain.kr" --payment="은행명 실제계좌 예금주명"
npm run package:release
```

## How it sells

1. Buyer opens `marketing/index.html`.
2. CTA sends them to `order/index.html?offer=setup`.
3. Buyer fills name, contact, use case, and memo.
4. Buyer copies the order message or sends it by email.
5. Seller confirms payment and records the order number in `operator/index.html`.

## When to use external checkout instead

Use Gumroad, Toss, Lemon Squeezy, Smart Store, or another payment page when you need automated card payment, tax invoice handling, or file delivery.
