# Security Specification for Firestore Rules

## 1. Data Invariants
- **Public Readability**: The `/portfolio/{docId}` document (specifically `docId == 'content'`) is publicly readable by all visitors worldwide so that prospective employers and visitors can review the portfolio without requiring authentication.
- **Strict Owner-Only Writes**: Only the verified owner (`saahiressa@gmail.com`) with `request.auth.token.email_verified == true` can create, update, or delete `/portfolio/{docId}`.
- **Admin Registry**: The `/admins/{adminId}` collection is private and readable only by authenticated users, and writable only by existing admins.
- **Schema & Size Boundary**: The `profile` object, `experienceNodes`, `projects`, `skills`, and `sections` must be structured correctly, with reasonable limits to prevent denial-of-wallet exhaustion.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: An unauthenticated request attempts to overwrite `/portfolio/content`. (Expected: Denied)
2. **Anonymous Write**: An unverified or anonymous auth token attempts to update `/portfolio/content`. (Expected: Denied)
3. **Impersonated Email Write**: User authenticated with `attacker@gmail.com` attempts to update `/portfolio/content`. (Expected: Denied)
4. **Unverified Email Write**: User authenticated with `saahiressa@gmail.com` but `email_verified == false` attempts to write. (Expected: Denied)
5. **Junk Doc ID Poisoning**: Attacker attempts to create a document with 10KB junk characters as doc ID. (Expected: Denied)
6. **Missing Required Fields**: Write payload omitting `ownerEmail` or `profile`. (Expected: Denied)
7. **Admin Self-Escalation**: Attacker tries to write their own UID into `/admins/{uid}`. (Expected: Denied)
8. **Owner Email Tampering**: Attacker attempts to change `ownerEmail` to someone else's email. (Expected: Denied)
9. **Corrupted Type in Profile**: Attacker attempts to set `profile` to an arbitrary integer or string. (Expected: Denied)
10. **Malicious Script Injection in Projects**: Payload exceeding volumetric boundaries or invalid structure. (Expected: Denied)
11. **Admin Delete by Non-Admin**: Non-admin user tries to delete an admin record. (Expected: Denied)
12. **Catch-All Wildcard Exploit**: Accessing an undocumented collection `/secrets/{docId}`. (Expected: Denied)

## 3. Test Runner Design
The rules will enforce:
- Default deny on `{document=**}`
- Public `get` on `/portfolio/{docId}`
- Verified owner email check for writes on `/portfolio/{docId}`
- Helper functions `isValidId()`, `isSignedIn()`, `isOwner()`, `isAdmin()`.
