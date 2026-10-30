# Sale reversal: development simulation

The receipt's existing reversal and supervisor-code dialogs now execute only against a local development simulation session. Other sessions see the dialogs but cannot submit these unapproved operations; the API adapter also blocks the requests. This is an interface demonstration, not a production reversal, supervisor authorization, or proof of database rules.

The seeded credit sale `S-000002` has a simulated ₦3,950 original debt, of which ₦550 has been repaid; the customer also has an unrelated ₦1,100 opening debt. Reversing it restores the product quantity, removes ₦3,400 of debt and adds ₦550 store credit, leaving the unrelated debt intact. A sale created during the simulation records its own outstanding debt and store credit used, so its reversal restores the simulated settlement. Data and authorizations reset when the simulation restarts.

The demonstration stores explicit fixture settlement amounts. It does **not** implement a repayment endpoint or the oldest-outstanding-sale allocation proposed in [PR #35](https://github.com/AMAZEEN12/Stockwise/pull/35). That proposal, historical allocations, reversal of repayments, settlement splits, and the real API contract still require the API and data owners' agreement. No result here claims R11/R12 are complete for real accounts.

An uncertain simulated request retains its key and body in session storage and lets the same user retry it. The local simulation returns the original result for that replay and rejects a separate reversal of an already reversed sale. This only demonstrates the intended interaction; real transactional, authorization and concurrency guarantees require a separately reviewed service implementation and database tests.

Run `npm run mock` and `npm run dev` from `web/` to use the demonstration. `npm run check:reversal-simulation` starts its own simulation on port 4717 and verifies the fixture outcome and retry. Browser interaction tests are in `web/e2e/sale-reversal-simulation.spec.ts`.
