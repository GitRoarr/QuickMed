# Complete Schedule & Appointment Workflow Implementation

## Overview
This document describes the full implementation of the schedule and appointment workflow system for doctors and patients in QuickMed.

## Architecture

### Backend Components

#### 1. Schedule Service (`backend/src/schedules/schedules.service.ts`)
The core service managing doctor schedules with the following key features:

**Key Methods:**
- `getDaySchedule(doctorId, date)` - Gets all slots for a specific day
- `setSlotStatus()` - Marks slots as available, blocked, or booked
- `getWeekSchedule(doctorId, startDate)` - Gets 7 days of schedule (patient-facing)
- `getAvailableDates(doctorId, startDate, days)` - Returns dates with available slots
- `getDoctorWorkingDays(doctorId)` - Returns working days configuration
- `updateDoctorWorkingDays(doctorId, days)` - Updates working days

**Slot Management:**
- Slots are automatically generated from doctor settings (working hours, appointment duration)
- Slots merge with explicit slot overrides and appointment bookings
- Past time slots are automatically blocked
- Priority: booked > blocked > available

#### 2. Schedule Controller (`backend/src/schedules/schedules.controller.ts`)
Endpoints:

**Doctor Endpoints (Auth Required):**
- `GET /doctors/schedule/:date` - Get day schedule
- `POST /doctors/schedule/available` - Mark slot as available
- `POST /doctors/schedule/block` - Block a slot
- `POST /doctors/schedule/unblock` - Unblock a slot
- `POST /doctors/schedule/remove` - Remove a slot
- `GET /doctors/schedule/overview` - Monthly overview
- `GET /doctors/schedule/working-days` - Get working days
- `POST /doctors/schedule/working-days` - Update working days

**Patient Endpoints (Public):**
- `GET /doctors/schedule/public/:doctorId/:date` - Get public day schedule
- `GET /doctors/schedule/public/:doctorId/week/:startDate` - Get week schedule
- `GET /doctors/schedule/public/:doctorId/available-dates` - Get available dates

#### 3. Appointment Service Integration (`backend/src/appointments/appointments.service.ts`)
The appointment service integrates with schedules:

**When Creating Appointment:**
1. Validates slot availability
2. Checks working days
3. Verifies working hours
4. Checks for conflicts (existing appointments)
5. Creates appointment
6. Marks slot as "booked" in schedule with appointment ID

**When Updating/Rescheduling:**
1. Frees old slot (marks as available)
2. Validates new slot
3. Updates appointment
4. Marks new slot as "booked"

**When Cancelling:**
1. Updates appointment status
2. Frees slot (marks as available)

### Frontend Components

#### 1. Doctor Schedule Component (`frontend/src/app/features/doctor/schedule/`)

**Features:**
- Calendar view with day/week/month modes
- Visual slot display with status indicators (available, booked, blocked)
- Working days management (toggle days on/off)
- Working hours configuration (start/end time)
- Slot duration settings (15/20/30/45/60 minutes)
- Block/unblock individual slots
- View appointments for selected date
- Next appointment highlight
- Real-time slot updates

**Key Functions:**
- `loadSettings()` - Loads doctor settings on init
- `loadWorkingDays()` - Loads configured working days
- `saveAvailability()` - Saves working days and hours
- `blockSlot()` - Blocks a time slot
- `removeSlot()` - Removes a slot override

#### 2. Patient Booking Component (`frontend/src/app/features/patient/doctors/`)

**Features:**
- Browse available doctors
- Visual slot selector with available times
- Date picker with available dates
- Real-time slot loading
- Appointment booking form
- Integration with payment flow

**Key Functions:**
- `loadAvailableSlots(date)` - Loads available slots for selected date
- `selectTimeSlot(slot)` - Selects a time slot
- `bookAppointment()` - Creates appointment

**Slot Selector:**
- Grid display of available time slots
- Visual feedback (hover/selected states)
- Shows time ranges (e.g., "9:00 AM - 9:30 AM")
- Disables unavailable slots
- Updates when date changes

## Workflow

### Doctor Setup Flow

1. **Initial Configuration:**
   - Doctor sets working days (e.g., Monday-Friday)
   - Sets working hours (e.g., 9:00 AM - 5:00 PM)
   - Sets appointment duration (e.g., 30 minutes)
   - Saves settings

2. **Automatic Slot Generation:**
   - System generates slots based on settings
   - Example: 9:00-9:30, 9:30-10:00, 10:00-10:30, etc.
   - Only generated for working days

3. **Manual Slot Management:**
   - Doctor can block specific slots (e.g., lunch break)
   - Doctor can add custom available slots
   - Doctor can remove slots
   - Changes override default generation

### Patient Booking Flow

1. **Browse Doctors:**
   - Patient views list of doctors
   - Filters by specialty
   - Sees availability indicators

2. **Select Doctor:**
   - Opens booking modal
   - Selects appointment date
   - System loads available slots for that date

3. **Choose Slot:**
   - Visual slot selector shows available times
   - Patient clicks desired slot
   - Slot is selected

4. **Complete Booking:**
   - Patient adds optional notes
   - Submits booking
   - System validates slot availability
   - Creates appointment (status: PENDING)
   - Marks slot as BOOKED in schedule
   - Redirects to payment

### Appointment Status Flow

1. **PENDING** - Initial state after patient books
2. **CONFIRMED** - Doctor accepts appointment
3. **COMPLETED** - Appointment finished
4. **CANCELLED** - Appointment cancelled (slot freed)

## Data Models

### DoctorSchedule Entity
```typescript
{
  id: string;
  doctorId: string;
  date: Date;
  slots: Slot[];
}
```

### Slot Type
```typescript
{
  startTime: string;        // "09:00"
  endTime: string;          // "09:30"
  status: 'available' | 'booked' | 'blocked';
  appointmentId: string | null;
  blockedReason: string | null;
}
```

## Integration Points

### Settings Integration
- Doctor settings (working days, hours, duration) drive slot generation
- Changes to settings update future slot availability
- Settings stored in `doctor_settings` table

### Appointment Integration
- Appointments link to schedule slots via `appointmentId`
- Slot status updates automatically when appointments are created/updated/cancelled
- Schedule reflects real-time appointment status

### Notification Integration
- Notifications sent when appointments are created/rescheduled/cancelled
- Both doctor and patient receive notifications

## Security & Validation

### Backend Validations
- Prevents booking past time slots
- Validates slot availability before booking
- Checks working days before allowing booking
- Verifies working hours window
- Prevents double-booking (conflict detection)

### Frontend Validations
- Date picker min date = today
- Slot selector only shows available slots
- Form validation before submission
- Real-time slot updates

## Performance Considerations

- Slots are generated on-demand, not pre-computed
- Schedule lookups are cached at service level
- Past slots are filtered client-side for better UX
- Pagination for monthly/weekly views

## Future Enhancements

1. **Recurring Appointments** - Allow patients to book recurring slots
2. **Waitlist** - Add patients to waitlist for full days
3. **Slot Templates** - Save common slot configurations
4. **Bulk Operations** - Block multiple dates at once
5. **Export Calendar** - Export schedule to iCal/Google Calendar
6. **Availability Preferences** - Different hours for different days
7. **Buffer Time** - Add buffer time between appointments

## Testing Scenarios

### Doctor Schedule Management
- ✅ Set working days and hours
- ✅ View generated slots
- ✅ Block/unblock slots
- ✅ View appointments in schedule
- ✅ Accept/reject appointments

### Patient Booking
- ✅ Browse doctors
- ✅ View available slots
- ✅ Book appointment
- ✅ See booking confirmation
- ✅ Reschedule appointment
- ✅ Cancel appointment

### Integration
- ✅ Slot automatically marked as booked when appointment created
- ✅ Slot freed when appointment cancelled
- ✅ Schedule reflects appointment status changes
- ✅ Past slots automatically blocked
- ✅ Working days enforced
- ✅ Working hours enforced

## API Examples

### Get Doctor Schedule
```http
GET /doctors/schedule/public/{doctorId}/{date}
Response: {
  "date": "2024-01-15",
  "slots": [
    {
      "startTime": "09:00",
      "endTime": "09:30",
      "status": "available"
    },
    {
      "startTime": "09:30",
      "endTime": "10:00",
      "status": "booked",
      "appointmentId": "uuid"
    }
  ]
}
```

### Book Appointment
```http
POST /appointments
Body: {
  "doctorId": "uuid",
  "appointmentDate": "2024-01-15",
  "appointmentTime": "09:00",
  "notes": "Follow-up visit"
}
```

### Update Working Days
```http
POST /doctors/schedule/working-days
Body: {
  "days": [1, 2, 3, 4, 5]  // Monday-Friday
}
```

## Conclusion

This implementation provides a complete, integrated schedule and appointment system that:
- Allows doctors to manage their availability efficiently
- Enables patients to book appointments easily
- Maintains data consistency between schedules and appointments
- Provides real-time updates and validation
- Scales well for future enhancements
