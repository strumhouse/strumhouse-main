# Category-Based Booking System

This system allows you to configure booking rules and availability based on service categories rather than individual service IDs. This makes it much easier to add new services without having to update multiple places in the code.

## How It Works

Instead of mapping specific service IDs to configurations, the system now uses category IDs. All services within the same category automatically inherit the same booking rules and availability settings.

## Current Categories

### 1. Jampad (`jampad` or `c5d1dc72-55aa-496d-aaff-99943861b2df`)
- **Advance Booking**: 2 hours
- **Hours**: 9 AM - 10 PM
- **Max Participants**: 10
- **Available Days**: 7 days a week
- **Slot Duration**: 1 hour

### 2. Recording Studio (`recording-studio` or `5bb7cae3-40c1-4e91-9c81-090f11266313`)
- **Advance Booking**: 24 hours
- **Hours**: 9 AM - 10 PM
- **Max Participants**: 6
- **Available Days**: 7 days a week
- **Slot Duration**: 1 hour

## Adding a New Category

To add a new service category:

1. **Add the configuration** in `src/utils/timeSlots.ts`:

```typescript
const categoryConfigs: { [key: string]: TimeSlotConfig } = {
  // ... existing categories ...
  'new-category': {
    serviceId: serviceId,
    categoryId: 'new-category',
    startHour: 10,
    endHour: 20,
    slotDuration: 2,
    advanceBookingHours: 48,
    maxParticipants: 4,
    availableDays: [1, 2, 3, 4, 5] // Mon-Fri only
  }
};
```

2. **Pass the categoryId** when calling the functions:

```typescript
// In your component
const timeSlots = generateTimeSlots(
  serviceId,
  startDate,
  endDate,
  bookings,
  blocked,
  'new-category' // Pass the category ID here
);

const config = findServiceConfig(serviceId, 'new-category');
```

3. **Update your booking flow** to pass the categoryId:

```typescript
// In BookingSteps.tsx or wherever you use DateTimeSelector
<DateTimeSelector
  serviceId={bookingData.serviceId}
  categoryId={bookingData.categoryId} // Make sure this is passed
  // ... other props
/>
```

## Benefits

1. **Scalability**: Add new services without touching the booking logic
2. **Consistency**: All services in a category have the same rules
3. **Maintainability**: Change rules for an entire category in one place
4. **Flexibility**: Easy to create new categories with different rules

## Migration from Service ID Mapping

The old system mapped specific service IDs. The new system:
- Still supports the old service ID mapping as a fallback
- Prioritizes category-based configuration
- Automatically falls back to service ID mapping if no category is provided

## Example: Adding a "Photography Studio" Category

```typescript
// 1. Add configuration
'photography-studio': {
  serviceId: serviceId,
  categoryId: 'photography-studio',
  startHour: 8,
  endHour: 18,
  slotDuration: 2,
  advanceBookingHours: 12,
  maxParticipants: 8,
  availableDays: [1, 2, 3, 4, 5, 6] // Mon-Sat
}

// 2. Use in components
generateTimeSlots(serviceId, startDate, endDate, bookings, blocked, 'photography-studio')
```

Now any service you add to the "photography-studio" category will automatically use these rules! 