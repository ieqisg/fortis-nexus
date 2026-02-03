import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { daysOfWeek, timeSlotOptions } from "@/lib/mockData";

interface AvailabilitySelectorProps {
  selectedDays: string[];
  selectedTimeSlots: string[];
  weeklyHours: number;
  onDaysChange: (days: string[]) => void;
  onTimeSlotsChange: (slots: string[]) => void;
  onWeeklyHoursChange: (hours: number) => void;
}

export function AvailabilitySelector({
  selectedDays,
  selectedTimeSlots,
  weeklyHours,
  onDaysChange,
  onTimeSlotsChange,
  onWeeklyHoursChange,
}: AvailabilitySelectorProps) {
  // Toggles day selection
  const handleDayToggle = (day: string) => {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    onDaysChange(nextDays);
  };

  // Toggles time slot selection
  const handleTimeSlotToggle = (slot: string) => {
    const nextSlots = selectedTimeSlots.includes(slot)
      ? selectedTimeSlots.filter((s) => s !== slot)
      : [...selectedTimeSlots, slot];
    onTimeSlotsChange(nextSlots);
  };

  return (
    <div className="space-y-6">
      {/* Days of the Week */}
      <div className="space-y-3">
        <Label className="text-base font-semibold text-slate-700">
          Available Days
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
                selectedDays.includes(day)
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <Checkbox
                id={`day-${day}`}
                checked={selectedDays.includes(day)}
                onCheckedChange={() => handleDayToggle(day)}
              />
              <Label
                htmlFor={`day-${day}`}
                className="text-sm font-medium cursor-pointer flex-1 py-1"
              >
                {day.slice(0, 3)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div className="space-y-3">
        <Label className="text-base font-semibold text-slate-700">
          Preferred Time Slots
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {timeSlotOptions.map((slot) => (
            <div
              key={slot}
              className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
                selectedTimeSlots.includes(slot)
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <Checkbox
                id={`slot-${slot}`}
                checked={selectedTimeSlots.includes(slot)}
                onCheckedChange={() => handleTimeSlotToggle(slot)}
              />
              <Label
                htmlFor={`slot-${slot}`}
                className="text-sm font-medium cursor-pointer flex-1 py-1"
              >
                {slot}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Hours */}
      <div className="space-y-3">
        <Label
          htmlFor="weeklyHours"
          className="text-base font-semibold text-slate-700"
        >
          Weekly Commitment (Hours)
        </Label>
        <div className="flex items-center gap-4">
          <Input
            id="weeklyHours"
            type="number"
            min={1}
            max={40}
            value={weeklyHours}
            onChange={(e) => onWeeklyHoursChange(parseInt(e.target.value) || 0)}
            className="w-32"
          />
          <span className="text-sm text-slate-500">hours per week</span>
        </div>
      </div>
    </div>
  );
}
