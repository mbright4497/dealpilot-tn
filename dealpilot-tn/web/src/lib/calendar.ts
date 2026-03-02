export function generateICS(title: string, description: string, date: Date) {
  const dt = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${title}
DESCRIPTION:${description}
DTSTART:${dt}
DTEND:${dt}
END:VEVENT
END:VCALENDAR`.trim();
}
