# Test Instructions for StrumHouse Booking System Fixes

## Prerequisites

1. Set environment variables:
   ```
   ENABLE_BACKEND_CONFIRMATION=false  # Start with false, enable after testing
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Configure Razorpay webhook URL in Razorpay Dashboard:
   - URL: `https://your-domain.com/api/razorpay-webhook`
   - Events: `payment.captured`, `payment.failed`

## Manual Test Steps

### Test 1: Razorpay Webhook Handler

**Objective:** Verify webhook processes payment.captured events correctly

**Steps:**
1. Create a booking and complete payment
2. Use Razorpay webhook testing tool or ngrok to send test webhook:
   ```json
   {
     "event": "payment.captured",
     "payload": {
       "payment": {
         "entity": {
           "id": "pay_test123",
           "order_id": "order_test123",
           "status": "captured",
           "receipt": "b_bookingId_1234567890"
         }
       }
     }
   }
   ```
3. Verify:
   - Booking status updates to 'confirmed'
   - Payment record created/updated with status 'completed'
   - Check server logs for webhook processing

**Expected Result:** Booking confirmed automatically via webhook

---

### Test 2: Slot Conflict Detection

**Objective:** Verify server-side slot conflict detection prevents double-booking

**Steps:**
1. Open booking page in two browser windows (User A and User B)
2. User A: Select a time slot (e.g., 10:00-11:00) and proceed to payment
3. User B: Immediately try to book the same slot
4. User B should receive 409 Conflict error with message about slot conflict

**Expected Result:** Second booking attempt fails with conflict error

---

### Test 3: Realtime Slot Updates

**Objective:** Verify blocked slots update in real-time across sessions

**Steps:**
1. Open booking page in Browser A
2. In Browser B (admin panel): Block a time slot (e.g., 14:00-15:00)
3. In Browser A: Refresh slot list (should happen automatically)
4. Verify the blocked slot appears as unavailable

**Expected Result:** Blocked slots reflect immediately without page refresh

---

### Test 4: Payment Polling

**Objective:** Verify client polls for booking confirmation after payment

**Steps:**
1. Complete a payment
2. Immediately close browser tab (simulate network failure)
3. Wait 5-10 seconds
4. Reopen dashboard and check booking status
5. Verify booking is confirmed (webhook processed it)

**Expected Result:** Booking confirmed even if client disconnected

---

### Test 5: Overlap Logic - Partial Overlaps

**Objective:** Verify partial slot overlaps are detected correctly

**Steps:**
1. Admin: Block slot 10:00-12:00
2. User: Try to book 11:00-12:00
3. Verify booking is rejected (partial overlap)

**Test Cases:**
- Blocked: 10:00-12:00, Booking: 11:00-12:00 → Should be blocked
- Blocked: 10:00-11:00, Booking: 10:30-11:30 → Should be blocked
- Blocked: 10:00-11:00, Booking: 11:00-12:00 → Should be allowed (no overlap)

**Expected Result:** All partial overlaps correctly detected

---

### Test 6: Dashboard Performance

**Objective:** Verify parallel data fetching improves load time

**Steps:**
1. Open browser DevTools → Network tab
2. Navigate to Dashboard
3. Check network requests timing
4. Verify all requests start simultaneously (not sequential)

**Expected Result:** All API calls start in parallel, total load time reduced

---

### Test 7: Admin Dashboard Summary API

**Objective:** Verify server-side summary reduces client load

**Steps:**
1. Navigate to Admin Dashboard
2. Check Network tab for `/api/admin/summary` request
3. Verify stats load quickly
4. Verify detailed data loads separately

**Expected Result:** Stats load from summary API, faster initial render

---

### Test 8: Reconciliation Script

**Objective:** Verify script reconciles orphaned payments

**Steps:**
1. Create a booking with payment_status='pending' but with valid order_id
2. Manually update Razorpay payment status to 'captured' (or use test payment)
3. Run reconciliation script:
   ```bash
   node scripts/reconcilePayments.js
   ```
4. Verify booking status updates to 'confirmed'

**Expected Result:** Orphaned bookings get reconciled

---

### Test 9: Booking Creation Atomicity

**Objective:** Verify booking and slots created atomically

**Steps:**
1. Create booking with multiple slots
2. Simulate error during slot insertion (temporarily break DB)
3. Verify booking is rolled back (not created)

**Expected Result:** Either all slots created or booking not created

---

### Test 10: Feature Flag Behavior

**Objective:** Verify ENABLE_BACKEND_CONFIRMATION flag works

**Steps:**
1. Set `ENABLE_BACKEND_CONFIRMATION=false`
2. Complete payment → webhook processes but skips slot conflict check
3. Set `ENABLE_BACKEND_CONFIRMATION=true`
4. Complete payment → webhook checks slot conflicts

**Expected Result:** Flag controls conflict checking behavior

---

## Integration Test Checklist

- [ ] Webhook receives and processes payment.captured events
- [ ] Booking status updates to 'confirmed' via webhook
- [ ] Slot conflicts detected before booking creation
- [ ] Realtime subscriptions update UI when slots change
- [ ] Payment polling stops when booking confirmed
- [ ] Partial slot overlaps correctly detected
- [ ] Dashboard loads faster with parallel fetches
- [ ] Admin dashboard uses summary API
- [ ] Reconciliation script fixes orphaned bookings
- [ ] Booking creation is atomic (all or nothing)

---

## Known Limitations

1. Reconciliation script requires Razorpay SDK - ensure it's installed:
   ```bash
   npm install razorpay
   ```

2. Webhook signature verification requires raw body - ensure Vercel/your platform supports it

3. Realtime subscriptions require Supabase Realtime to be enabled in project settings

---

## Rollback Plan

If issues occur:

1. Set `ENABLE_BACKEND_CONFIRMATION=false` to disable conflict checking
2. Revert to client-side booking creation (comment out server API call)
3. Revert PaymentGateway to direct updates (remove polling)
4. Monitor webhook logs for errors

---

## Performance Benchmarks

**Before:**
- Dashboard load: 2-3 seconds
- Admin dashboard load: 3-4 seconds
- Slot generation: 1-2 seconds

**After (Expected):**
- Dashboard load: 1-1.5 seconds
- Admin dashboard load: 1.5-2 seconds
- Slot generation: 0.5-1 second (with caching)

---

## Monitoring

Check these logs for issues:

1. **Webhook logs:** `[Webhook]` prefix
2. **Reconciliation logs:** `[Reconcile]` prefix
3. **Booking conflicts:** `[ALERT]` prefix
4. **Realtime updates:** Console logs in browser

---

**End of Test Instructions**

