import calendar from '../config/googleConfig.js'
exports.createCalendarEvent = async (booking) => {
  const event = {
    summary: `Appointment: ${booking.name}`,
    description: `Service: ${booking.service}\nComments: ${
      booking.comments || 'N/A'
    }`,
    start: {
      dateTime: new Date(booking.date).toISOString(),
      timeZone: 'Europe/Prague',
    },
    end: {
      dateTime: new Date(
        new Date(booking.date).getTime() + 60 * 60 * 1000
      ).toISOString(),
      timeZone: 'Europe/Prague',
    },
    attendees: [{ email: booking.email }],
  }

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    })
    return response.data
  } catch (error) {
    throw new Error('Failed to create calendar event: ' + error.message)
  }
}
